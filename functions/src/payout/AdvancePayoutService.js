"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { bankFingerprint, normalizeBankDetails } = require("./EmployeeBeneficiaryService");
const { resolveCompanyActor } = require("../auth/CompanyActor");
const { payoutIdForAdvance, transferIdForAdvance } = require("./PayoutIdentifiers");

const PROCESSING = new Set(["RECEIVED", "PENDING", "VALIDATION_PENDING", "APPROVAL_PENDING"]);
const FAILED = new Set(["FAILED", "REJECTED", "REVERSED"]);

function authorizePayoutInitiation(actor) {
  if (!actor?.uid) throw new Error("UNAUTHENTICATED");
  if (!actor.companyId || !(actor.isOwner || actor.permissions?.includes("payout.execute"))) throw new Error("FORBIDDEN");
  return actor.companyId;
}

function validateInitiationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => key !== "advanceId")) throw new Error("INVALID_PAYOUT_INPUT");
  const advanceId = String(input.advanceId || "").trim();
  if (!advanceId || advanceId.includes("/") || advanceId.length > 180) throw new Error("INVALID_ADVANCE_ID");
  return { advanceId };
}

async function initiateAdvancePayout(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = authorizePayoutInitiation(actor);
  const { advanceId } = validateInitiationInput(request.data);
  const companyRef = db.collection("Companies").doc(companyId);
  const advanceRef = companyRef.collection("advance_requests").doc(advanceId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const payoutId = payoutIdForAdvance(advanceId);
  const payoutRef = companyRef.collection("Payouts").doc(payoutId);
  const transferId = transferIdForAdvance(companyId, advanceId);
  const transferIndexRef = db.collection("PayoutTransferIndex").doc(transferId);

  return db.runTransaction(async (transaction) => {
    const advanceSnapshot = await transaction.get(advanceRef);
    if (!advanceSnapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
    const advance = advanceSnapshot.data() || {};
    if (advance.status !== "Approved") throw new Error("ADVANCE_NOT_APPROVED");
    if ((advance.payoutStatus || "NOT_INITIATED") !== "NOT_INITIATED") throw new Error("PAYOUT_ALREADY_INITIATED");
    if (!advance.employeeFirestoreId) throw new Error("EMPLOYEE_NOT_FOUND");

    const employeeRef = companyRef.collection("Usermanagement").doc(String(advance.employeeFirestoreId));
    const [employeeSnapshot, settingsSnapshot, payoutSnapshot] = await Promise.all([
      transaction.get(employeeRef),
      transaction.get(settingsRef),
      transaction.get(payoutRef),
    ]);
    if (!employeeSnapshot.exists) throw new Error("EMPLOYEE_NOT_FOUND");
    if (!settingsSnapshot.exists) throw new Error("PAYOUT_CONNECTION_REQUIRED");
    if (payoutSnapshot.exists) throw new Error("PAYOUT_ALREADY_INITIATED");

    const settings = settingsSnapshot.data() || {};
    const eligibility = assertDispatchEligibility({ advance, payout: { status: "QUEUED" }, settings, employee: employeeSnapshot.data() || {} });
    const payout = {
      type: "ADVANCE",
      advanceId,
      employeeFirestoreId: String(advance.employeeFirestoreId),
      amount: eligibility.amount,
      beneficiaryId: eligibility.beneficiaryId,
      bankFingerprint: eligibility.bankFingerprint,
      provider: "cashfree",
      environment: "sandbox",
      transferId,
      status: "QUEUED",
      providerStatus: null,
      cfTransferId: null,
      transferUtr: null,
      failureCode: null,
      failureReason: null,
      initiatedBy: actor.employeeId || actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.create(payoutRef, payout);
    transaction.create(transferIndexRef, { companyId, payoutId, type: "ADVANCE", createdAt: FieldValue.serverTimestamp() });
    transaction.update(advanceRef, { payoutStatus: "QUEUED", payoutId, updatedAt: FieldValue.serverTimestamp() });
    transaction.create(companyRef.collection("ActivityLogs").doc(`advance-payout-initiated-${payoutId}`), {
      type: "advance_payout_initiated",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      targetUserId: String(advance.employeeFirestoreId),
      companyId,
      metadata: { advanceId, payoutId, transferId, amount: eligibility.amount, environment: "sandbox" },
      createdAt: FieldValue.serverTimestamp(),
    });
    return { advanceId, payoutId, status: "QUEUED" };
  });
}

function assertTrustedDispatch(source) {
  if (source !== "firestore-trigger") throw new Error("UNAUTHORIZED_PAYOUT_DISPATCH");
}

function mapTransferStatus(result) {
  const status = String(result?.providerStatus || "UNKNOWN").toUpperCase();
  const code = String(result?.providerStatusCode || "").toUpperCase();
  if (status === "COMPLETED" || status === "SUCCESS" || code === "COMPLETED" || code === "SUCCESS") return "SUCCESS";
  if (FAILED.has(status) || FAILED.has(code)) return FAILED.has(status) ? status : code;
  if (PROCESSING.has(status) || PROCESSING.has(code)) return "PROCESSING";
  return "UNKNOWN";
}

function assertDispatchEligibility({ advance, payout, settings, employee }) {
  if (advance?.status !== "Approved") throw new Error("ADVANCE_NOT_APPROVED");
  if (!Number.isFinite(Number(advance.amount)) || Number(advance.amount) <= 0) throw new Error("INVALID_ADVANCE_AMOUNT");
  if (payout?.status !== "QUEUED" && payout?.status !== "DISPATCHING" && payout?.status !== "UNKNOWN") throw new Error("PAYOUT_ALREADY_DISPATCHED");
  if (settings?.status !== "CONNECTED" || settings.payoutsEnabled !== true || settings.authMode !== "MERCHANT") throw new Error("PAYOUT_CONNECTION_REQUIRED");
  if (settings.environment !== "sandbox") throw new Error("PRODUCTION_DISPATCH_BLOCKED");
  const bank = normalizeBankDetails(employee);
  const fingerprint = bankFingerprint(bank);
  if (employee?.payoutBeneficiary?.status !== "VERIFIED" || employee.payoutBeneficiary.provider !== "cashfree") throw new Error("BENEFICIARY_NOT_VERIFIED");
  if (!employee.payoutBeneficiary.beneficiaryId) throw new Error("BENEFICIARY_NOT_VERIFIED");
  if (employee.payoutBeneficiary.environment !== settings.environment) throw new Error("BENEFICIARY_ENVIRONMENT_MISMATCH");
  if (employee.payoutBeneficiary.bankFingerprint !== fingerprint) throw new Error("BENEFICIARY_BANK_CHANGED");
  return { amount: Number(advance.amount), beneficiaryId: employee.payoutBeneficiary.beneficiaryId, bankFingerprint: fingerprint };
}

function outcomeFields(providerResult) {
  if (!providerResult?.ok) {
    return providerResult?.certain === false
      ? { status: "UNKNOWN", providerStatus: null, failureCode: providerResult.code || "TRANSFER_OUTCOME_UNKNOWN", failureReason: "PENDING_RECONCILIATION" }
      : { status: "FAILED", providerStatus: null, failureCode: providerResult?.code || "TRANSFER_FAILED", failureReason: "PROVIDER_REJECTED" };
  }
  const status = mapTransferStatus(providerResult.result);
  return {
    status,
    providerStatus: providerResult.result.providerStatus,
    cfTransferId: providerResult.result.cfTransferId || null,
    failureCode: FAILED.has(status) ? providerResult.result.providerStatusCode || status : null,
    failureReason: status === "UNKNOWN" ? "PENDING_RECONCILIATION" : null,
  };
}

function dispatchOperationForStatus(status) {
  if (status === "QUEUED") return "CREATE";
  if (status === "DISPATCHING" || status === "UNKNOWN") return "RECONCILE";
  return "SKIP";
}

async function dispatchAdvancePayout(db, companyId, payoutId, { credentialResolver, provider, source }) {
  assertTrustedDispatch(source);
  const companyRef = db.collection("Companies").doc(companyId);
  const payoutRef = companyRef.collection("Payouts").doc(payoutId);
  const payoutSnapshot = await payoutRef.get();
  if (!payoutSnapshot.exists) return { skipped: true, reason: "PAYOUT_NOT_FOUND" };
  const initial = payoutSnapshot.data() || {};
  if (!["QUEUED", "DISPATCHING", "UNKNOWN"].includes(initial.status)) return { skipped: true, reason: "PAYOUT_ALREADY_DISPATCHED" };

  const advanceRef = companyRef.collection("advance_requests").doc(initial.advanceId);
  const employeeRef = companyRef.collection("Usermanagement").doc(initial.employeeFirestoreId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const [advanceSnapshot, employeeSnapshot, settingsSnapshot] = await Promise.all([advanceRef.get(), employeeRef.get(), settingsRef.get()]);
  if (!advanceSnapshot.exists || !employeeSnapshot.exists || !settingsSnapshot.exists) throw new Error("PAYOUT_SOURCE_NOT_FOUND");
  const eligibility = assertDispatchEligibility({ advance: advanceSnapshot.data(), payout: initial, settings: settingsSnapshot.data(), employee: employeeSnapshot.data() });
  const transferId = initial.transferId || transferIdForAdvance(companyId, initial.advanceId);
  const credentials = await credentialResolver.resolve(settingsSnapshot.data(), { companyId });
  if (!credentials?.configured || credentials.authMode !== "MERCHANT") throw new Error("PAYOUT_CREDENTIALS_REQUIRED");

  const shouldReconcile = dispatchOperationForStatus(initial.status) === "RECONCILE";
  if (!shouldReconcile) {
    await db.runTransaction(async (transaction) => {
      const latest = await transaction.get(payoutRef);
      if (!latest.exists || latest.data().status !== "QUEUED") throw new Error("PAYOUT_ALREADY_CLAIMED");
      transaction.update(payoutRef, {
        amount: eligibility.amount,
        beneficiaryId: eligibility.beneficiaryId,
        bankFingerprint: eligibility.bankFingerprint,
        transferId,
        status: "DISPATCHING",
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  }

  const providerResult = shouldReconcile
    ? await provider.getTransferStatus({ environment: "sandbox" }, credentials.credentials, transferId)
    : await provider.createTransfer({ environment: "sandbox" }, credentials.credentials, { transferId, amount: eligibility.amount, beneficiaryId: eligibility.beneficiaryId });
  const outcome = shouldReconcile && providerResult.found === false
    ? { status: "UNKNOWN", providerStatus: null, failureCode: providerResult.code || "TRANSFER_NOT_FOUND", failureReason: "PENDING_RECONCILIATION" }
    : outcomeFields(providerResult);

  await db.runTransaction(async (transaction) => {
    const latestPayout = await transaction.get(payoutRef);
    const latestAdvance = await transaction.get(advanceRef);
    if (!latestPayout.exists || !latestAdvance.exists) throw new Error("PAYOUT_SOURCE_NOT_FOUND");
    transaction.update(payoutRef, {
      ...outcome,
      dispatchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(advanceRef, {
      payoutStatus: outcome.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const eventType = outcome.status === "FAILED" || FAILED.has(outcome.status) ? "advance_payout_failed" : "advance_payout_dispatched";
    transaction.set(companyRef.collection("ActivityLogs").doc(`${eventType}-${payoutId}`), {
      type: eventType,
      companyId,
      actorId: "system",
      actorEmployeeId: null,
      targetUserId: initial.employeeFirestoreId,
      metadata: { advanceId: initial.advanceId, payoutId, transferId, status: outcome.status, providerStatus: outcome.providerStatus || null, failureCode: outcome.failureCode || null },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
  return { payoutId, transferId, status: outcome.status };
}

async function markAdvancePayoutFailed(db, companyId, payoutId, code) {
  const safeCode = String(code || "PAYOUT_DISPATCH_BLOCKED").replace(/[^A-Z0-9_-]/gi, "_").toUpperCase().slice(0, 80);
  const companyRef = db.collection("Companies").doc(companyId);
  const payoutRef = companyRef.collection("Payouts").doc(payoutId);
  await db.runTransaction(async (transaction) => {
    const payoutSnapshot = await transaction.get(payoutRef);
    if (!payoutSnapshot.exists || !["QUEUED", "DISPATCHING", "UNKNOWN"].includes(payoutSnapshot.data().status)) return;
    const payout = payoutSnapshot.data();
    const advanceRef = companyRef.collection("advance_requests").doc(payout.advanceId);
    transaction.update(payoutRef, { status: "FAILED", failureCode: safeCode, failureReason: "ELIGIBILITY_OR_DISPATCH_BLOCKED", updatedAt: FieldValue.serverTimestamp() });
    transaction.update(advanceRef, { payoutStatus: "FAILED", updatedAt: FieldValue.serverTimestamp() });
    transaction.set(companyRef.collection("ActivityLogs").doc(`advance_payout_failed-${payoutId}`), {
      type: "advance_payout_failed",
      companyId,
      actorId: "system",
      actorEmployeeId: null,
      targetUserId: payout.employeeFirestoreId,
      metadata: { advanceId: payout.advanceId, payoutId, transferId: payout.transferId || null, failureCode: safeCode },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
}

module.exports = { assertDispatchEligibility, assertTrustedDispatch, authorizePayoutInitiation, dispatchAdvancePayout, dispatchOperationForStatus, initiateAdvancePayout, mapTransferStatus, markAdvancePayoutFailed, outcomeFields, payoutIdForAdvance, transferIdForAdvance, validateInitiationInput };
