"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { hasCompanyPermission, requireCompanyPermission } = require("../src/auth/CompanyActor");

test("verified owner bypasses all current and future company permission names", () => {
  const owner = { uid: "owner-a", companyId: "company-a", isOwner: true, permissions: [] };
  assert.equal(hasCompanyPermission(owner, "employee.delete"), true);
  assert.equal(hasCompanyPermission(owner, "future-module.manage"), true);
  assert.doesNotThrow(() => requireCompanyPermission(owner, "payroll.manage"));
});

test("an owner role string alone does not bypass Cloud Functions permissions", () => {
  const spoofed = { uid: "employee-a", companyId: "company-a", isOwner: false, roleId: "owner", permissions: ["projects.view"] };
  assert.equal(hasCompanyPermission(spoofed, "projects.view"), true);
  assert.equal(hasCompanyPermission(spoofed, "employee.delete"), false);
  assert.throws(() => requireCompanyPermission(spoofed, "employee.delete"), /FORBIDDEN/);
});
