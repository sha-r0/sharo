"use strict";

const { statusOf, employeeIds, assignedIds } = require("./NotificationHelpers");

class NotificationDispatcher {
  constructor(service) { this.service = service; }

  managerEvent(base, type, module, data, options = {}) {
    return this.service.emit({ ...base, type, module, data, receiverRoles: ["manager", "admin", "owner"], ...options });
  }

  employeeEvent(base, type, module, data, options = {}) {
    return this.service.emit({ ...base, type, module, data, receiverIds: employeeIds(data), ...options });
  }

  async dispatch({ companyId, collectionName, documentId, before, after }) {
    if (!after) return [];
    const created = !before;
    const previousStatus = statusOf(before);
    const status = statusOf(after);
    const base = { companyId, sourceCollection: collectionName, sourceId: documentId, actionId: documentId };
    const tasks = [];

    if (["LeaveRequests", "Leaves"].includes(collectionName)) {
      if (created && (!status || ["pending", "applied", "requested"].includes(status))) tasks.push(this.managerEvent(base, "leave.applied", "leave", after, { eventKey: "applied" }));
      if (!created && status !== previousStatus && status === "approved") tasks.push(this.employeeEvent(base, "leave.approved", "leave", after, { eventKey: "approved" }));
      if (!created && status !== previousStatus && status === "rejected") tasks.push(this.employeeEvent(base, "leave.rejected", "leave", after, { eventKey: "rejected" }));
    }

    if (collectionName === "Expenses") {
      if (created && (!status || ["pending", "submitted"].includes(status))) tasks.push(this.managerEvent(base, "expense.submitted", "expense", after, { eventKey: "submitted" }));
      if (!created && status !== previousStatus && status === "approved") tasks.push(this.employeeEvent(base, "expense.approved", "expense", after, { eventKey: "approved" }));
      if (!created && status !== previousStatus && status === "rejected") tasks.push(this.employeeEvent(base, "expense.rejected", "expense", after, { eventKey: "rejected" }));
    }

    if (["AdvanceRequests", "Advances"].includes(collectionName)) {
      if (created && ["pending", "requested"].includes(status)) tasks.push(this.managerEvent(base, "advance.requested", "advance", after, { eventKey: "requested" }));
      if (!created && status !== previousStatus && status === "approved") tasks.push(this.employeeEvent(base, "advance.approved", "advance", after, { eventKey: "approved" }));
      if (!created && status !== previousStatus && status === "rejected") tasks.push(this.employeeEvent(base, "advance.rejected", "advance", after, { eventKey: "rejected" }));
    }

    if (collectionName === "Attendance") {
      if (created && (after.checkIn || after.checkInTime || status === "present" || status === "late")) tasks.push(this.managerEvent(base, "attendance.check-in", "attendance", after, { eventKey: "check-in" }));
      if ((!before?.checkOut && after.checkOut) || (!before?.checkOutTime && after.checkOutTime)) tasks.push(this.managerEvent(base, "attendance.check-out", "attendance", after, { eventKey: "check-out" }));
      if ((created || !before?.isLate) && (after.isLate === true || status === "late")) tasks.push(this.managerEvent(base, "attendance.late", "attendance", after, { eventKey: "late" }));
      if ((created || !before?.outsideRadius) && (after.outsideRadius === true || after.isOutsideRadius === true || after.withinRadius === false)) tasks.push(this.managerEvent(base, "gps.outside-radius", "gps", after, { eventKey: "outside-radius" }));
    }

    if (collectionName === "GPSPunches" && (created || !before?.outsideRadius) && (after.outsideRadius === true || after.isOutsideRadius === true || after.withinRadius === false)) {
      tasks.push(this.managerEvent(base, "gps.outside-radius", "gps", after, { eventKey: "outside-radius" }));
    }

    if (collectionName === "Projectmanagement") {
      const oldIds = assignedIds(before); const newIds = assignedIds(after);
      const added = [...newIds].filter((id) => !oldIds.has(id)); const removed = [...oldIds].filter((id) => !newIds.has(id));
      if (added.length) tasks.push(this.service.emit({ ...base, type: "project.assigned", module: "project", data: after, receiverIds: added, eventKey: `assigned-${added.sort().join("-")}`, actionRoute: `/manager/projects/${documentId}` }));
      if (removed.length) tasks.push(this.service.emit({ ...base, type: "project.removed", module: "project", data: after, receiverIds: removed, eventKey: `removed-${removed.sort().join("-")}`, actionRoute: `/manager/projects/${documentId}` }));
      if (status !== previousStatus && status === "delayed") tasks.push(this.managerEvent(base, "project.delayed", "project", after, { eventKey: "delayed", actionRoute: `/manager/projects/${documentId}` }));
      if (status !== previousStatus && status === "completed") tasks.push(this.managerEvent(base, "project.completed", "project", after, { eventKey: "completed", actionRoute: `/manager/projects/${documentId}` }));
      if (status !== previousStatus && status === "completed") tasks.push(this.managerEvent(base, "billing.project-ready", "billing", after, { eventKey: "ready-for-billing", actionRoute: "/manager/billing" }));
      const budget = Number(after.budget || after.approvedBudget || 0); const expense = Number(after.totalExpense || after.actualExpense || 0);
      if (budget > 0 && expense > budget && !(Number(before?.totalExpense || before?.actualExpense || 0) > Number(before?.budget || before?.approvedBudget || 0))) tasks.push(this.managerEvent(base, "project.budget-exceeded", "project", after, { eventKey: "budget-exceeded", actionRoute: `/manager/projects/${documentId}` }));
      const profit = Number(after.totalProfit ?? Number(after.poAmount || after.contractValue || 0) - expense);
      const oldProfit = Number(before?.totalProfit ?? Number(before?.poAmount || before?.contractValue || 0) - Number(before?.totalExpense || 0));
      if (profit < 0 && oldProfit >= 0) tasks.push(this.managerEvent(base, "project.loss-predicted", "project", after, { eventKey: "loss-predicted", actionRoute: `/manager/projects/${documentId}` }));
    }

    if (["WorkLogs", "WorkDetails"].includes(collectionName)) {
      if (created && (after.startTime || after.startedAt || ["running", "started"].includes(status))) tasks.push(this.managerEvent(base, "work.started", "work-log", after, { eventKey: "started" }));
      if ((!before?.endTime && after.endTime) || (!before?.completedAt && after.completedAt) || (status !== previousStatus && ["completed", "finished"].includes(status))) tasks.push(this.managerEvent(base, "work.completed", "work-log", after, { eventKey: "completed" }));
      const productivity = Number(after.productivity ?? after.productivityScore ?? 100);
      if (productivity < Number(after.productivityThreshold || 50) && Number(before?.productivity ?? before?.productivityScore ?? 100) >= Number(after.productivityThreshold || 50)) tasks.push(this.managerEvent(base, "work.low-productivity", "work-log", after, { eventKey: "low-productivity" }));
    }

    if (["Payroll", "Salaries"].includes(collectionName) && status !== previousStatus) {
      if (["processed", "paid", "completed"].includes(status)) tasks.push(this.employeeEvent(base, "payroll.processed", "payroll", after, { eventKey: `processed-${after.month || "current"}` }));
      if (["failed", "rejected"].includes(status)) tasks.push(this.managerEvent(base, "payroll.failed", "payroll", after, { eventKey: `failed-${after.month || "current"}` }));
    }

    if (["Notices", "Announcements"].includes(collectionName) && created) {
      tasks.push(this.service.emit({ ...base, type: "announcement.created", module: "announcement", data: after,
        receiver: after.receiver || (after.target === "company" ? "company" : null), receiverIds: after.receiverIds || after.targetUsers || [],
        receiverRoles: after.receiverRoles || (after.targetRole ? [after.targetRole] : []), eventKey: "created",
        metadata: { department: after.department || null, targetType: after.target || "company" }, actionRoute: "/manager/notifications" }));
    }
    if (collectionName === "Invoices") {
      if (created) tasks.push(this.managerEvent(base, "invoice.generated", "billing", after, { eventKey: "generated", actionRoute: `/manager/billing/${documentId}` }));
      if (!created && status !== previousStatus && status === "sent") tasks.push(this.managerEvent(base, "invoice.sent", "billing", after, { eventKey: "sent", actionRoute: `/manager/billing/${documentId}` }));
    }
    if (collectionName === "Payments" && created && !["failed", "cancelled", "rejected"].includes(status)) {
      tasks.push(this.managerEvent(base, "payment.received", "billing", after, { eventKey: "received", actionRoute: after.invoiceId ? `/manager/billing/${after.invoiceId}` : "/manager/billing" }));
    }
    return Promise.all(tasks);
  }
}

module.exports = NotificationDispatcher;
