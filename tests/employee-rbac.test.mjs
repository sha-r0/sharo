import test from "node:test";
import assert from "node:assert/strict";
import { buildEmployeeLoginEmail, canonicalEmployeeId, employeeMatchesIdentifier, normalizeEmployeeId, resolveEmployeeRoleId, resolvePermissionOverrides } from "../src/app/allservice/rbac/employeeAuth.js";
import { calculateEffectivePermissions } from "../src/app/allservice/rbac/permissionCatalog.js";
import { ALL_PERMISSIONS, ROUTE_PERMISSIONS } from "../src/app/allservice/rbac/permissionCatalog.js";
import { can, canAccessPath, resolveAccess } from "../src/app/allservice/rbac/AuthorizationService.js";

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

test("verified company owner receives every permission despite missing employee access and deny overrides", () => {
  const access = resolveAccess({
    currentUser: { uid: "owner-a" },
    company: { id: "company-a", ownerUid: "owner-a" },
    employee: { access: { permissionOverrides: { deny: [...ALL_PERMISSIONS] }, effectivePermissions: [] } },
    role: null,
  });

  assert.equal(access.isOwner, true);
  assert.equal(access.roleId, "owner");
  assert.deepEqual(access.permissions, ALL_PERMISSIONS);
  assert.equal(can(access, "future-company-module.manage"), true);
  for (const permission of ALL_PERMISSIONS) assert.equal(can(access, permission), true, permission);
});

test("verified company owner can access every registered manager route", () => {
  const access = resolveAccess({ currentUser: { uid: "owner-a" }, company: { ownerUid: "owner-a" }, employee: null, role: null });
  for (const [route] of ROUTE_PERMISSIONS) assert.equal(canAccessPath(access, route), true, route);
});

test("owner role spoofing cannot grant owner access or bypass denied permissions", () => {
  const access = resolveAccess({
    currentUser: { uid: "employee-a", role: "owner" },
    company: { id: "company-a", ownerUid: "owner-a" },
    employee: { access: { roleId: "owner", effectivePermissions: ["projects.view"] } },
    role: { id: "owner", permissions: ALL_PERMISSIONS },
  });

  assert.equal(access.isOwner, false);
  assert.equal(access.roleId, "employee");
  assert.equal(can(access, "projects.view"), true);
  assert.equal(can(access, "employee.delete"), false);
  assert.equal(can(access, "future-company-module.manage"), false);
});

test("owner identity is scoped to the company whose ownerUid matches", () => {
  const companyA = resolveAccess({ currentUser: { uid: "owner-a" }, company: { id: "company-a", ownerUid: "owner-a" }, employee: null, role: null });
  const companyB = resolveAccess({ currentUser: { uid: "owner-a", role: "owner" }, company: { id: "company-b", ownerUid: "owner-b" }, employee: null, role: null });
  assert.equal(companyA.isOwner, true);
  assert.equal(companyB.isOwner, false);
  assert.equal(can(companyB, "company.manage"), false);
});
