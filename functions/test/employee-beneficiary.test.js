"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CashfreePayoutProvider = require("../src/payout/providers/CashfreePayoutProvider");
const {
  assertVerifiedMerchantSettings,
  authorizeBeneficiarySync,
  bankFingerprint,
  beneficiaryId,
  isBeneficiaryPayoutReady,
  normalizeBankDetails,
  normalizeProviderBeneficiary,
  reconcileBeneficiary,
  syncEmployeePayoutBeneficiary,
  validateSyncInput,
} = require("../src/payout/EmployeeBeneficiaryService");

const bank = { accountHolderName: "Jane Doe", accountNumber: "1234567890", ifsc: "HDFC0001234" };
const providerRecord = (id, status = "VERIFIED") => ({
  beneficiary_id: id,
  beneficiary_status: status,
  beneficiary_instrument_details: { bank_account_number: bank.accountNumber, bank_ifsc: bank.ifsc },
});
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test("Company A cannot supply Company B scope", () => {
  assert.throws(() => validateSyncInput({ employeeFirestoreId: "employee-b", companyId: "company-b" }), /INVALID_BENEFICIARY_INPUT/);
});

test("employee bank data comes only from the Firestore employee record", () => {
  assert.throws(() => validateSyncInput({ employeeFirestoreId: "employee-b", accountNumber: bank.accountNumber }), /INVALID_BENEFICIARY_INPUT/);
  assert.deepEqual(normalizeBankDetails({ bankDetails: bank }), bank);
});

test("invalid employee bank details are rejected", () => {
  assert.throws(() => normalizeBankDetails({ bankDetails: { ...bank, accountNumber: "12" } }), /INVALID_ACCOUNT_NUMBER/);
  assert.throws(() => normalizeBankDetails({ bankDetails: { ...bank, ifsc: "BAD" } }), /INVALID_IFSC/);
  assert.throws(() => normalizeBankDetails({ bankDetails: { ...bank, accountHolderName: "" } }), /INVALID_ACCOUNT_HOLDER_NAME/);
});

test("unauthorized employee cannot synchronize beneficiaries", () => {
  assert.throws(() => authorizeBeneficiarySync({ uid: "employee-a", companyId: "company-a", employeeId: "employee-a", permissions: [] }), /FORBIDDEN/);
});

test("unverified company payout account is rejected", () => {
  assert.throws(() => assertVerifiedMerchantSettings({ status: "CONFIGURED", payoutsEnabled: false, authMode: "MERCHANT" }), /PAYOUT_CONNECTION_REQUIRED/);
  assert.throws(() => assertVerifiedMerchantSettings({ status: "CONNECTED", payoutsEnabled: true, authMode: "PARTNER" }), /PAYOUT_CONNECTION_REQUIRED/);
});

test("beneficiary ID is deterministic, safe, and changes with bank fingerprint", () => {
  const first = beneficiaryId("company-a", "employee-a", bankFingerprint(bank));
  const retry = beneficiaryId("company-a", "employee-a", bankFingerprint(bank));
  const changed = beneficiaryId("company-a", "employee-a", bankFingerprint({ ...bank, accountNumber: "9999999999" }));
  assert.equal(first, retry);
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.ok(first.length <= 50);
  assert.notEqual(first, changed);
  assert.equal(first.includes(bank.accountNumber), false);
});

test("valid mocked Cashfree beneficiary becomes VERIFIED", async () => {
  const id = beneficiaryId("company-a", "employee-a", bankFingerprint(bank));
  let request;
  const provider = new CashfreePayoutProvider(null, async (url, options) => {
    request = { url: String(url), options };
    return options.method === "GET" ? response(404, {}) : response(201, providerRecord(id));
  });
  const result = await reconcileBeneficiary(provider, { environment: "sandbox" }, { clientId: "id", clientSecret: "secret" }, { beneficiaryId: id, ...bank });
  assert.equal(result.status, "VERIFIED");
  assert.equal(result.idempotent, false);
  assert.equal(request.url, "https://sandbox.cashfree.com/payout/beneficiary");
  assert.equal(request.options.headers["x-api-version"], "2024-01-01");
});

test("INITIATED beneficiary remains not payout-ready", () => {
  const fingerprint = bankFingerprint(bank);
  const employee = { bankDetails: bank, payoutBeneficiary: { provider: "cashfree", status: "INITIATED", bankFingerprint: fingerprint } };
  assert.equal(normalizeProviderBeneficiary(providerRecord("bene", "INITIATED")).status, "INITIATED");
  assert.equal(isBeneficiaryPayoutReady(employee), false);
});

