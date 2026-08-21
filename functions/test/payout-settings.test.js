"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertCompanyScope,
  authorizePayoutSettings,
  validatePayoutSettingsInput,
} = require("../src/payout/PayoutPolicy");
const { publicSettings } = require("../src/payout/PayoutSettingsService");

const ownerA = { uid: "owner-a", companyId: "company-a", isOwner: true, permissions: [] };
const adminA = { uid: "admin-a", companyId: "company-a", isOwner: false, permissions: ["company.manage"] };
const employeeA = { uid: "employee-a", companyId: "company-a", isOwner: false, permissions: ["advance.create"] };

test("Company A cannot read or update Company B payout settings", () => {
  assert.throws(() => assertCompanyScope(ownerA, "company-b"), /BROWSER_COMPANY_ID_FORBIDDEN/);
  assert.throws(() => assertCompanyScope(adminA, "company-b"), /BROWSER_COMPANY_ID_FORBIDDEN/);
});

test("employee cannot update payout settings", () => {
  assert.throws(() => authorizePayoutSettings(employeeA), /FORBIDDEN/);
});

test("authorized owner and admin can configure their own company", () => {
  assert.equal(assertCompanyScope(ownerA), "company-a");
  assert.equal(assertCompanyScope(adminA), "company-a");
  assert.deepEqual(validatePayoutSettingsInput({ provider: "cashfree", environment: "sandbox", authMode: "PARTNER", merchantId: "merchant_a" }), {
    provider: "cashfree", environment: "sandbox", authMode: "PARTNER", merchantId: "merchant_a",
  });
});

test("secret fields cannot be written or returned", () => {
  for (const field of ["secretRef", "clientSecret", "apiKey", "credentials"]) {
    assert.throws(() => validatePayoutSettingsInput({ [field]: "sensitive" }), /SECRET_FIELD_FORBIDDEN/);
  }
  const result = publicSettings({ provider: "cashfree", secretRef: "projects/x/secrets/company-a" });
  assert.equal(Object.hasOwn(result, "secretRef"), false);
  assert.equal(result.hasSecretRef, true);
});

test("browser-provided companyId is rejected even when it matches", () => {
  assert.throws(() => assertCompanyScope(ownerA, "company-a"), /BROWSER_COMPANY_ID_FORBIDDEN/);
  assert.throws(() => validatePayoutSettingsInput({ companyId: "company-a" }), /INVALID_PAYOUT_FIELD/);
});
