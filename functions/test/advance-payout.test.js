"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { authorizeDecision } = require("../src/advance/AdvancePolicy");
const {
  assertDispatchEligibility,
  assertTrustedDispatch,
  authorizePayoutInitiation,
  dispatchOperationForStatus,
  initiateAdvancePayout,
  mapTransferStatus,
  outcomeFields,
  transferIdForAdvance,
} = require("../src/payout/AdvancePayoutService");
const { bankFingerprint } = require("../src/payout/EmployeeBeneficiaryService");
const { PayoutCredentialResolver } = require("../src/payout/PayoutCredentialResolver");
const CashfreePayoutProvider = require("../src/payout/providers/CashfreePayoutProvider");

const actor = { uid: "manager-auth", employeeId: "manager-a", companyId: "company-a", permissions: ["advance.approve", "payout.execute"] };
const bank = { accountHolderName: "Jane Doe", accountNumber: "1234567890", ifsc: "HDFC0001234" };
const employee = { bankDetails: bank, payoutBeneficiary: { provider: "cashfree", beneficiaryId: "bene-a", status: "VERIFIED", environment: "sandbox", bankFingerprint: bankFingerprint(bank) } };
const settings = { status: "CONNECTED", payoutsEnabled: true, authMode: "MERCHANT", environment: "sandbox", secretRef: "secret-a" };
const advance = { companyId: "company-a", employeeFirestoreId: "employee-a", status: "Approved", amount: 2500 };
const payout = { status: "QUEUED", amount: 1 };

test("approval creates no payout and leaves payoutStatus NOT_INITIATED", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/advance/AdvanceService.js"), "utf8");
  assert.match(source, /payoutStatus: "NOT_INITIATED"/);
  assert.doesNotMatch(source, /collection\("Payouts"\)|queuedPayoutRecord|transferIdForAdvance/);
});

test("duplicate approval fails and cannot create payout", () => {
  assert.throws(() => authorizeDecision({ actor, advanceCompanyId: "company-a", employeeFirestoreId: "employee-a", status: "Approved", action: "approve" }), /ADVANCE_ALREADY_DECIDED/);
});

test("Company A resolves only Company A credentials", async () => {
  let context;
  const resolver = new PayoutCredentialResolver({ merchantSecretStore: { resolve: async (_ref, value) => { context = value; return { clientId: "company-a-id", clientSecret: "company-a-secret" }; } } });
  const resolved = await resolver.resolve(settings, { companyId: "company-a" });
  assert.equal(context.companyId, "company-a");
  assert.equal(resolved.credentials.clientId, "company-a-id");
});

test("unverified beneficiary is blocked", () => {
  assert.throws(() => assertDispatchEligibility({ advance, payout, settings, employee: { ...employee, payoutBeneficiary: { ...employee.payoutBeneficiary, status: "INITIATED" } } }), /BENEFICIARY_NOT_VERIFIED/);
});

test("changed bank fingerprint is blocked", () => {
  const changed = { ...employee, bankDetails: { ...bank, ifsc: "SBIN0001234" } };
  assert.throws(() => assertDispatchEligibility({ advance, payout, settings, employee: changed }), /BENEFICIARY_BANK_CHANGED/);
});

test("trusted database advance amount is used in the sandbox transfer payload", async () => {
  const eligibility = assertDispatchEligibility({ advance, payout, settings, employee });
  let payload;
  const provider = new CashfreePayoutProvider(null, async (_url, options) => {
    payload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ transfer_id: "transfer-a", status: "RECEIVED", status_code: "RECEIVED" }) };
  });
  await provider.createTransfer({ environment: "sandbox" }, { clientId: "id", clientSecret: "secret" }, { transferId: "transfer-a", amount: eligibility.amount, beneficiaryId: eligibility.beneficiaryId });
  assert.equal(payload.transfer_amount, 2500);
  assert.equal(payload.beneficiary_details.beneficiary_id, "bene-a");
});

test("RECEIVED remains PROCESSING and is never Paid", () => {
  assert.equal(mapTransferStatus({ providerStatus: "RECEIVED", providerStatusCode: "RECEIVED" }), "PROCESSING");
  assert.notEqual(mapTransferStatus({ providerStatus: "RECEIVED" }), "PAID");
});

test("timeout becomes UNKNOWN and retry reconciles instead of creating", () => {
  assert.equal(outcomeFields({ ok: false, certain: false, code: "TRANSFER_OUTCOME_UNKNOWN" }).status, "UNKNOWN");
  assert.equal(dispatchOperationForStatus("UNKNOWN"), "RECONCILE");
  assert.equal(dispatchOperationForStatus("DISPATCHING"), "RECONCILE");
});

test("same company and advance always reuse the same safe transfer ID", () => {
  const first = transferIdForAdvance("company-a", "advance-a");
  assert.equal(first, transferIdForAdvance("company-a", "advance-a"));
  assert.match(first, /^[A-Za-z0-9_-]+$/);
  assert.ok(first.length <= 40);
});

test("production payout dispatch is hard blocked", () => {
  assert.throws(() => assertDispatchEligibility({ advance, payout, settings: { ...settings, environment: "production" }, employee }), /PRODUCTION_DISPATCH_BLOCKED/);
});

test("unauthorized caller cannot invoke payout dispatch", () => {
  assert.throws(() => assertTrustedDispatch("callable"), /UNAUTHORIZED_PAYOUT_DISPATCH/);
  assert.doesNotThrow(() => assertTrustedDispatch("firestore-trigger"));
});

