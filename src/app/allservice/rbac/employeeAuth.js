export function normalizeCorporateId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeEmployeeId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function buildEmployeeLoginEmail(corporateId, employeeId) {
  const companyPart = normalizeCorporateId(corporateId);
  const employeePart = normalizeEmployeeId(employeeId);
  if (!companyPart || !employeePart) throw new Error("Corporate ID and Employee ID are required.");
  return `${companyPart}.${employeePart}@auth.sharo.in`;
}

export function resolveEmployeeAuthUid(employee = {}) {
  return employee?.access?.authUid || employee?.authUid || null;
}

export function resolveEmployeeRoleId(employee = {}, currentUser = {}) {
  return employee?.access?.roleId || employee?.roleId || employee?.employment?.role || currentUser?.role || "employee";
}

export function resolvePermissionOverrides(employee = {}) {
  const overrides = employee?.access?.permissionOverrides || employee?.permissionOverrides || {};
  return { grant: Array.isArray(overrides.grant) ? overrides.grant : [], deny: Array.isArray(overrides.deny) ? overrides.deny : [] };
}

export function resolveEmployeeLoginEnabled(employee = {}) {
  return employee?.access?.loginEnabled ?? employee?.loginEnabled ?? true;
}

export function resolveEmployeeStatus(employee = {}) {
  return String(employee?.access?.status || employee?.status || employee?.employment?.status || "active").trim().toLowerCase();
}

export function isActiveEmployee(employee = {}) {
  return resolveEmployeeLoginEnabled(employee) !== false && resolveEmployeeStatus(employee) === "active" && String(employee?.employment?.status || "active").trim().toLowerCase() === "active";
}
