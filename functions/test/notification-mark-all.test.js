"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

test("Mark All Read is chunked, state-only, parent-free, and catches failures", () => {
  const repository = fs.readFileSync(path.join(__dirname, "../../src/app/allservice/notification/notificationRepository.js"), "utf8");
  const context = fs.readFileSync(path.join(__dirname, "../../src/app/allservice/notification/NotificationContext.jsx"), "utf8");
  assert.match(repository, /index \+= 450/);
  assert.match(repository, /isRead: true, readAt: serverTimestamp\(\), updatedAt: serverTimestamp\(\)/);
  assert.doesNotMatch(repository, /UserNotifications", userId\)\s*;/);
  assert.match(context, /await notificationRepository\.markManyRead/);
  assert.match(context, /catch \(markAllError\)/);
  assert.match(context, /\[Notifications\] markAllRead failed/);
});
