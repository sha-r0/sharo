import { ALL_PERMISSIONS, DEFAULT_ROLE_LEVELS, calculateEffectivePermissions, permissionForPath, permissionsForRole, normalizeRoleId } from "./permissionCatalog";
import { resolveEmployeeLoginEnabled, resolveEmployeeRoleId, resolveEmployeeStatus, resolvePermissionOverrides } from "./employeeAuth";
export function resolveAccess({ currentUser, employee, company, role }) {
  const isOwner = Boolean(currentUser?.uid && company?.ownerUid === currentUser.uid) || normalizeRoleId(currentUser?.role || employee?.access?.roleId || employee?.employment?.role) === "owner";
  const roleId = isOwner ? "owner" : normalizeRoleId(resolveEmployeeRoleId(employee, currentUser));
  const storedPermissions = employee?.access?.effectivePermissions || employee?.effectivePermissions;
  const hasStoredPermissions = Array.isArray(storedPermissions);
  const base = role?.permissions || permissionsForRole(roleId);
  const overrides = resolvePermissionOverrides(employee);
  // Firestore rules use access.effectivePermissions. Prefer that same
  // server-maintained snapshot so route checks and rules cannot disagree.
  const permissions = isOwner
    ? ALL_PERMISSIONS
    : hasStoredPermissions
      ? storedPermissions
      : calculateEffectivePermissions({ rolePermissions: base, grantedPermissions: overrides.grant, deniedPermissions: overrides.deny });
  const accountType = isOwner ? "owner" : "employee";
  return { isOwner, isEmployee: !isOwner, accountType, roleId, roleLevel: Number(role?.level ?? DEFAULT_ROLE_LEVELS[roleId] ?? 10), permissions, status: resolveEmployeeStatus(employee), loginEnabled: isOwner || resolveEmployeeLoginEnabled(employee), requirePasswordChange: !isOwner && Boolean(employee?.access?.requirePasswordChange ?? employee?.requirePasswordChange), policyAccepted: isOwner || employee?.access?.policyAccepted !== false, teamId: employee?.reporting?.teamId || employee?.employment?.teamId || null, reportsTo: employee?.reporting?.reportsTo || employee?.employment?.reportsTo || null };
}
export const can = (access, permission) => Boolean(access?.isOwner || !permission || access?.permissions?.includes(permission));
export const canAccessPath = (access, pathname) => can(access, permissionForPath(pathname));

export function defaultRouteForAccess(access) {
  const routes = ["/manager", "/manager/userManagement", "/manager/Workforce/attendance", "/manager/projects", "/manager/expenses", "/manager/advance", "/manager/billing", "/manager/quotation-builder", "/manager/notifications"];
  return routes.find((route) => canAccessPath(access, route)) || "/manager";
}
