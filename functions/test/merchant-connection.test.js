"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { GoogleSecretManagerStore } = require("../src/payout/GoogleSecretManagerStore");
const CashfreePayoutProvider = require("../src/payout/providers/CashfreePayoutProvider");
const { connectMerchantPayout, disconnectedSettings, disconnectMerchantPayout, failedSettings, sanitizedResult, validateConnectInput, verifiedSettings } = require("../src/payout/MerchantConnectionService");
const { assertCompanyScope, authorizePayoutSettings } = require("../src/payout/PayoutPolicy");

function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function companyHarness(settingsData = null) {
  const writes = [];
  let current = settingsData;
  const reference = (collectionName, id) => ({ collectionName, id });
  const companyRef = {
    id: "company-a",
    collection: (collectionName) => ({
      doc: (id) => ({ ...reference(collectionName, id), get: async () => collectionName === "PayoutSettings"
        ? { exists: Boolean(current), data: () => current || {} }
        : { exists: false, data: () => ({}) } }),
    }),
  };
  const companySnapshot = { exists: true, data: () => ({ ownerUid: "owner-a" }), ref: companyRef };
  const db = {
    collection: () => ({ doc: () => ({ ...companyRef, get: async () => companySnapshot }) }),
    runTransaction: async (work) => work({
      get: async () => ({ exists: Boolean(current), data: () => current || {} }),
      set: (ref, value) => { writes.push({ operation: "set", ref, value }); if (ref.collectionName === "PayoutSettings") current = value; },
      update: (ref, value) => { writes.push({ operation: "update", ref, value }); if (ref.collectionName === "PayoutSettings") current = { ...current, ...value }; },
    }),
  };
  return { db, get settings() { return current; }, request: { auth: { uid: "owner-a", token: { companyId: "company-a" } }, data: { clientId: "client-a", clientSecret: "secret-a", environment: "sandbox" } }, writes };
}

test("Company A can connect only its own payout settings", async () => {
  const harness = companyHarness();
  const stagedCompanies = [];
  harness.request.data.publicKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnExampleKeyForTestsOnly\n-----END PUBLIC KEY-----";
  harness.request.data.authMode = "PUBLIC_KEY";
  const result = await connectMerchantPayout(harness.db, harness.request, {
    secretStore: { stageCredentials: async (companyId) => { stagedCompanies.push(companyId); return { secretRef: "projects/p/secrets/company-a", versionName: "versions/1" }; }, activateVersion: async () => {}, discardVersion: async () => {} },
    provider: { verifyConnection: async () => ({ ok: true }) },
  });
  assert.equal(result.status, "CONNECTED");
  assert.deepEqual(stagedCompanies, ["company-a"]);
  assert.equal(harness.settings.status, "CONNECTED");
  assert.equal(harness.settings.payoutsEnabled, true);
  assert.equal(harness.settings.secretRef, "projects/p/secrets/company-a");
  assert.equal(harness.settings.authMode, "PUBLIC_KEY");
  assert.equal(JSON.stringify(harness.writes).includes("publicKey"), false);
  assert.equal(JSON.stringify(harness.writes).includes("secret-a"), false);
  assert.equal(harness.writes.some((write) => write.ref?.collectionName === "Payouts"), false);
});

test("invalid credentials never mark payout settings connected", async () => {
  const harness = companyHarness();
  const result = await connectMerchantPayout(harness.db, harness.request, {
    secretStore: { stageCredentials: async () => ({ secretRef: "projects/p/secrets/company-a", versionName: "versions/1" }), activateVersion: async () => assert.fail("invalid credentials must not activate"), discardVersion: async () => {} },
    provider: { verifyConnection: async () => ({ ok: false, code: "INVALID_CREDENTIALS" }) },
  });
  assert.equal(result.verified, false);
  assert.notEqual(harness.settings.status, "CONNECTED");
  assert.equal(harness.settings.payoutsEnabled, false);
});

test("invalid public key is rejected", async () => {
  const harness = companyHarness();
  harness.request.data.publicKey = "not-a-valid-key";
  harness.request.data.authMode = "PUBLIC_KEY";
  await assert.rejects(connectMerchantPayout(harness.db, harness.request, {
    secretStore: { stageCredentials: async () => ({ secretRef: "projects/p/secrets/company-a", versionName: "versions/1" }), activateVersion: async () => {}, discardVersion: async () => {} },
    provider: { verifyConnection: async () => assert.fail("invalid public key must not verify") },
  }), /INVALID_PUBLIC_KEY|INVALID_CONNECTION_INPUT/);
});

