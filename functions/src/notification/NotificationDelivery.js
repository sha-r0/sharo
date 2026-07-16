"use strict";

const { stringifyData } = require("./NotificationHelpers");

const INVALID_CODES = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered"]);
const RETRYABLE_CODES = new Set(["messaging/internal-error", "messaging/server-unavailable", "messaging/unknown-error"]);

class NotificationDelivery {
  constructor(messaging, repository, logger) { this.messaging = messaging; this.repository = repository; this.logger = logger; }

  message(notification, tokens) {
    const data = stringifyData({
      notificationId: notification.notificationId, companyId: notification.companyId,
      type: notification.type, module: notification.module, priority: notification.priority,
      actionId: notification.actionId, actionRoute: notification.actionRoute, deepLink: notification.actionRoute,
    });
    return {
      tokens, notification: { title: notification.title, body: notification.message, ...(notification.image ? { imageUrl: notification.image } : {}) }, data,
      android: { priority: notification.priority === "critical" || notification.priority === "high" ? "high" : "normal", notification: { channelId: "erp_notifications", clickAction: "FLUTTER_NOTIFICATION_CLICK" } },
      apns: { headers: { "apns-priority": notification.priority === "low" ? "5" : "10" }, payload: { aps: { sound: "default", category: notification.type } } },
    };
  }

  async sendBatch(notification, entries) {
    const response = await this.messaging.sendEachForMulticast(this.message(notification, entries.map((item) => item.token)));
    const retry = []; const invalid = []; const errors = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = result.error?.code || "unknown";
      errors.push({ code, message: result.error?.message || "FCM delivery failed" });
      if (INVALID_CODES.has(code)) invalid.push(entries[index]);
      else if (RETRYABLE_CODES.has(code)) retry.push(entries[index]);
    });
    let retrySuccess = 0; let retryFailure = retry.length;
    if (retry.length) {
      const retried = await this.messaging.sendEachForMulticast(this.message(notification, retry.map((item) => item.token)));
      retrySuccess = retried.successCount; retryFailure = retried.failureCount;
    }
    return { successCount: response.successCount + retrySuccess, failureCount: response.failureCount - retry.length + retryFailure, invalid, errors, attempts: retry.length ? 2 : 1 };
  }

  async deliver(companyId, notificationId, notification) {
    const claimed = await this.repository.claimDelivery(companyId, notificationId);
    if (!claimed) return null;
    const recipients = await this.repository.resolveRecipients(companyId, notification);
    const stateCount = await this.repository.initializeUserStates(companyId, notificationId, recipients);
    const entries = this.repository.tokensFor(recipients);
    const aggregate = { successCount: 0, failureCount: 0, invalidTokenCount: 0, stateCount, attempts: 1, errors: [] };
    for (let offset = 0; offset < entries.length; offset += 500) {
      const result = await this.sendBatch({ ...notification, companyId, notificationId }, entries.slice(offset, offset + 500));
      aggregate.successCount += result.successCount; aggregate.failureCount += result.failureCount;
      aggregate.attempts = Math.max(aggregate.attempts, result.attempts); aggregate.errors.push(...result.errors.slice(0, 20));
      aggregate.invalidTokenCount += result.invalid.length;
      await this.repository.removeInvalidTokens(result.invalid);
    }
    await Promise.all([
      this.repository.markDelivery(companyId, notificationId, aggregate),
      this.logger.write(companyId, notificationId, aggregate),
    ]);
    return aggregate;
  }
}

module.exports = NotificationDelivery;
