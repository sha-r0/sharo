export const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "print", "manage"];
export const PERMISSION_MODULES = ["dashboard", "employee", "attendance", "gps", "leave", "advance", "expense", "projects", "clients", "vendors", "inventory", "billing", "invoices", "payroll", "reports", "notifications", "settings", "company", "quotation", "purchase_order", "performance"];
export const permissionKey = (module, action) => `${module}.${action}`;
export const DEDICATED_PERMISSIONS = ["payout.execute", "purchase_order.issue", "purchase_order.cancel", "purchase_order.fulfill", "purchase_order.bill", "performance.manage"];
export const ALL_PERMISSIONS = [...PERMISSION_MODULES.flatMap((module) => (module === "performance" ? ["view"] : PERMISSION_ACTIONS).map((action) => permissionKey(module, action))), ...DEDICATED_PERMISSIONS];
export const DEFAULT_ROLE_LEVELS = { owner: 100, admin: 90, hr_manager: 70, accounts_manager: 70, project_manager: 60, manager: 60, team_leader: 50, employee: 10 };
export function calculateEffectivePermissions({ rolePermissions = [], grantedPermissions = [], deniedPermissions = [] }) {
  const permissions = new Set([...rolePermissions, ...grantedPermissions]);
  deniedPermissions.forEach((permission) => permissions.delete(permission));
  return [...permissions];
}

const modulePermissions = (modules, actions = PERMISSION_ACTIONS) => modules.flatMap((module) => actions.map((action) => permissionKey(module, action)));
const commonActions = ["view", "create", "edit", "approve", "export", "print"];
export const ROLE_TEMPLATES = {
  owner: { name: "Owner", level: 100, system: true, isActive: true, canAssignRoles: ["admin", "hr_manager", "accounts_manager", "project_manager", "manager", "team_leader", "employee"], canManagePermissions: true, permissions: ALL_PERMISSIONS },
  hr_manager: { name: "HR Manager", level: 70, system: true, isActive: true, canAssignRoles: ["project_manager", "manager", "team_leader", "employee"], canManagePermissions: true, permissions: [...modulePermissions(["dashboard", "employee", "attendance", "gps", "leave", "payroll", "reports", "notifications"], [...commonActions, "manage"]), ...modulePermissions(["performance"], ["view"])] },
  accounts_manager: { name: "Accounts Manager", level: 70, system: true, isActive: true, canAssignRoles: ["employee"], canManagePermissions: false, permissions: ["employee.view", ...modulePermissions(["dashboard", "expense", "advance", "billing", "invoices", "vendors", "reports", "notifications"], commonActions), ...modulePermissions(["purchase_order"], ["view", "create", "edit", "approve"]), "payout.execute", "purchase_order.issue", "purchase_order.cancel", "purchase_order.fulfill", "purchase_order.bill"] },
  project_manager: { name: "Project Manager", level: 60, system: true, isActive: true, canAssignRoles: ["team_leader", "employee"], canManagePermissions: false, permissions: [...modulePermissions(["dashboard", "projects", "employee", "attendance", "gps", "expense", "clients", "reports", "notifications"], commonActions), ...modulePermissions(["performance"], ["view"])] },
  team_leader: { name: "Team Leader", level: 50, system: true, isActive: true, canAssignRoles: ["employee"], canManagePermissions: false, permissions: [...modulePermissions(["dashboard", "projects", "employee", "attendance", "gps", "leave", "notifications"], ["view", "create", "edit", "approve"] ), ...modulePermissions(["performance"], ["view"])] },
  employee: { name: "Employee", level: 10, system: true, isActive: true, canAssignRoles: [], canManagePermissions: false, permissions: modulePermissions(["dashboard", "attendance", "gps", "leave", "advance", "expense", "projects", "notifications"], ["view", "create", "edit"] ) },
};
export const normalizeRoleId = (value) => String(value || "employee").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
export const permissionsForRole = (roleId) => ROLE_TEMPLATES[normalizeRoleId(roleId)]?.permissions || [];

export const ROUTE_PERMISSIONS = [
  ["/manager/expenses/add", "expense.create"],
  ["/manager/expenses/setup", "expense.manage"],
  ["/manager/userManagement/add", "employee.create"], ["/manager/userManagement/edit", "employee.edit"],
  ["/manager/billing/new", "billing.create"], ["/manager/billing/settings", "billing.manage"],
  ["/manager/performance", "performance.view"],
  ["/manager/settings", "company.manage"],
  ["/manager/quotation-builder/new", "quotation.create"], ["/manager/quotation-builder/setup", "quotation.manage"],
  ["/manager/userManagement", "employee.view"], ["/manager/Workforce/payroll", "payroll.view"],
  ["/manager/Workforce/esi-pf", "payroll.view"],
  ["/manager/Workforce/attendance", "attendance.view"], ["/manager/Workforce/gps-approval", "gps.view"],
  ["/manager/Workforce/leave-approval", "leave.view"],
  ["/manager/Workforce/leave-policy", "leave.manage"], ["/manager/Workforce/shift-policy", "settings.manage"],
  ["/manager/Workforce", "attendance.view"], ["/manager/projects", "projects.view"], ["/manager/clients", "clients.view"],
  ["/manager/vendors", "vendors.view"], ["/manager/expenses", "expense.view"], ["/manager/advance", "advance.view"],
  ["/manager/billing", "billing.view"], ["/manager/quotation-builder", "quotation.view"],
  ["/manager/purchase-orders/new", "purchase_order.create"], ["/manager/purchase-orders", "purchase_order.view"],
  ["/manager/notifications", "notifications.view"], ["/manager/notice", "notifications.manage"], ["/manager", "dashboard.view"],
].sort((a, b) => b[0].length - a[0].length);
export const permissionForPath = (pathname) => ROUTE_PERMISSIONS.find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] || null;