test("duplicate sync is idempotent and does not create another beneficiary", async () => {
  const id = beneficiaryId("company-a", "employee-a", bankFingerprint(bank));
  let creates = 0;
  const provider = {
    getBeneficiary: async () => ({ ok: true, beneficiary: providerRecord(id) }),
    createBeneficiary: async () => { creates += 1; return { ok: true, beneficiary: providerRecord(id) }; },
  };
  const result = await reconcileBeneficiary(provider, { environment: "sandbox" }, {}, { beneficiaryId: id, ...bank });
  assert.equal(result.beneficiaryId, id);
  assert.equal(result.idempotent, true);
  assert.equal(creates, 0);
});

test("bank change invalidates the previous beneficiary fingerprint", () => {
  const employee = { bankDetails: bank, payoutBeneficiary: { provider: "cashfree", status: "VERIFIED", bankFingerprint: bankFingerprint(bank) } };
  assert.equal(isBeneficiaryPayoutReady(employee), true);
  employee.bankDetails = { ...bank, ifsc: "SBIN0001234" };
  assert.equal(isBeneficiaryPayoutReady(employee), false);
});

test("credentials and bank account are absent from provider result", async () => {
  const provider = new CashfreePayoutProvider(null, async () => response(200, providerRecord("bene-safe")));
  const result = await provider.getBeneficiary({ environment: "production" }, { clientId: "private-id", clientSecret: "private-secret" }, { beneficiaryId: "bene-safe" });
  const normalized = normalizeProviderBeneficiary(result.beneficiary);
  assert.deepEqual(normalized, { beneficiaryId: "bene-safe", status: "VERIFIED" });
  assert.equal(JSON.stringify(normalized).includes("private-secret"), false);
  assert.equal(JSON.stringify(normalized).includes(bank.accountNumber), false);
});

function syncHarness({ employeeExists = true } = {}) {
  const collections = [];
  let employeeData = { bankDetails: bank };
  const settings = { provider: "cashfree", environment: "sandbox", authMode: "MERCHANT", status: "CONNECTED", payoutsEnabled: true, secretRef: "projects/p/secrets/company-a" };
  const document = (collectionName, id) => ({
    collectionName,
    id,
    get: async () => collectionName === "Usermanagement"
      ? { exists: employeeExists, data: () => employeeData }
      : { exists: true, data: () => settings },
  });
  const companyRef = { id: "company-a", collection: (collectionName) => { collections.push(collectionName); return { doc: (id) => document(collectionName, id) }; } };
  const companySnapshot = { exists: true, data: () => ({ ownerUid: "owner-a" }), ref: companyRef };
  const db = {
    collection: () => ({ doc: () => ({ ...companyRef, get: async () => companySnapshot }) }),
    runTransaction: async (work) => work({
      get: async (ref) => ref.collectionName === "Usermanagement"
        ? { exists: employeeExists, data: () => employeeData }
        : { exists: true, data: () => settings },
      update: (ref, value) => { if (ref.collectionName === "Usermanagement") employeeData = { ...employeeData, ...value }; },
      set: () => {},
    }),
  };
  return { collections, db, get employee() { return employeeData; }, request: { auth: { uid: "owner-a", token: { companyId: "company-a" } }, data: { employeeFirestoreId: "employee-a" } } };
}

test("valid backend sync stores only safe beneficiary metadata and creates no payout", async () => {
  const harness = syncHarness();
  let creates = 0;
  const result = await syncEmployeePayoutBeneficiary(harness.db, harness.request, {
    credentialResolver: { resolve: async (_settings, context) => ({ configured: context.companyId === "company-a", authMode: "MERCHANT", credentials: { clientId: "private", clientSecret: "private" } }) },
    provider: {
      getBeneficiary: async () => ({ ok: false, code: "BENEFICIARY_NOT_FOUND" }),
      createBeneficiary: async (_config, _credentials, desired) => { creates += 1; return { ok: true, beneficiary: providerRecord(desired.beneficiaryId) }; },
    },
  });
  assert.equal(result.payoutReady, true);
  assert.equal(result.environment, "sandbox");
  assert.equal(creates, 1);
  assert.equal(harness.employee.payoutBeneficiary.status, "VERIFIED");
  assert.equal(harness.employee.payoutBeneficiary.environment, "sandbox");
  assert.equal(Object.hasOwn(harness.employee.payoutBeneficiary, "accountNumber"), false);
  assert.equal(JSON.stringify(harness.employee.payoutBeneficiary).includes(bank.accountNumber), false);
  assert.equal(harness.collections.includes("Payouts"), false);
});

test("Company A cannot synchronize a Company B employee", async () => {
  const harness = syncHarness({ employeeExists: false });
  harness.request.data.employeeFirestoreId = "company-b-employee";
  await assert.rejects(syncEmployeePayoutBeneficiary(harness.db, harness.request, {
    credentialResolver: { resolve: async () => assert.fail("credentials must not resolve") },
    provider: {},
  }), /EMPLOYEE_NOT_FOUND/);
});
