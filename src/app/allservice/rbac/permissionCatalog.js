export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "print", "manage"];
export const PERMISSION_MODULES = ["dashboard", "employee", "attendance", "gps", "leave", "advance", "expense", "projects", "clients", "vendors", "inventory", "billing", "invoices", "payroll", "reports", "notifications", "settings", "company", "quotation"];
export const permissionKey = (module, action) => `${module}.${action}`;
export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap((module) => PERMISSION_ACTIONS.map((action) => permissionKey(module, action)));

const modulePermissions = (modules, actions = PERMISSION_ACTIONS) => modules.flatMap((module) => actions.map((action) => permissionKey(module, action)));
const commonActions = ["view", "create", "edit", "approve", "export", "print"];
export const ROLE_TEMPLATES = {
  owner: { name: "Owner", system: true, permissions: ALL_PERMISSIONS },
  hr_manager: { name: "HR Manager", system: true, permissions: modulePermissions(["dashboard", "employee", "attendance", "gps", "leave", "payroll", "reports", "notifications"], [...commonActions, "manage"]) },
  accounts_manager: { name: "Accounts Manager", system: true, permissions: modulePermissions(["dashboard", "expense", "advance", "billing", "invoices", "vendors", "reports", "notifications"], commonActions) },
  project_manager: { name: "Project Manager", system: true, permissions: modulePermissions(["dashboard", "projects", "employee", "attendance", "gps", "expense", "clients", "reports", "notifications"], commonActions) },
  team_leader: { name: "Team Leader", system: true, permissions: modulePermissions(["dashboard", "projects", "employee", "attendance", "gps", "leave", "notifications"], ["view", "create", "edit", "approve"] ) },
  employee: { name: "Employee", system: true, permissions: modulePermissions(["dashboard", "attendance", "gps", "leave", "advance", "expense", "projects", "notifications"], ["view", "create", "edit"] ) },
};
export const normalizeRoleId = (value) => String(value || "employee").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
export const permissionsForRole = (roleId) => ROLE_TEMPLATES[normalizeRoleId(roleId)]?.permissions || [];

export const ROUTE_PERMISSIONS = [
  ["/manager/userManagement", "employee.view"], ["/manager/Workforce/payroll", "payroll.view"],
  ["/manager/Workforce/attendance", "attendance.view"], ["/manager/Workforce/gps-approval", "gps.view"],
  ["/manager/Workforce/leave-policy", "leave.manage"], ["/manager/Workforce/shift-policy", "settings.manage"],
  ["/manager/Workforce", "attendance.view"], ["/manager/projects", "projects.view"], ["/manager/clients", "clients.view"],
  ["/manager/vendors", "vendors.view"], ["/manager/expenses", "expense.view"], ["/manager/advance", "advance.view"],
  ["/manager/billing", "billing.view"], ["/manager/quotation-builder", "quotation.view"],
  ["/manager/notifications", "notifications.view"], ["/manager/notice", "notifications.manage"], ["/manager", "dashboard.view"],
].sort((a, b) => b[0].length - a[0].length);
export const permissionForPath = (pathname) => ROUTE_PERMISSIONS.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] || null;
