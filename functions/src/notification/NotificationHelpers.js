"use strict";

const { createHash } = require("node:crypto");

const lower = (value) => String(value || "").trim().toLowerCase();
const first = (data, keys) => keys.map((key) => data?.[key]).find((value) => value !== undefined && value !== null && value !== "");
const statusOf = (data) => lower(first(data, ["status", "approvalStatus", "requestStatus", "state"]) || data?.employment?.status);
const roleOf = (data) => lower(data?.role || data?.employment?.role || data?.userRole);
const employeeIds = (data) => [...new Set([
  data?.employeeFirestoreId, data?.employeeId, data?.userId, data?.uid,
  data?.employee?.id, data?.employee?.employeeId, data?.createdBy?.uid,
].filter(Boolean).map(String))];

function assignedIds(data) {
  return new Set((data?.employees || data?.assignedEmployees || []).flatMap((item) => [
    typeof item === "string" ? item : null, item?.firestoreId, item?.id, item?.employeeId, item?.uid,
  ]).filter(Boolean).map(String));
}

function tokenEntries(user) {
  const fields = [
    "fcmTokens", "deviceTokens", "notificationTokens", "messagingTokens", "pushTokens", "tokens", "devices",
    "notifications.fcmTokens", "messaging.tokens", "push.tokens",
  ];
  const entries = [];
  fields.forEach((field) => {
    const source = field.split(".").reduce((current, part) => current?.[part], user);
    if (Array.isArray(source)) source.forEach((token) => entries.push({ field, token: typeof token === "string" ? token : token?.token }));
    else if (source && typeof source === "object") Object.values(source).forEach((token) => entries.push({ field, token: typeof token === "string" ? token : token?.token }));
  });
  ["fcmToken", "deviceToken", "notificationToken", "messagingToken", "pushToken", "notifications.fcmToken", "messaging.token", "push.token"].forEach((field) => {
    const token = field.split(".").reduce((current, part) => current?.[part], user);
    if (typeof token === "string") entries.push({ field, token });
  });
  return [...new Map(entries.filter((item) => item.token).map((item) => [item.token, item])).values()];
}

function eventId(parts) {
  const raw = parts.filter(Boolean).join("|");
  return createHash("sha256").update(raw).digest("hex").slice(0, 40);
}

function stringifyData(data) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : typeof value === "string" ? value : JSON.stringify(value)]));
}

module.exports = { lower, first, statusOf, roleOf, employeeIds, assignedIds, tokenEntries, eventId, stringifyData };