test("disconnect changes only the authenticated company settings", async () => {
  const harness = companyHarness({ status: "CONNECTED", payoutsEnabled: true, secretRef: "projects/p/secrets/company-a" });
  harness.request.data = {};
  await disconnectMerchantPayout(harness.db, harness.request);
  assert.equal(harness.settings.status, "NOT_CONNECTED");
  assert.equal(harness.settings.payoutsEnabled, false);
  assert.equal(harness.settings.secretRef, "projects/p/secrets/company-a");
});

test("Company A Secret Manager reference is isolated from Company B", () => {
  const store = new GoogleSecretManagerStore({ client: {}, projectId: "project-test" });
  const companyA = store.secretRefForCompany("company-a");
  const companyB = store.secretRefForCompany("company-b");
  assert.notEqual(companyA, companyB);
  assert.throws(() => store.assertCompanyReference(companyA, "company-b"), /SECRET_COMPANY_MISMATCH/);
});

test("credentials are excluded from Firestore settings", () => {
  const credentials = validateConnectInput({ clientId: "client-a", clientSecret: "secret-a", environment: "sandbox" });
  const stored = verifiedSettings({}, credentials, "projects/p/secrets/company-a");
  assert.equal(Object.hasOwn(stored, "clientId"), false);
  assert.equal(Object.hasOwn(stored, "clientSecret"), false);
  assert.equal(JSON.stringify(stored).includes("secret-a"), false);
});

test("valid mocked Cashfree verification succeeds", async () => {
  let request;
  const provider = new CashfreePayoutProvider(() => null, async (url, options) => {
    request = { url, options };
    return response(200, { status: "SUCCESS", subCode: "200" });
  });
  const result = await provider.verifyConnection({ environment: "sandbox", authMode: "MERCHANT" }, { clientId: "client-a", clientSecret: "secret-a" });
  assert.equal(result.ok, true);
  assert.equal(result.code, "VERIFIED");
  assert.equal(String(request.url).startsWith("https://sandbox.cashfree.com/payout/beneficiary?beneficiary_id=SHARO_VERIFY_"), true);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers["x-api-version"], "2024-01-01");
});

test("invalid mocked Cashfree credentials return ERROR result", async () => {
  const provider = new CashfreePayoutProvider(() => null, async () => response(403, { status: "ERROR" }));
  const result = await provider.verifyConnection({ environment: "production", authMode: "MERCHANT" }, { clientId: "bad", clientSecret: "bad" });
  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_CREDENTIALS");
});

test("sanitized result never returns a secret", () => {
  const result = sanitizedResult(true, "CONNECTED", "Connected");
  assert.deepEqual(Object.keys(result).sort(), ["message", "status", "verified"]);
  assert.equal(JSON.stringify(result).includes("clientSecret"), false);
});

test("unauthorized employee is blocked", () => {
  assert.throws(() => authorizePayoutSettings({ uid: "employee", companyId: "company-a", permissions: [] }), /FORBIDDEN/);
});

test("browser companyId is rejected", () => {
  assert.throws(() => assertCompanyScope({ uid: "owner", companyId: "company-a", isOwner: true }, "company-a"), /BROWSER_COMPANY_ID_FORBIDDEN/);
  assert.throws(() => validateConnectInput({ companyId: "company-a", clientId: "a", clientSecret: "b", environment: "sandbox" }), /INVALID_CONNECTION_INPUT/);
});

test("failed reconnect preserves the previous valid connection", () => {
  const previous = { status: "CONNECTED", payoutsEnabled: true, secretRef: "projects/p/secrets/company-a", environment: "sandbox", authMode: "MERCHANT" };
  const next = failedSettings(previous, { environment: "production" }, { code: "INVALID_CREDENTIALS" }, true);
  assert.equal(next.status, "CONNECTED");
  assert.equal(next.payoutsEnabled, true);
  assert.equal(next.secretRef, previous.secretRef);
  assert.equal(next.environment, "sandbox");
  assert.equal(next.lastConnectionAttemptStatus, "ERROR");
});

test("disconnect disables payouts without deleting the secret reference", () => {
  const previous = { secretRef: "projects/p/secrets/company-a", payoutsEnabled: true, status: "CONNECTED" };
  const next = { ...previous, ...disconnectedSettings() };
  assert.equal(next.status, "NOT_CONNECTED");
  assert.equal(next.payoutsEnabled, false);
  assert.equal(next.secretRef, previous.secretRef);
});
