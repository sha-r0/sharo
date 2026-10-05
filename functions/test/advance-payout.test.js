"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
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
  reconcileAdvancePayout,
  retryQueuedAdvancePayout,
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

test("PUBLIC_KEY transfer requests include x-cf-signature", async () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  let request;
  const provider = new CashfreePayoutProvider(null, async (_url, options) => {
    request = options;
    return { ok: true, status: 200, json: async () => ({ transfer_id: "transfer-a", status: "RECEIVED", status_code: "RECEIVED" }) };
  }, { nowProvider: () => 1720000000 });
  await provider.createTransfer({ environment: "sandbox", authMode: "PUBLIC_KEY" }, { clientId: "id", clientSecret: "secret", publicKey }, { transferId: "transfer-a", amount: 2500, beneficiaryId: "bene-a" });
  assert.equal(typeof request.headers["x-cf-signature"], "string");
  const decrypted = crypto.privateDecrypt({
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  }, Buffer.from(request.headers["x-cf-signature"], "base64")).toString("utf8");
  assert.equal(decrypted, "id.1720000000");
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
  const companyDocs = {
    "company-a": { ownerUid: "owner-a" },
    ...(overrides.companyDocs || {}),
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
      ? { doc: (id) => ({
        ...companyDoc,
        id,
        get: async () => {
          const data = companyDocs[id];
          if (!data) return { exists: false, data: () => null, ref: { ...companyRef, id } };
          return { exists: true, data: () => data, ref: { ...companyRef, id } };
        },
        collection: (collectionName) => ({
          doc: (docId) => document(collectionName, docId),
        }),
      }) }
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

function dispatchHarness(overrides = {}) {
  const companyDocs = {
    "company-a": { ownerUid: "owner-a", ...(overrides.company || {}) },
    ...(overrides.companyDocs || {}),
  };
  const state = {
    advance: overrides.advance === undefined ? { ...advance, payoutStatus: "QUEUED" } : overrides.advance,
    employee: overrides.employee === undefined ? { ...employee } : overrides.employee,
    settings: overrides.settings === undefined ? { ...settings, authMode: "PUBLIC_KEY" } : overrides.settings,
    payout: overrides.payout === undefined ? {
      type: "ADVANCE",
      advanceId: "advance-a",
      employeeFirestoreId: "employee-a",
      amount: 2500,
      beneficiaryId: "bene-a",
      bankFingerprint: bankFingerprint(bank),
      provider: "cashfree",
      environment: "sandbox",
      transferId: transferIdForAdvance("company-a", "advance-a"),
      status: "QUEUED",
    } : overrides.payout,
    updates: [],
    creates: [],
    providerCalls: 0,
  };
  const snapshot = (value) => ({ exists: value != null, data: () => value });
  const makeDoc = (collectionName, id, getter, setter) => ({
    collectionName,
    id,
    get: async () => snapshot(getter()),
    collection: (name) => ({ doc: (docId) => makeDoc(name, docId, () => (state[name] || {})[docId], (value) => { state[name] = state[name] || {}; state[name][docId] = value; } ) }),
  });
  const companyRef = {
    id: "company-a",
    collection: (collectionName) => ({
      doc: (docId) => makeDoc(collectionName, docId,
        () => {
          if (collectionName === "advance_requests") return state.advance;
          if (collectionName === "Usermanagement") return state.employee;
          if (collectionName === "PayoutSettings") return state.settings;
          if (collectionName === "Payouts") return state.payout;
          return (state[collectionName] || {})[docId];
        },
        (value) => { state[collectionName] = state[collectionName] || {}; state[collectionName][docId] = value; }
      ),
    }),
  };
  const makeCompanyDoc = (id) => {
    const docRef = {
      id,
      ref: null,
      collection: (collectionName) => ({
        doc: (docId) => makeDoc(
          collectionName,
          docId,
          () => {
            if (collectionName === "advance_requests") return state.advance;
            if (collectionName === "Usermanagement") return state.employee;
            if (collectionName === "PayoutSettings") return state.settings;
            if (collectionName === "Payouts") return state.payout;
            return (state[collectionName] || {})[docId];
          },
          (value) => {
            state[collectionName] = state[collectionName] || {};
            state[collectionName][docId] = value;
          },
        ),
      }),
      get: async () => {
        const data = companyDocs[id];
        if (!data) return { exists: false, data: () => null, ref: docRef };
        return { exists: true, data: () => data, ref: docRef };
      },
    };
    docRef.ref = docRef;
    return docRef;
  };
  const db = {
    collection: (name) => name === "Companies"
      ? { doc: (id) => makeCompanyDoc(id) }
      : { doc: (id) => makeDoc(name, id, () => (state[name] || {})[id], (value) => { state[name] = state[name] || {}; state[name][id] = value; }) },
    runTransaction: async (work) => work({
      get: async (ref) => ref.get(),
      update: (ref, value) => {
        state.updates.push({ collectionName: ref.collectionName, id: ref.id, value });
        if (ref.collectionName === "Payouts") state.payout = { ...state.payout, ...value };
        if (ref.collectionName === "advance_requests" && state.advance) state.advance = { ...state.advance, ...value };
      },
      set: (ref, value) => {
        state.creates.push({ collectionName: ref.collectionName, id: ref.id, value });
        state[ref.collectionName] = state[ref.collectionName] || {};
        state[ref.collectionName][ref.id] = value;
      },
      create: (ref, value) => {
        state.creates.push({ collectionName: ref.collectionName, id: ref.id, value });
        state[ref.collectionName] = state[ref.collectionName] || {};
        state[ref.collectionName][ref.id] = value;
      },
    }),
  };
  const provider = {
    createTransfer: async (_config, _credentials, payload) => {
      state.providerCalls += 1;
      state.lastPayload = payload;
      return { ok: true, result: { providerStatus: "RECEIVED", providerStatusCode: "RECEIVED", cfTransferId: "cf-transfer-a" } };
    },
    getTransferStatus: async () => {
      state.providerCalls += 1;
      return { ok: true, result: { providerStatus: "RECEIVED", providerStatusCode: "RECEIVED", cfTransferId: "cf-transfer-a" } };
    },
  };
  const credentialResolver = {
    resolve: async (settingsArg, context) => {
      state.resolvedSettings = settingsArg;
      state.resolvedContext = context;
      return { configured: true, authMode: settingsArg.authMode, credentials: { clientId: "id", clientSecret: "secret", publicKey: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest\n-----END PUBLIC KEY-----" } };
    },
  };
  return { db, state, provider, credentialResolver };
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

test("cross-company initiation remains blocked", async () => {
  const harness = initiationHarness({ companyDocs: { "company-b": { ownerUid: "owner-b" } } });
  await assert.rejects(
    initiateAdvancePayout(harness.db, {
      ...harness.request,
      auth: { uid: "owner-a", token: { companyId: "company-b" } },
    }),
    /FORBIDDEN/,
  );
});

test("permission catalog grants payout.execute only to owner and Accounts Manager defaults", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../src/app/allservice/rbac/permissionCatalog.js"),
    "utf8"
  );

  assert.match(
    source,
    /DEDICATED_PERMISSIONS = \[[^\]]*"payout\.execute"/
  );

  assert.match(
    source,
    /accounts_manager:[^\n]+"payout\.execute"/
  );

  assert.doesNotMatch(
    source,
    /employee:[^\n]+"payout\.execute"/
  );
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

test("PUBLIC_KEY queued payout dispatch works without settings reference errors", async () => {
  const harness = dispatchHarness();
  const result = await require("../src/payout/AdvancePayoutService").dispatchAdvancePayout(harness.db, "company-a", "advance_company-a_advance-a", {
    credentialResolver: harness.credentialResolver,
    provider: harness.provider,
    source: "firestore-trigger",
  });
  assert.equal(result.status, "PROCESSING");
  assert.equal(harness.state.providerCalls, 1);
  assert.equal(harness.state.resolvedSettings.authMode, "PUBLIC_KEY");
});

test("missing advance does not call provider and returns terminal failure", async () => {
  const harness = dispatchHarness({ advance: null });
  const result = await require("../src/payout/AdvancePayoutService").dispatchAdvancePayout(harness.db, "company-a", "advance_company-a_advance-a", {
    credentialResolver: harness.credentialResolver,
    provider: harness.provider,
    source: "firestore-trigger",
  });
  assert.equal(result.status, "FAILED");
  assert.equal(harness.state.providerCalls, 0);
  assert.equal(harness.state.payout.status, "FAILED");
  assert.equal(harness.state.payout.failureCode, "PAYOUT_SOURCE_NOT_FOUND");
});

test("duplicate queued payout dispatch does not duplicate transfer", async () => {
  const harness = dispatchHarness();
  const service = require("../src/payout/AdvancePayoutService");
  await service.dispatchAdvancePayout(harness.db, "company-a", "advance_company-a_advance-a", {
    credentialResolver: harness.credentialResolver,
    provider: harness.provider,
    source: "firestore-trigger",
  });
  const second = await service.dispatchAdvancePayout(harness.db, "company-a", "advance_company-a_advance-a", {
    credentialResolver: harness.credentialResolver,
    provider: harness.provider,
    source: "firestore-trigger",
  });
  assert.equal(harness.state.providerCalls, 1);
  assert.equal(second.skipped, true);
});

test("retryQueuedAdvancePayout resumes a queued payout using the same payout and transfer IDs", async () => {
  const harness = dispatchHarness();
  const result = await retryQueuedAdvancePayout(harness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: harness.credentialResolver,
    provider: harness.provider,
  });
  assert.equal(result.status, "PROCESSING");
  assert.equal(harness.state.providerCalls, 1);
  assert.equal(harness.state.lastPayload.transferId, transferIdForAdvance("company-a", "advance-a"));
  assert.equal(harness.state.creates.filter((entry) => entry.collectionName === "Payouts").length, 0);
});

test("retryQueuedAdvancePayout does not dispatch again for processing or paid payouts", async () => {
  const processingHarness = dispatchHarness();
  processingHarness.state.payout.status = "PROCESSING";
  const processingResult = await retryQueuedAdvancePayout(processingHarness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: processingHarness.credentialResolver,
    provider: processingHarness.provider,
  });
  assert.equal(processingResult.skipped, true);
  assert.equal(processingHarness.state.providerCalls, 0);

  const paidHarness = dispatchHarness();
  paidHarness.state.payout.status = "PAID";
  const paidResult = await retryQueuedAdvancePayout(paidHarness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: paidHarness.credentialResolver,
    provider: paidHarness.provider,
  });
  assert.equal(paidResult.skipped, true);
  assert.equal(paidHarness.state.providerCalls, 0);
});

test("retryQueuedAdvancePayout rejects missing source data safely", async () => {
  const missingAdvanceHarness = dispatchHarness({ advance: null });
  await assert.rejects(
    retryQueuedAdvancePayout(missingAdvanceHarness.db, {
      auth: { uid: "owner-a", token: { companyId: "company-a" } },
      data: { advanceId: "advance-a" },
    }, {
      credentialResolver: missingAdvanceHarness.credentialResolver,
      provider: missingAdvanceHarness.provider,
    }),
    /ADVANCE_NOT_FOUND/,
  );
});

test("retryQueuedAdvancePayout blocks unauthorized and cross-company callers", async () => {
  const harness = dispatchHarness();
  await assert.rejects(
    retryQueuedAdvancePayout(harness.db, {
      auth: { uid: "employee-a", token: { companyId: "company-a", companyEmployeeId: "employee-a" } },
      data: { advanceId: "advance-a" },
    }, {
      credentialResolver: harness.credentialResolver,
      provider: harness.provider,
    }),
    /FORBIDDEN/,
  );
  await assert.rejects(
    retryQueuedAdvancePayout(harness.db, {
      auth: { uid: "owner-a", token: { companyId: "company-b" } },
      data: { advanceId: "advance-a" },
    }, {
      credentialResolver: harness.credentialResolver,
      provider: harness.provider,
    }),
    /FORBIDDEN/,
  );
});

test("reconcileAdvancePayout maps Cashfree SUCCESS to PAID and stores UTR", async () => {
  const harness = dispatchHarness({ advance: { ...advance, payoutStatus: "PROCESSING" }, payout: { ...dispatchHarness().state.payout, status: "PROCESSING", providerStatus: "RECEIVED" } });
  const provider = {
    getTransferStatus: async () => ({ ok: true, found: true, result: { providerStatus: "SUCCESS", providerStatusCode: "COMPLETED", cfTransferId: "cf-transfer-a", transferUtr: "UTR-123" } }),
    createTransfer: async () => { throw new Error("UNUSED"); },
  };
  const result = await reconcileAdvancePayout(harness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: harness.credentialResolver,
    provider,
  });
  assert.equal(result.status, "PAID");
  assert.equal(harness.state.payout.status, "PAID");
  assert.equal(harness.state.advance.payoutStatus, "PAID");
  assert.equal(harness.state.payout.transferUtr, "UTR-123");
  assert.equal(harness.state.payout.reconciledAt != null, true);
  assert.equal(harness.state.providerCalls || 0, 0);
});

test("reconcileAdvancePayout maps Cashfree FAILED to FAILED", async () => {
  const harness = dispatchHarness({ advance: { ...advance, payoutStatus: "PROCESSING" }, payout: { ...dispatchHarness().state.payout, status: "PROCESSING" } });
  const provider = {
    getTransferStatus: async () => ({ ok: true, found: true, result: { providerStatus: "FAILED", providerStatusCode: "FAILED", cfTransferId: "cf-transfer-a" } }),
    createTransfer: async () => { throw new Error("UNUSED"); },
  };
  const result = await reconcileAdvancePayout(harness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: harness.credentialResolver,
    provider,
  });
  assert.equal(result.status, "FAILED");
  assert.equal(harness.state.payout.status, "FAILED");
  assert.equal(harness.state.advance.payoutStatus, "FAILED");
});

