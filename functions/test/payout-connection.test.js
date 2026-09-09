"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { assertCompanyScope, authorizePayoutSettings, validatePayoutSettingsInput } = require("../src/payout/PayoutPolicy");
const { configurationFingerprint, evaluateConnection } = require("../src/payout/PayoutConnectionService");
const { PayoutCredentialResolver } = require("../src/payout/PayoutCredentialResolver");
const CashfreePayoutProvider = require("../src/payout/providers/CashfreePayoutProvider");
const { publicKeySignature } = require("../src/payout/providers/CashfreePayoutProvider");

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

test("Cashfree V2 sandbox verification uses beneficiary lookup and treats authenticated not-found as connected", async () => {
  let request;
  const provider = new CashfreePayoutProvider(() => null, async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: false,
      status: 404,
      json: async () => ({ code: "beneficiary_not_found" }),
    };
  });
  const outcome = await provider.verifyConnection({ environment: "sandbox", authMode: "MERCHANT" }, { clientId: "id", clientSecret: "secret" });
  assert.equal(outcome.ok, true);
  assert.equal(outcome.code, "VERIFIED");
  assert.equal(request.url.startsWith("https://sandbox.cashfree.com/payout/beneficiary?beneficiary_id=SHARO_VERIFY_"), true);
  assert.equal(request.options.method, "GET");
  assert.equal(request.options.headers["x-client-id"], "id");
  assert.equal(request.options.headers["x-client-secret"], "secret");
  assert.equal(request.options.headers["x-api-version"], "2024-01-01");
});

test("Cashfree V2 verification rejects unexpected 404 and invalid credentials", async () => {
  const notFoundProvider = new CashfreePayoutProvider(() => null, async () => ({
    ok: false,
    status: 404,
    json: async () => ({ code: "something_else" }),
  }));
  const invalidProvider = new CashfreePayoutProvider(() => null, async () => ({
    ok: false,
    status: 401,
    json: async () => ({ code: "invalid_credentials" }),
  }));
  const notFound = await notFoundProvider.verifyConnection({ environment: "sandbox", authMode: "MERCHANT" }, { clientId: "id", clientSecret: "secret" });
  const invalid = await invalidProvider.verifyConnection({ environment: "sandbox", authMode: "MERCHANT" }, { clientId: "id", clientSecret: "secret" });
  assert.equal(notFound.ok, false);
  assert.equal(notFound.code, "PROVIDER_ERROR");
  assert.equal(invalid.ok, false);
  assert.equal(invalid.code, "INVALID_CREDENTIALS");
});

test("Cashfree PUBLIC_KEY requests generate a fresh RSA-OAEP x-cf-signature", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  let request;
  const provider = new CashfreePayoutProvider(() => null, async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      status: 200,
      json: async () => ({ status: "SUCCESS", subCode: "200" }),
    };
  }, { nowProvider: () => 1720000000 });
  const outcome = await provider.verifyConnection({ environment: "sandbox", authMode: "PUBLIC_KEY" }, { clientId: "client-a", clientSecret: "secret-a", publicKey });
  assert.equal(outcome.ok, true);
  assert.equal(request.options.headers["x-api-version"], "2024-01-01");
  assert.equal(typeof request.options.headers["x-cf-signature"], "string");
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }, Buffer.from(request.options.headers["x-cf-signature"], "base64")).toString("utf8");
  assert.equal(decrypted, "client-a.1720000000");
  const second = publicKeySignature({ clientId: "client-a", clientSecret: "secret-a", publicKey }, () => 1720000001);
  const secondDecrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }, Buffer.from(second, "base64")).toString("utf8");
  assert.equal(secondDecrypted, "client-a.1720000001");
});
