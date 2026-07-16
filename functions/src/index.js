"use strict";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const { logger } = require("firebase-functions");
const NotificationRepository = require("./notification/NotificationRepository");
const NotificationService = require("./notification/NotificationService");
const NotificationDispatcher = require("./notification/NotificationDispatcher");
const NotificationDelivery = require("./notification/NotificationDelivery");
const NotificationLogger = require("./notification/NotificationLogger");
const { INFRASTRUCTURE_COLLECTIONS } = require("./notification/NotificationTypes");
const { statusOf, employeeIds } = require("./notification/NotificationHelpers");

initializeApp();
setGlobalOptions({ region: "asia-south1", memory: "256MiB", timeoutSeconds: 120, maxInstances: 20 });

const db = getFirestore();
const repository = new NotificationRepository(db);
const service = new NotificationService(repository);
const dispatcher = new NotificationDispatcher(service);
const delivery = new NotificationDelivery(getMessaging(), repository, new NotificationLogger(db));

exports.onErpEventWritten = onDocumentWritten({
  document: "Companies/{companyId}/{collectionName}/{documentId}", retry: true,
}, async (event) => {
  const { companyId, collectionName, documentId } = event.params;
  if (INFRASTRUCTURE_COLLECTIONS.has(collectionName)) return;
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  try {
    await dispatcher.dispatch({ companyId, collectionName, documentId, before, after });
  } catch (error) {
    logger.error("ERP notification dispatch failed", { companyId, collectionName, documentId, error });
    throw error;
  }
});

exports.onNotificationCreated = onDocumentCreated({
  document: "Companies/{companyId}/Notifications/{notificationId}", retry: true,
}, async (event) => {
  const notification = event.data?.data();
  if (!notification || notification.status === "scheduled" || notification.scheduledAt?.toMillis?.() > Date.now()) return;
  try {
    await delivery.deliver(event.params.companyId, event.params.notificationId, notification);
  } catch (error) {
    logger.error("Notification delivery failed", { ...event.params, error });
    throw error;
  }
});

exports.runNotificationDetectors = onSchedule({
  schedule: "every 30 minutes", timeZone: "Asia/Kolkata", retryCount: 3,
}, async () => {
  const companies = await repository.activeCompanies();
  await Promise.all(companies.map(async (company) => {
    const companyRef = repository.company(company.id);
    const [projectsSnapshot, scheduledSnapshot, invoicesSnapshot, billingSettingsSnapshot] = await Promise.all([
      companyRef.collection("Projectmanagement").get(), companyRef.collection("Notifications").where("status", "in", ["scheduled", "pending", "delivering"]).get(),
      companyRef.collection("Invoices").get(),
      companyRef.collection("BillingSettings").doc("default").get(),
    ]);
    const invoicedProjectIds = new Set(invoicesSnapshot.docs.flatMap((document) => {
      const invoice = document.data();
      return [invoice.projectId, invoice.projectBusinessId].filter(Boolean).map(String);
    }));
    const now = new Date(); const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    await Promise.all(projectsSnapshot.docs.flatMap((document) => {
      const project = { id: document.id, ...document.data() }; const tasks = [];
      if (statusOf(project) === "completed" && ![project.id, project.projectId].filter(Boolean).some((id) => invoicedProjectIds.has(String(id)))) {
        tasks.push(service.emit({ companyId: company.id, type: "billing.project-ready", module: "billing", sourceCollection: "Projectmanagement", sourceId: document.id, eventKey: "ready-for-billing", data: project, receiverRoles: ["manager", "admin", "owner"], actionRoute: "/manager/billing" }));
      }
      if (project.endDate && String(project.endDate).slice(0, 10) < today && statusOf(project) !== "completed") {
        tasks.push(service.emit({ companyId: company.id, type: "project.delayed", module: "project", sourceCollection: "Projectmanagement", sourceId: document.id, eventKey: `delayed-${today}`, data: project, receiverRoles: ["manager", "admin", "owner"], actionRoute: `/manager/projects/${document.id}` }));
      }
      const overdue = project.paymentDueDate && String(project.paymentDueDate).slice(0, 10) < today && Number(project.pendingPayment || project.totalPending || 0) > 0;
      if (overdue) tasks.push(service.emit({ companyId: company.id, type: "project.payment-overdue", module: "project", sourceCollection: "Projectmanagement", sourceId: document.id, eventKey: `payment-overdue-${today}`, data: project, receiverRoles: ["manager", "admin", "owner"], actionRoute: `/manager/projects/${document.id}` }));
      return tasks;
    }));
    await Promise.all(scheduledSnapshot.docs.map(async (document) => {
      const notification = document.data();
      const due = notification.scheduledAt?.toDate?.() || null;
      const lease = notification.deliveryLeaseAt?.toDate?.() || null;
      const recoverable = notification.status === "pending" || (notification.status === "delivering" && lease && now - lease > 10 * 60 * 1000);
      if ((due && due <= now) || recoverable) await delivery.deliver(company.id, document.id, notification);
    }));
    await Promise.all(invoicesSnapshot.docs.flatMap((document) => {
      const invoice = { id: document.id, ...document.data() };
      const status = String(invoice.status || "").toLowerCase();
      const dueDate = invoice.dueDate?.toDate?.() || (invoice.dueDate ? new Date(invoice.dueDate) : null);
      const pending = Number(invoice.pendingAmount ?? invoice.receivable ?? invoice.invoiceAmount ?? 0) - Number(invoice.paidAmount || 0);
      if (!dueDate || pending <= 0 || ["paid", "cancelled", "draft"].includes(status)) return [];
      const dueKey = dueDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
      const days = Math.floor((new Date(`${today}T00:00:00+05:30`) - new Date(`${dueKey}T00:00:00+05:30`)) / 86_400_000);
      const tasks = [];
      if ([0, 3, 7, 15, 30].includes(days)) tasks.push(service.emit({ companyId: company.id, type: "invoice.overdue", module: "billing", sourceCollection: "Invoices", sourceId: document.id, eventKey: `overdue-${days}-${today}`, data: { ...invoice, pendingAmount: pending }, receiverRoles: ["manager", "admin", "owner"], actionRoute: `/manager/billing/${document.id}` }));
      if (days === -3) tasks.push(service.emit({ companyId: company.id, type: "invoice.overdue", module: "billing", sourceCollection: "Invoices", sourceId: document.id, eventKey: `due-soon-${today}`, data: { ...invoice, pendingAmount: pending }, receiverRoles: ["manager", "admin", "owner"], actionRoute: `/manager/billing/${document.id}` }));
      if (pending >= Number(billingSettingsSnapshot.data()?.outstandingLimit || 100000)) tasks.push(service.emit({ companyId: company.id, type: "invoice.outstanding", module: "billing", sourceCollection: "Invoices", sourceId: document.id, eventKey: `large-outstanding-${today}`, data: { ...invoice, pendingAmount: pending }, receiverRoles: ["manager", "admin", "owner"], actionRoute: `/manager/billing/${document.id}` }));
      return tasks;
    }));
  }));
});

