import { ALL_PERMISSIONS, permissionForPath, permissionsForRole, normalizeRoleId } from "./permissionCatalog";
export function resolveAccess({ currentUser, employee, company, role }) {
  const isOwner = Boolean(currentUser?.uid && company?.ownerUid === currentUser.uid) || normalizeRoleId(currentUser?.role || employee?.access?.roleId || employee?.employment?.role) === "owner";
  const roleId = isOwner ? "owner" : normalizeRoleId(employee?.access?.roleId || currentUser?.role || employee?.employment?.role);
  const base = role?.permissions || permissionsForRole(roleId);
  const granted = employee?.access?.permissionOverrides?.grant || [];
  const denied = employee?.access?.permissionOverrides?.deny || [];
  const permissions = isOwner ? ALL_PERMISSIONS : [...new Set([...base, ...granted])].filter((key) => !denied.includes(key));
  return { isOwner, roleId, permissions, status: employee?.access?.status || employee?.employment?.status || "active", loginEnabled: employee?.access?.loginEnabled !== false, requirePasswordChange: Boolean(employee?.access?.requirePasswordChange), policyAccepted: employee?.access?.policyAccepted !== false };
}
export const can = (access, permission) => Boolean(access?.isOwner || !permission || access?.permissions?.includes(permission));
export const canAccessPath = (access, pathname) => can(access, permissionForPath(pathname));

export function defaultRouteForAccess(access) {
  const routes = ["/manager", "/manager/userManagement", "/manager/Workforce/attendance", "/manager/projects", "/manager/expenses", "/manager/advance", "/manager/billing", "/manager/quotation-builder", "/manager/notifications"];
  return routes.find((route) => canAccessPath(access, route)) || "/manager";
}
