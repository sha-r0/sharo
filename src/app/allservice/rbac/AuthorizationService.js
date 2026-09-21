import { ALL_PERMISSIONS, DEFAULT_ROLE_LEVELS, calculateEffectivePermissions, permissionForPath, permissionsForRole, normalizeRoleId } from "./permissionCatalog.js";
import { resolveEmployeeLoginEnabled, resolveEmployeeRoleId, resolveEmployeeStatus, resolvePermissionOverrides } from "./employeeAuth.js";
export function resolveAccess({ currentUser, employee, company, role }) {
  // Ownership is authoritative only when the authenticated Firebase UID matches
  // the trusted company document. Employee/root profile roles are editable data
  // and must never be able to promote an account to owner.
  const isOwner = Boolean(currentUser?.uid && company?.ownerUid === currentUser.uid);
  const requestedRoleId = normalizeRoleId(resolveEmployeeRoleId(employee, currentUser));
  const roleId = isOwner ? "owner" : requestedRoleId === "owner" ? "employee" : requestedRoleId;
  const storedPermissions = employee?.access?.effectivePermissions || employee?.effectivePermissions;
  const hasStoredPermissions = Array.isArray(storedPermissions);
  const base = !isOwner && requestedRoleId === "owner" ? permissionsForRole(roleId) : role?.permissions || permissionsForRole(roleId);
  const overrides = resolvePermissionOverrides(employee);
  // Firestore rules use access.effectivePermissions. Prefer that same
  // server-maintained snapshot so route checks and rules cannot disagree.
  const permissions = isOwner
    ? ALL_PERMISSIONS
    : hasStoredPermissions
      ? storedPermissions
      : calculateEffectivePermissions({ rolePermissions: base, grantedPermissions: overrides.grant, deniedPermissions: overrides.deny });
  const accountType = isOwner ? "owner" : "employee";
  const status = resolveEmployeeStatus(employee);
  const loginEnabled = isOwner || resolveEmployeeLoginEnabled(employee);
  return { uid: currentUser?.uid || null, companyId: company?.id || company?.companyId || null,
    employeeFirestoreId: isOwner ? null : employee?.id || employee?.firestoreId || null,
    employeeId: isOwner ? null : employee?.employeeId || employee?.login?.employeeId || null,
    employeeName: isOwner ? company?.ownerName || company?.companyName || "Owner" : employee?.personalInfo?.fullName || employee?.name || "Employee",
    isOwner, isEmployee: !isOwner, accountType, roleId, roleLevel: Number(role?.level ?? DEFAULT_ROLE_LEVELS[roleId] ?? 10), permissions, status, loginEnabled, active: isOwner || (loginEnabled && ["active", "enabled"].includes(String(status || "").toLowerCase())), requirePasswordChange: !isOwner && Boolean(employee?.access?.requirePasswordChange ?? employee?.requirePasswordChange), policyAccepted: isOwner || employee?.access?.policyAccepted !== false, teamId: employee?.reporting?.teamId || employee?.employment?.teamId || null, reportsTo: employee?.reporting?.reportsTo || employee?.employment?.reportsTo || null };
}
export const can = (access, permission) => Boolean(access?.isOwner || !permission || access?.permissions?.includes(permission));
export const canAccessPath = (access, pathname) => can(access, permissionForPath(pathname));

export function defaultRouteForAccess(access) {
  const routes = ["/manager", "/manager/userManagement", "/manager/Workforce/attendance", "/manager/performance", "/manager/projects", "/manager/expenses", "/manager/advance", "/manager/billing", "/manager/quotation-builder", "/manager/purchase-orders", "/manager/notifications"];
  return routes.find((route) => canAccessPath(access, route)) || "/manager";
}