function initiationHarness(overrides = {}) {
  const state = {
    advance: { ...advance, payoutStatus: "NOT_INITIATED", ...overrides.advance },
    employee: { ...employee, ...overrides.employee },
    settings: { ...settings, ...overrides.settings },
    payout: null,
    payoutCreates: 0,
  };
  const document = (collectionName, id) => ({ collectionName, id });
  const companyRef = {
    id: "company-a",
    collection: (collectionName) => ({ doc: (id) => document(collectionName, id) }),
  };
  const snapshot = (value) => ({ exists: value != null, data: () => value });
  const read = (ref) => {
    if (ref.collectionName === "advance_requests") return snapshot(overrides.advanceExists === false ? null : state.advance);
    if (ref.collectionName === "Usermanagement") return snapshot(state.employee);
    if (ref.collectionName === "PayoutSettings") return snapshot(state.settings);
    if (ref.collectionName === "Payouts") return snapshot(state.payout);
    return snapshot(null);
  };
  const companyDoc = {
    ...companyRef,
    get: async () => ({ exists: true, data: () => ({ ownerUid: "owner-a" }), ref: companyRef }),
  };
  const db = {
    collection: (name) => name === "Companies"
      ? { doc: () => companyDoc }
      : { doc: (id) => document(name, id) },
    runTransaction: async (work) => work({
      get: async (ref) => read(ref),
      create: (ref, value) => {
        if (ref.collectionName === "Payouts") {
          if (state.payout) throw new Error("ALREADY_EXISTS");
          state.payout = value;
          state.payoutCreates += 1;
        }
      },
      update: (ref, value) => {
        if (ref.collectionName === "advance_requests") state.advance = { ...state.advance, ...value };
      },
    }),
  };
  return { db, state, request: { auth: { uid: "owner-a", token: { companyId: "company-a" } }, data: { advanceId: "advance-a" } } };
}

test("authorized owner queues one deterministic sandbox payout using the trusted amount", async () => {
  const harness = initiationHarness();
  const result = await initiateAdvancePayout(harness.db, harness.request);
  assert.equal(result.status, "QUEUED");
  assert.equal(harness.state.payoutCreates, 1);
  assert.equal(harness.state.payout.amount, 2500);
  assert.equal(harness.state.payout.status, "QUEUED");
  assert.equal(harness.state.advance.payoutStatus, "QUEUED");
  assert.match(result.payoutId, /^advance_advance-a$/);
});

test("advance approver without payout.execute cannot initiate", () => {
  assert.throws(() => authorizePayoutInitiation({ uid: "approver", companyId: "company-a", permissions: ["advance.approve"] }), /FORBIDDEN/);
});

test("payout.execute user can initiate", () => {
  assert.equal(authorizePayoutInitiation({ uid: "finance", companyId: "company-a", permissions: ["payout.execute"] }), "company-a");
});

test("normal employee cannot initiate a payout", () => {
  assert.throws(() => authorizePayoutInitiation({ uid: "employee", companyId: "company-a", permissions: [] }), /FORBIDDEN/);
});

test("owner can initiate without an employee permission array", () => {
  assert.equal(authorizePayoutInitiation({ uid: "owner", companyId: "company-a", isOwner: true, permissions: [] }), "company-a");
});

test("permission catalog grants payout.execute only to owner and Accounts Manager defaults", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/app/allservice/rbac/permissionCatalog.js"), "utf8");
  assert.match(source, /DEDICATED_PERMISSIONS = \["payout\.execute"\]/);
  assert.match(source, /accounts_manager:[^\n]+"payout\.execute"/);
  assert.doesNotMatch(source, /employee:[^\n]+"payout\.execute"/);
});

test("wrong-company advance identifier is not found", async () => {
  const harness = initiationHarness({ advanceExists: false });
  await assert.rejects(initiateAdvancePayout(harness.db, { ...harness.request, data: { advanceId: "company-b-advance" } }), /ADVANCE_NOT_FOUND/);
});

test("Pending advance cannot initiate", async () => {
  const harness = initiationHarness({ advance: { status: "Pending" } });
  await assert.rejects(initiateAdvancePayout(harness.db, harness.request), /ADVANCE_NOT_APPROVED/);
});

test("beneficiary, connection, and production guards run before queueing", async () => {
  const unready = initiationHarness({ employee: { payoutBeneficiary: { ...employee.payoutBeneficiary, status: "INITIATED" } } });
  await assert.rejects(initiateAdvancePayout(unready.db, unready.request), /BENEFICIARY_NOT_VERIFIED/);
  const disconnected = initiationHarness({ settings: { status: "NOT_CONNECTED" } });
  await assert.rejects(initiateAdvancePayout(disconnected.db, disconnected.request), /PAYOUT_CONNECTION_REQUIRED/);
  const production = initiationHarness({ settings: { environment: "production" } });
  await assert.rejects(initiateAdvancePayout(production.db, production.request), /PRODUCTION_DISPATCH_BLOCKED/);
});

test("double initiation creates exactly one payout", async () => {
  const harness = initiationHarness();
  await initiateAdvancePayout(harness.db, harness.request);
  await assert.rejects(initiateAdvancePayout(harness.db, harness.request), /PAYOUT_ALREADY_INITIATED/);
  assert.equal(harness.state.payoutCreates, 1);
});

test("queued Payout documents retain the existing dispatch trigger", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/index.js"), "utf8");
  assert.match(source, /onDocumentCreated\(\{[\s\S]*?document: "Companies\/\{companyId\}\/Payouts\/\{payoutId\}"/);
  assert.match(source, /dispatchAdvancePayout/);
});
