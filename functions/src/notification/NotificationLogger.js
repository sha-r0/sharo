"use strict";

const { FieldValue } = require("firebase-admin/firestore");

class NotificationLogger {
  constructor(db) { this.db = db; }

  async write(companyId, notificationId, result) {
    await this.db.collection("Companies").doc(companyId).collection("NotificationLogs").doc(notificationId).set({
      notificationId, companyId, success: result.failureCount === 0,
      deliveryCount: result.successCount, failed: result.failureCount,
      invalidTokenCount: result.invalidTokenCount || 0,
      attempts: result.attempts || 1, errors: result.errors || [],
      completedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}

module.exports = NotificationLogger;