exports.runDailyWorkforceDetectors = onSchedule({
  schedule: "30 20 * * 1-6", timeZone: "Asia/Kolkata", retryCount: 3,
}, async () => {
  const companies = await repository.activeCompanies();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  await Promise.all(companies.map(async (company) => {
    const companyRef = repository.company(company.id);
    const [users, attendance, workLogs] = await Promise.all([
      repository.companyUsers(company.id), companyRef.collection("Attendance").where("date", "==", today).get(), companyRef.collection("WorkLogs").where("date", "==", today).get(),
    ]);
    const attendanceIds = new Set(attendance.docs.flatMap((document) => employeeIds(document.data())));
    const workIds = new Set(workLogs.docs.flatMap((document) => employeeIds(document.data())));
    const activeEmployees = users.filter((user) => !["inactive", "deactivated", "terminated"].includes(statusOf(user)));
    await Promise.all(activeEmployees.flatMap((user) => {
      const ids = [user.id, user.firestoreId, user.employeeId, user.uid].filter(Boolean).map(String); const tasks = [];
      const data = { ...user, employeeName: user.personalInfo?.fullName || user.fullName || user.name };
      if (!ids.some((id) => attendanceIds.has(id))) tasks.push(service.emit({ companyId: company.id, type: "attendance.missing", module: "attendance", sourceCollection: "Usermanagement", sourceId: user.id, eventKey: `missing-attendance-${today}`, data, receiverRoles: ["manager", "admin", "owner"] }));
      if (!ids.some((id) => workIds.has(id))) tasks.push(service.emit({ companyId: company.id, type: "work.missing", module: "work-log", sourceCollection: "Usermanagement", sourceId: user.id, eventKey: `missing-work-${today}`, data, receiverRoles: ["manager", "admin", "owner"] }));
      return tasks;
    }));
    await Promise.all(attendance.docs.filter((document) => {
      const record = document.data();
      return Boolean(record.checkIn || record.checkInTime) && !record.checkOut && !record.checkOutTime;
    }).map((document) => service.emit({
      companyId: company.id, type: "attendance.missing-punch", module: "attendance",
      sourceCollection: "Attendance", sourceId: document.id, eventKey: `missing-punch-${today}`,
      data: document.data(), receiverRoles: ["manager", "admin", "owner"],
    })));
  }));
});
