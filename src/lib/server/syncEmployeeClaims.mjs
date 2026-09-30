// Shared by the login bootstrap and the administrative claims repair.
export async function syncEmployeeClaims(adminAuth, { uid, companyId, employeeFirestoreId, employee }) {
  if (!companyId || !employeeFirestoreId || !uid || (employee.access?.authUid || employee.authUid) !== uid) {
    throw new Error("UID_MISMATCH");
  }
  const roleId = employee.access?.roleId || employee.roleId || employee.employment?.role || "employee";
  const authUser = await adminAuth.getUser(uid);
  const claims = {
    ...(authUser.customClaims || {}),
    companyId,
    companyEmployeeId: employeeFirestoreId,
    roleId,
    accountType: "employee",
    permissionsVersion: Date.now(),
  };
  await adminAuth.setCustomUserClaims(uid, claims);
  return { authUser, claims };
}

// Check Auth itself, not just an old ID token, to avoid repeat writes on refresh.
export async function ensureEmployeeClaims(adminAuth, identity, token = {}) {
  const user = await adminAuth.getUser(identity.uid);
  if (user.disabled) throw Object.assign(new Error("EMPLOYEE_DISABLED"), { code: "auth/user-disabled" });
  const employee = identity.employee;
  if ((employee.access?.authUid || employee.authUid) !== identity.uid) throw new Error("UID_MISMATCH");
  const expected = {
    companyId: identity.companyId,
    companyEmployeeId: identity.employeeFirestoreId,
    roleId: employee.access?.roleId || employee.roleId || employee.employment?.role || "employee",
    accountType: "employee",
  };
  let claims = user.customClaims || {};
  if (Object.entries(expected).some(([key, value]) => claims[key] !== value)
      || !Number.isSafeInteger(claims.permissionsVersion) || claims.permissionsVersion <= 0) {
    ({ claims } = await syncEmployeeClaims(adminAuth, identity));
  }
  return Object.entries(expected).some(([key, value]) => token[key] !== value)
    || token.permissionsVersion !== claims.permissionsVersion;
}
