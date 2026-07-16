"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { roleOf, tokenEntries } = require("./NotificationHelpers");

class NotificationRepository {
  constructor(db) { this.db = db; }
  company(companyId) { return this.db.collection("Companies").doc(companyId); }
  notifications(companyId) { return this.company(companyId).collection("Notifications"); }

  async createOnce(companyId, notificationId, payload) {
    const reference = this.notifications(companyId).doc(notificationId);
    return this.db.runTransaction(async (transaction) => {
      const existing = await transaction.get(reference);
      if (existing.exists) return { id: reference.id, created: false };
      transaction.create(reference, {
        ...payload, notificationId: reference.id, companyId,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: reference.id, created: true };
    });
  }

  async companyUsers(companyId) {
    const nestedPromise = this.company(companyId).collection("Usermanagement").get();
    const rootPromise = this.db.collection("Usermanagement").where("companyId", "==", companyId).get();
    const [nested, root] = await Promise.all([nestedPromise, rootPromise]);
    return [...nested.docs, ...root.docs].map((document) => ({
      ...document.data(), id: document.id, ref: document.ref, companyId,
    }));
  }

  async resolveRecipients(companyId, notification) {
    const users = await this.companyUsers(companyId);
    const direct = new Set((notification.receiverIds || notification.targetUsers || []).filter(Boolean).map(String));
    const roles = new Set((notification.receiverRoles || [notification.targetRole]).filter(Boolean).map((item) => String(item).toLowerCase()));
    const department = String(notification.metadata?.department || notification.department || "").toLowerCase();
    const companyWide = notification.receiver === "company" || notification.receiver === "all" || notification.metadata?.targetType === "company";
    return users.filter((user) => {
      const ids = [user.id, user.firestoreId, user.employeeId, user.uid].filter(Boolean).map(String);
      if (ids.some((id) => direct.has(id))) return true;
      if (roles.has(roleOf(user))) return true;
      if (department && String(user.department || user.employment?.department || "").toLowerCase() === department) return true;
      return companyWide;
    });
  }

  async initializeUserStates(companyId, notificationId, recipients) {
    const uniqueIds = [...new Set(recipients.map((user) => String(user.firestoreId || user.id || user.uid)).filter(Boolean))];
    for (let offset = 0; offset < uniqueIds.length; offset += 450) {
      const batch = this.db.batch();
      uniqueIds.slice(offset, offset + 450).forEach((userId) => {
        const ref = this.company(companyId).collection("UserNotifications").doc(userId).collection("Items").doc(notificationId);
        batch.set(ref, {
          isRead: false, readAt: null, isArchived: false, isDeleted: false, isPinned: false,
          archived: false, deleted: false, pinned: false, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      });
      await batch.commit();
    }
    return uniqueIds.length;
  }

  tokensFor(recipients) {
    const entries = [];
    recipients.forEach((user) => tokenEntries(user).forEach((entry) => entries.push({ ...entry, user })));
    return [...new Map(entries.map((entry) => [entry.token, entry])).values()];
  }

  async removeInvalidTokens(entries) {
    await Promise.all(entries.map(async ({ user, token, field }) => {
      if (!user.ref) return;
      const snapshot = await user.ref.get();
      if (!snapshot.exists) return;
      const current = snapshot.get(field);
      if (typeof current === "string" && current === token) await user.ref.update({ [field]: FieldValue.delete() });
      else if (Array.isArray(current)) await user.ref.update({ [field]: current.filter((item) => (typeof item === "string" ? item : item?.token) !== token) });
      else if (current && typeof current === "object") {
        const cleaned = Object.fromEntries(Object.entries(current).filter(([, item]) => (typeof item === "string" ? item : item?.token) !== token));
        await user.ref.update({ [field]: cleaned });
      }
    }));
  }

  async markDelivery(companyId, notificationId, data) {
    await this.notifications(companyId).doc(notificationId).set({
      delivery: data, status: data.failureCount && !data.successCount ? "failed" : "delivered",
      deliveredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  async claimDelivery(companyId, notificationId) {
    const reference = this.notifications(companyId).doc(notificationId);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists) return false;
      const notification = snapshot.data();
      if (notification.status === "delivered") return false;
      const expiresAt = notification.expiresAt?.toMillis?.() || 0;
      if (expiresAt && expiresAt <= Date.now()) {
        transaction.update(reference, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
        return false;
      }
      const scheduledAt = notification.scheduledAt?.toMillis?.() || 0;
      if (scheduledAt > Date.now()) return false;
      const leaseAt = notification.deliveryLeaseAt?.toMillis?.() || 0;
      if (notification.status === "delivering" && Date.now() - leaseAt < 10 * 60 * 1000) return false;
      transaction.update(reference, { status: "delivering", deliveryLeaseAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return true;
    });
  }

  async activeCompanies() {
    const snapshot = await this.db.collection("Companies").get();
    return snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
  }
}

module.exports = NotificationRepository;
