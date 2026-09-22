"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { renderTemplate } = require("./NotificationTemplates");
const { eventId } = require("./NotificationHelpers");

const MODULE_ROUTES = {
  leave: "/manager/Workforce", expense: "/manager/expenses", advance: "/manager/advance",
  attendance: "/manager/Workforce/attendance", gps: "/manager/Workforce/gps-approval",
  project: "/manager/projects", "work-log": "/manager/Workforce", payroll: "/manager",
  announcement: "/manager/notifications",
  billing: "/manager/billing",
};

class NotificationService {
  constructor(repository) { this.repository = repository; }

  async emit({ companyId, type, module, sourceCollection, sourceId, eventKey, data = {}, receiverIds = [], receiverRoles = [], receiver = null, broadcast = false, actionRoute, actionId, metadata = {} }) {
    const isAnnouncement = module === "announcement" && (receiver === "company" || receiver === "all" || broadcast === true || metadata.broadcast === true);
    if (!receiverIds.length && !receiverRoles.length && !metadata.department && !isAnnouncement) throw new Error("NOTIFICATION_RECIPIENT_REQUIRED");
    if ((receiver === "company" || receiver === "all") && !isAnnouncement) throw new Error("NOTIFICATION_BROADCAST_NOT_ALLOWED");
    const template = renderTemplate(type, data);
    const notificationId = eventId([companyId, sourceCollection, sourceId, eventKey || type]);
    const audienceKeys = [
      ...(isAnnouncement ? ["company:all"] : []),
      ...receiverIds.filter(Boolean).map((id) => `user:${id}`),
      ...receiverRoles.filter(Boolean).map((role) => `role:${String(role).toLowerCase()}`),
      ...(metadata.department ? [`department:${String(metadata.department).toLowerCase()}`] : []),
    ];
    return this.repository.createOnce(companyId, notificationId, {
      title: template.title, message: template.body, description: template.body,
      type, module, priority: template.priority, senderId: data.senderId || data.createdBy?.uid || data.employeeId || null,
      senderName: data.senderName || data.employeeName || data.createdBy?.name || null,
      receiverIds: [...new Set(receiverIds.filter(Boolean).map(String))], receiverRoles: [...new Set(receiverRoles.filter(Boolean).map(String))], broadcast: isAnnouncement || broadcast === true,
      audienceKeys: [...new Set(audienceKeys)],
      receiver, actionRoute: actionRoute || MODULE_ROUTES[module] || "/manager/notifications", actionId: actionId || sourceId,
      metadata: { ...metadata, sourceCollection, sourceId }, expiresAt: data.expiresAt || null,
      status: data.scheduledAt ? "scheduled" : "pending", scheduledAt: data.scheduledAt || null,
      sourceEventKey: eventKey || type, delivery: { successCount: 0, failureCount: 0, stateCount: 0 },
      engineVersion: 1, isArchived: false, updatedAt: FieldValue.serverTimestamp(),
    });
  }
}

module.exports = NotificationService;
