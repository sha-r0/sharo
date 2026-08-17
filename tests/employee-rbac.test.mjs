import test from "node:test";
import assert from "node:assert/strict";
import { buildEmployeeLoginEmail, normalizeEmployeeId, resolveEmployeeRoleId, resolvePermissionOverrides } from "../src/app/allservice/rbac/employeeAuth.js";
import { calculateEffectivePermissions } from "../src/app/allservice/rbac/permissionCatalog.js";

test("employee login email preserves leading zeroes and normalizes corporate identifiers", () => {
  assert.equal(normalizeEmployeeId(" 00000015 "), "00000015");
  assert.equal(buildEmployeeLoginEmail(" Troynoy-A 3889 ", " 00000015 "), "troynoya3889.00000015@auth.sharo.in");
});

test("permission denials win over role and employee grants", () => {
  assert.deepEqual(calculateEffectivePermissions({ rolePermissions: ["dashboard.view", "employee.view"], grantedPermissions: ["payroll.view", "employee.view"], deniedPermissions: ["employee.view"] }).sort(), ["dashboard.view", "payroll.view"]);
});

test("legacy employee access locations remain readable", () => {
  assert.equal(resolveEmployeeRoleId({ roleId: "team_leader" }), "team_leader");
  assert.deepEqual(resolvePermissionOverrides({ permissionOverrides: { grant: ["projects.view"], deny: ["payroll.view"] } }), { grant: ["projects.view"], deny: ["payroll.view"] });
});

test("employee compatibility resolvers tolerate a missing employee session", () => {
  assert.equal(resolveEmployeeRoleId(null, null), "employee");
  assert.deepEqual(resolvePermissionOverrides(null), { grant: [], deny: [] });
});
