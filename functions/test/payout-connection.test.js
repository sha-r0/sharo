"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { assertCompanyScope, authorizePayoutSettings, validatePayoutSettingsInput } = require("../src/payout/PayoutPolicy");
const { configurationFingerprint, evaluateConnection } = require("../src/payout/PayoutConnectionService");
const { PayoutCredentialResolver } = require("../src/payout/PayoutCredentialResolver");
const CashfreePayoutProvider = require("../src/payout/providers/CashfreePayoutProvider");

const ownerA = { uid: "owner-a", companyId: "company-a", isOwner: true, permissions: [] };
const employeeA = { uid: "employee-a", companyId: "company-a", isOwner: false, permissions: ["advance.create"] };
const configured = { provider: "cashfree", environment: "sandbox", authMode: "PARTNER", merchantId: "merchant-a", status: "CONFIGURED" };
const credentials = { token: "server-only" };
const resolver = new PayoutCredentialResolver({ partnerCredentialProvider: { getCredentials: async () => credentials } });

test("employee cannot verify payout connection", () => {
  assert.throws(() => authorizePayoutSettings(employeeA), /FORBIDDEN/);
});

test("Company A cannot verify Company B payout configuration", () => {
  assert.throws(() => assertCompanyScope(ownerA, "company-b"), /BROWSER_COMPANY_ID_FORBIDDEN/);
});

test("incomplete payout configuration is rejected safely", async () => {
  const outcome = await evaluateConnection({ companyId: "company-a", settings: { provider: "cashfree", environment: "sandbox" }, credentialResolver: resolver, provider: { verifyConnection: async () => ({ ok: true }) } });
  assert.equal(outcome.status, "NOT_CONNECTED");
  assert.equal(outcome.code, "INCOMPLETE_CONFIG");
});

test("resolved secrets are never returned", async () => {
  const outcome = await evaluateConnection({ companyId: "company-a", settings: configured, credentialResolver: resolver, provider: { verifyConnection: async (_config, received) => ({ ok: received === credentials }) } });
  assert.equal(outcome.status, "CONNECTED");
  assert.equal(Object.hasOwn(outcome, "credentials"), false);
  assert.equal(JSON.stringify(outcome).includes("server-only"), false);
});

test("browser cannot force VERIFIED, payoutsEnabled, or secretRef", () => {
  for (const input of [{ status: "VERIFIED" }, { payoutsEnabled: true }, { secretRef: "secret-a" }]) {
    assert.throws(() => validatePayoutSettingsInput(input));
  }
});

test("successful mocked verification becomes CONNECTED", async () => {
  const outcome = await evaluateConnection({ companyId: "company-a", settings: configured, credentialResolver: resolver, provider: { verifyConnection: async () => ({ ok: true }) } });
  assert.equal(outcome.status, "CONNECTED");
  assert.equal(outcome.ok, true);
});

test("failed mocked verification becomes ERROR", async () => {
  const outcome = await evaluateConnection({ companyId: "company-a", settings: configured, credentialResolver: resolver, provider: { verifyConnection: async () => ({ ok: false, code: "AUTH_FAILED" }) } });
  assert.equal(outcome.status, "ERROR");
  assert.equal(outcome.code, "AUTH_FAILED");
});

test("unconfigured Cashfree verification returns structured NOT_CONFIGURED", async () => {
  const outcome = await evaluateConnection({ companyId: "company-a", settings: { ...configured, authMode: "PARTNER" }, credentialResolver: resolver, provider: new CashfreePayoutProvider(() => null) });
  assert.equal(outcome.status, "CONFIGURED");
  assert.equal(outcome.code, "NOT_CONFIGURED");
  assert.equal(outcome.ok, false);
});

test("duplicate successful verification is idempotent", async () => {
  let calls = 0;
  const settings = { ...configured };
  settings.verificationFingerprint = configurationFingerprint("company-a", settings);
  settings.status = "CONNECTED";
  const outcome = await evaluateConnection({ companyId: "company-a", settings, credentialResolver: resolver, provider: { verifyConnection: async () => { calls += 1; return { ok: true }; } } });
  assert.equal(outcome.status, "CONNECTED");
  assert.equal(outcome.idempotent, true);
  assert.equal(calls, 0);
});
