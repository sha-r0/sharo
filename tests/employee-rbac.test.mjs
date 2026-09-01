import test from "node:test";
import assert from "node:assert/strict";
import { buildEmployeeLoginEmail, canonicalEmployeeId, employeeMatchesIdentifier, normalizeEmployeeId, resolveEmployeeRoleId, resolvePermissionOverrides } from "../src/app/allservice/rbac/employeeAuth.js";
import { calculateEffectivePermissions } from "../src/app/allservice/rbac/permissionCatalog.js";

test("employee login email preserves leading zeroes and normalizes corporate identifiers", () => {
  assert.equal(normalizeEmployeeId(" 00000015 "), "00000015");
  assert.equal(buildEmployeeLoginEmail(" Troynoy-A 3889 ", " 00000015 "), "troynoya3889.00000015@auth.sharo.in");
});

test("canonical numeric employee IDs collide without changing non-numeric IDs", () => {
  assert.equal(canonicalEmployeeId("1"), "1");
  assert.equal(canonicalEmployeeId("01"), "1");
  assert.equal(canonicalEmployeeId("00000001"), "1");
  assert.equal(canonicalEmployeeId(" ABC001 "), "abc001");
});

test("employee login matching supports canonical IDs and exposes ambiguous configurations", () => {
  const employees = [
    { employeeId: "1" },
    { employeeId: "00000001" },
    { employeeId: "ABC001" },
  ];
  assert.equal(employees.filter((employee) => employeeMatchesIdentifier(employee, "01")).length, 2);
  assert.equal(employees.filter((employee) => employeeMatchesIdentifier(employee, "ABC001")).length, 1);
  assert.equal(employees.filter((employee) => employeeMatchesIdentifier(employee, "19")).length, 0);
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
