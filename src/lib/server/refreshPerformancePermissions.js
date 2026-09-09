import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { calculateEffectivePermissions, normalizeRoleId, permissionsForRole } from "@/app/allservice/rbac/permissionCatalog";
import { isActiveEmployee, resolveEmployeeAuthUid, resolveEmployeeRoleId, resolvePermissionOverrides } from "@/app/allservice/rbac/employeeAuth";

// Targeted backfill of the existing authoritative snapshot, not an access
// fallback. Tenant role documents take precedence over built-in templates,
// exactly as in the existing RBAC user/role update endpoints.
export async function refreshPerformancePermissions(companyId, employeeId, uid) {
  const companyRef = adminDb.collection("Companies").doc(companyId);
  const employeeRef = companyRef.collection("Usermanagement").doc(employeeId);
  await adminDb.runTransaction(async (transaction) => {
    const company = await transaction.get(companyRef);
    const snapshot = await transaction.get(employeeRef);
    if (!company.exists || !snapshot.exists) return;
    const employee = snapshot.data();
    if (resolveEmployeeAuthUid(employee) !== uid || !isActiveEmployee(employee)) return;
    if (String(company.data().serviceStatus || "active").toLowerCase() !== "active") return;
    const stored = employee.access?.effectivePermissions;
    // Missing snapshots require the existing full user provisioning flow;
    // never create a partial snapshot containing only Performance permissions.
    if (!Array.isArray(stored)) return;
    const roleId = normalizeRoleId(resolveEmployeeRoleId(employee));
    if (roleId === "owner") return; // An employee role cannot confer ownership.
    const role = await transaction.get(companyRef.collection("Roles").doc(roleId));
    if (role.exists && role.data().isActive === false) return;
    const rolePermissions = role.data()?.permissions || permissionsForRole(roleId);
    const overrides = resolvePermissionOverrides(employee);
    const effective = calculateEffectivePermissions({ rolePermissions, grantedPermissions: overrides.grant, deniedPermissions: overrides.deny });
    const missing = ["performance.view", "performance.manage"].filter(permission => effective.includes(permission) && !stored.includes(permission));
    if (!missing.length) return;
    transaction.update(employeeRef, {
      "access.effectivePermissions": [...stored, ...missing],
      "access.permissionsUpdatedAt": FieldValue.serverTimestamp(),
    });
    transaction.set(companyRef.collection("ActivityLogs").doc(), {
      type: "employee.permissions-changed", actorId: uid, companyId,
      before: { permissions: stored }, after: { permissions: [...stored, ...missing] },
      metadata: { employeeId, roleId, reason: "performance-permission-snapshot-refresh" },
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}
