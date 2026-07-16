"use strict";

const PRIORITIES = Object.freeze(["critical", "high", "medium", "low"]);
const TERMINAL_STATUSES = Object.freeze(["approved", "rejected", "completed", "failed"]);

const COLLECTION_MODULES = Object.freeze({
  LeaveRequests: "leave", Leaves: "leave", Expenses: "expense",
  AdvanceRequests: "advance", Advances: "advance", Attendance: "attendance",
  GPSPunches: "gps", Projectmanagement: "project", WorkLogs: "work-log",
  WorkDetails: "work-log", Payroll: "payroll", Salaries: "payroll",
  Notices: "announcement", Announcements: "announcement",
  Invoices: "billing", Payments: "billing",
});

const INFRASTRUCTURE_COLLECTIONS = new Set([
  "Notifications", "UserNotifications", "NotificationLogs", "NotificationEngine",
]);

module.exports = { PRIORITIES, TERMINAL_STATUSES, COLLECTION_MODULES, INFRASTRUCTURE_COLLECTIONS };