test("reconcileAdvancePayout keeps PROCESSING on pending transfer status", async () => {
  const harness = dispatchHarness({ advance: { ...advance, payoutStatus: "PROCESSING" }, payout: { ...dispatchHarness().state.payout, status: "PROCESSING" } });
  const provider = {
    getTransferStatus: async () => ({ ok: true, found: true, result: { providerStatus: "RECEIVED", providerStatusCode: "RECEIVED", cfTransferId: "cf-transfer-a" } }),
    createTransfer: async () => { throw new Error("UNUSED"); },
  };
  const result = await reconcileAdvancePayout(harness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: harness.credentialResolver,
    provider,
  });
  assert.equal(result.status, "PROCESSING");
  assert.equal(harness.state.payout.status, "PROCESSING");
  assert.equal(harness.state.advance.payoutStatus, "PROCESSING");
});

test("reconcileAdvancePayout is idempotent for already PAID payouts and does not call provider again", async () => {
  const harness = dispatchHarness({ advance: { ...advance, payoutStatus: "PAID" }, payout: { ...dispatchHarness().state.payout, status: "PAID" } });
  let calls = 0;
  const provider = {
    getTransferStatus: async () => { calls += 1; return { ok: true, found: true, result: { providerStatus: "SUCCESS", providerStatusCode: "COMPLETED", cfTransferId: "cf-transfer-a" } }; },
    createTransfer: async () => { throw new Error("UNUSED"); },
  };
  const result = await reconcileAdvancePayout(harness.db, {
    auth: { uid: "owner-a", token: { companyId: "company-a" } },
    data: { advanceId: "advance-a" },
  }, {
    credentialResolver: harness.credentialResolver,
    provider,
  });
  assert.equal(result.skipped, true);
  assert.equal(result.status, "PAID");
  assert.equal(calls, 0);
});
