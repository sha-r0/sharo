export const NOTIFICATION_PRIORITIES = ["critical", "high", "medium", "low"];

export const NOTIFICATION_MODULES = [
  "attendance", "leave", "advance", "expense", "project", "work-log",
  "gps", "client", "quotation", "inventory", "payroll", "user-management",
  "company", "notice", "holiday", "task", "announcement",
];

export const MODULE_ROUTES = {
  attendance: "/manager/Workforce/attendance",
  leave: "/manager/Workforce",
  advance: "/manager/advance",
  expense: "/manager/expenses",
  project: "/manager/projects",
  "work-log": "/manager/Workforce",
  gps: "/manager/Workforce/gps-approval",
  client: "/manager/clients",
  quotation: "/manager/quotation-builder",
  "user-management": "/manager/userManagement",
  company: "/manager",
  notice: "/manager/notice",
  holiday: "/manager/Workforce/leave-policy",
  task: "/manager",
  inventory: "/manager",
  payroll: "/manager",
  announcement: "/manager/notifications",
};

export const MODULE_STYLES = {
  attendance: { icon: "clock", color: "blue" },
  leave: { icon: "calendar", color: "pink" },
  advance: { icon: "banknote", color: "amber" },
  expense: { icon: "receipt", color: "violet" },
  project: { icon: "folder", color: "indigo" },
  "work-log": { icon: "timer", color: "cyan" },
  gps: { icon: "map-pin", color: "red" },
  client: { icon: "building", color: "emerald" },
  quotation: { icon: "file-text", color: "purple" },
  inventory: { icon: "package", color: "orange" },
  payroll: { icon: "wallet", color: "green" },
  "user-management": { icon: "user", color: "blue" },
  company: { icon: "settings", color: "slate" },
  notice: { icon: "megaphone", color: "amber" },
  holiday: { icon: "calendar-days", color: "pink" },
  task: { icon: "check-square", color: "teal" },
  announcement: { icon: "megaphone", color: "blue" },
};

const normalized = (value) => String(value || "").trim().toLowerCase();

export function buildAudienceKeys({ receiver, targetRole, targetUsers = [], department, projectId }) {
  const keys = new Set();
  if (receiver === "company" || receiver === "all") keys.add("company:all");
  if (receiver && !["company", "all"].includes(receiver)) keys.add(`user:${receiver}`);
  if (targetRole) keys.add(`role:${normalized(targetRole)}`);
  targetUsers.filter(Boolean).forEach((id) => keys.add(`user:${id}`));
  if (department) keys.add(`department:${normalized(department)}`);
  if (projectId) keys.add(`project:${projectId}`);
  return [...keys];
}

export function getUserAudienceKeys(user) {
  const role = user?.role || user?.employment?.role;
  const department = user?.department || user?.employment?.department;
  const ids = [user?.id, user?.uid, user?.firestoreId, user?.employeeId].filter(Boolean);
  return ["company:all", ...ids.map((id) => `user:${id}`), role && `role:${normalized(role)}`, department && `department:${normalized(department)}`].filter(Boolean).slice(0, 10);
}

export function normalizeNotification(input) {
  const module = normalized(input.module || "company");
  const style = MODULE_STYLES[module] || MODULE_STYLES.company;
  const priority = normalized(input.priority || "medium");
  if (!input.companyId) throw new Error("companyId is required");
  if (!input.title?.trim()) throw new Error("Notification title is required");
  if (!NOTIFICATION_PRIORITIES.includes(priority)) throw new Error("Invalid notification priority");

  return {
    companyId: input.companyId,
    type: normalized(input.type || "event"),
    module,
    title: input.title.trim(),
    message: String(input.message || "").trim(),
    priority,
    sender: input.sender || null,
    receiver: input.receiver || "company",
    targetRole: input.targetRole || null,
    targetUsers: [...new Set(input.targetUsers || [])],
    audienceKeys: buildAudienceKeys({ ...input, projectId: input.projectId || input.metadata?.projectId }),
    status: input.status || (input.scheduledAt ? "scheduled" : "published"),
    actionRoute: input.actionRoute || MODULE_ROUTES[module] || "/manager/notifications",
    actionId: input.actionId || null,
    icon: input.icon || style.icon,
    color: input.color || style.color,
    metadata: input.metadata || {},
    isArchived: false,
    expiresAt: input.expiresAt || null,
    scheduledAt: input.scheduledAt || null,
  };
}

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
  const result = value instanceof Date ? value : new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function isNotificationVisible(notification, now = new Date()) {
  const scheduledAt = toDate(notification.scheduledAt);
  const expiresAt = toDate(notification.expiresAt);
  return !notification.isArchived && (!scheduledAt || scheduledAt <= now) && (!expiresAt || expiresAt > now);
}

export function groupNotifications(notifications, now = new Date()) {
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(startToday); yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(startToday); week.setDate(week.getDate() - 7);
  const groups = { Today: [], Yesterday: [], "This Week": [], Earlier: [] };
  notifications.forEach((item) => {
    const created = toDate(item.createdAt) || new Date(0);
    if (created >= startToday) groups.Today.push(item);
    else if (created >= yesterday) groups.Yesterday.push(item);
    else if (created >= week) groups["This Week"].push(item);
    else groups.Earlier.push(item);
  });
  return groups;
}

export function timeAgo(value) {
  const date = toDate(value);
  if (!date) return "Just now";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
