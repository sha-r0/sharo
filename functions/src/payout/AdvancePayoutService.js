"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { bankFingerprint, normalizeBankDetails } = require("./EmployeeBeneficiaryService");
const { resolveCompanyActor } = require("../auth/CompanyActor");
const { payoutIdForAdvance, transferIdForAdvance } = require("./PayoutIdentifiers");
const { isCashfreePayoutAuthMode } = require("./PayoutPolicy");

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

function mapReconciledTransferOutcome(providerResult) {
  if (!providerResult?.ok) return null;
  const status = String(providerResult.result?.providerStatus || "UNKNOWN").toUpperCase();
  const code = String(providerResult.result?.providerStatusCode || "").toUpperCase();
  if ((status === "SUCCESS" && code === "COMPLETED") || code === "COMPLETED") {
    return { status: "PAID", failureCode: null, failureReason: null };
  }
  if (status === "FAILED" || code === "FAILED") {
    return { status: "FAILED", failureCode: code || status, failureReason: "PROVIDER_REJECTED" };
  }
  if (status === "REJECTED" || code === "REJECTED") {
    return { status: "REJECTED", failureCode: code || status, failureReason: "PROVIDER_REJECTED" };
  }
  if (status === "REVERSED" || code === "REVERSED") {
    return { status: "REVERSED", failureCode: code || status, failureReason: "PROVIDER_REJECTED" };
  }
  return { status: "PROCESSING", failureCode: null, failureReason: null };
}

async function retryQueuedAdvancePayout(db, request, dependencies) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = authorizePayoutInitiation(actor);
  const { advanceId } = validateInitiationInput(request.data);
  const companyRef = db.collection("Companies").doc(companyId);
  const advanceRef = companyRef.collection("advance_requests").doc(advanceId);
  const payoutId = payoutIdForAdvance(advanceId);
  const payoutRef = companyRef.collection("Payouts").doc(payoutId);
  const [advanceSnapshot, payoutSnapshot] = await Promise.all([advanceRef.get(), payoutRef.get()]);
  if (!advanceSnapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
  if (!payoutSnapshot.exists) throw new Error("PAYOUT_NOT_FOUND");

  const advance = advanceSnapshot.data() || {};
  const payout = payoutSnapshot.data() || {};
  if (advance.status !== "Approved") throw new Error("ADVANCE_NOT_APPROVED");
  if ((advance.payoutStatus || "NOT_INITIATED") !== "QUEUED") throw new Error("PAYOUT_NOT_QUEUED");
  if (payout.status === "PROCESSING" || payout.status === "PAID") return { advanceId, payoutId, status: payout.status, skipped: true };
  if (payout.status !== "QUEUED") throw new Error("PAYOUT_NOT_QUEUED");

  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const settingsSnapshot = await settingsRef.get();
  if (!settingsSnapshot.exists) throw new Error("PAYOUT_CONNECTION_REQUIRED");
  const settings = settingsSnapshot.data() || {};
  if (settings.status !== "CONNECTED" || settings.payoutsEnabled !== true || !isCashfreePayoutAuthMode(settings.authMode)) throw new Error("PAYOUT_CONNECTION_REQUIRED");
  if (settings.environment !== "sandbox") throw new Error("PRODUCTION_DISPATCH_BLOCKED");

  const expectedTransferId = transferIdForAdvance(companyId, advanceId);
  if (payout.transferId && payout.transferId !== expectedTransferId) throw new Error("PAYOUT_SOURCE_NOT_FOUND");

  return dispatchAdvancePayout(db, companyId, payoutId, { ...dependencies, source: "firestore-trigger" });
}

async function reconcileAdvancePayout(db, request, { credentialResolver, provider }) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = authorizePayoutInitiation(actor);
  const { advanceId } = validateInitiationInput(request.data);
  const companyRef = db.collection("Companies").doc(companyId);
  const advanceRef = companyRef.collection("advance_requests").doc(advanceId);
  const payoutId = payoutIdForAdvance(advanceId);
  const payoutRef = companyRef.collection("Payouts").doc(payoutId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const [advanceSnapshot, payoutSnapshot, settingsSnapshot] = await Promise.all([advanceRef.get(), payoutRef.get(), settingsRef.get()]);
  if (!advanceSnapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
  if (!payoutSnapshot.exists) throw new Error("PAYOUT_NOT_FOUND");
  if (!settingsSnapshot.exists) throw new Error("PAYOUT_CONNECTION_REQUIRED");

  const advance = advanceSnapshot.data() || {};
  const payout = payoutSnapshot.data() || {};
  if (advance.status !== "Approved") throw new Error("ADVANCE_NOT_APPROVED");
  if ((advance.payoutStatus || "NOT_INITIATED") === "PAID" || payout.status === "PAID") {
    return { advanceId, payoutId, status: "PAID", skipped: true };
  }
  if (payout.status !== "PROCESSING") throw new Error("PAYOUT_NOT_PROCESSING");

  const settings = settingsSnapshot.data() || {};
  if (settings.status !== "CONNECTED" || settings.payoutsEnabled !== true || !isCashfreePayoutAuthMode(settings.authMode)) throw new Error("PAYOUT_CONNECTION_REQUIRED");
  if (settings.environment !== "sandbox") throw new Error("PRODUCTION_DISPATCH_BLOCKED");

  const expectedTransferId = transferIdForAdvance(companyId, advanceId);
  const transferId = String(payout.transferId || "").trim();
  if (transferId && transferId !== expectedTransferId) throw new Error("PAYOUT_SOURCE_NOT_FOUND");

  const credentials = await credentialResolver.resolve(settings, { companyId });
  if (!credentials?.configured || !isCashfreePayoutAuthMode(credentials.authMode)) throw new Error("PAYOUT_CREDENTIALS_REQUIRED");

  const providerResult = await provider.getTransferStatus({ environment: settings.environment, authMode: settings.authMode }, credentials.credentials, expectedTransferId);
  if (!providerResult?.ok && providerResult?.found === false) {
    return { advanceId, payoutId, status: "PROCESSING", skipped: true };
  }
  const reconciledAt = FieldValue.serverTimestamp();
  const providerFields = providerResult?.ok ? {
    providerStatus: providerResult.result.providerStatus || null,
    providerStatusCode: providerResult.result.providerStatusCode || null,
    cfTransferId: providerResult.result.cfTransferId || payout.cfTransferId || null,
    transferUtr: providerResult.result.transferUtr || payout.transferUtr || null,
  } : {
    providerStatus: null,
    providerStatusCode: null,
    cfTransferId: payout.cfTransferId || null,
    transferUtr: payout.transferUtr || null,
  };

  const mapped = mapReconciledTransferOutcome(providerResult);
  if (!mapped) throw new Error(providerResult?.code || "TRANSFER_STATUS_UNKNOWN");

  await db.runTransaction(async (transaction) => {
    const latestAdvance = await transaction.get(advanceRef);
    const latestPayout = await transaction.get(payoutRef);
    if (!latestAdvance.exists) throw new Error("ADVANCE_NOT_FOUND");
    if (!latestPayout.exists) throw new Error("PAYOUT_NOT_FOUND");
    const latestAdvanceData = latestAdvance.data() || {};
    const latestPayoutData = latestPayout.data() || {};
    if (latestAdvanceData.status !== "Approved") throw new Error("ADVANCE_NOT_APPROVED");
    if (latestPayoutData.status === "PAID" && mapped.status === "PAID") {
      transaction.update(payoutRef, { reconciledAt, ...providerFields, updatedAt: reconciledAt });
      transaction.update(advanceRef, { payoutStatus: "PAID", reconciledAt, updatedAt: reconciledAt });
      return;
    }
    transaction.update(payoutRef, {
      status: mapped.status,
      ...providerFields,
      reconciledAt,
      updatedAt: reconciledAt,
      failureCode: mapped.failureCode,
      failureReason: mapped.failureReason,
    });
    transaction.update(advanceRef, { payoutStatus: mapped.status, reconciledAt, updatedAt: reconciledAt });
    transaction.set(companyRef.collection("ActivityLogs").doc(`advance_payout_reconciled-${payoutId}`), {
      type: "advance_payout_reconciled",
      companyId,
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      targetUserId: latestAdvanceData.employeeFirestoreId || advance.employeeFirestoreId || null,
      metadata: { advanceId, payoutId, transferId: expectedTransferId, status: mapped.status, providerStatus: providerFields.providerStatus, providerStatusCode: providerFields.providerStatusCode },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });

  return { advanceId, payoutId, status: mapped.status, transferId: expectedTransferId };
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
  if (settings?.status !== "CONNECTED" || settings.payoutsEnabled !== true || !isCashfreePayoutAuthMode(settings.authMode)) throw new Error("PAYOUT_CONNECTION_REQUIRED");
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
  const transferId = initial.transferId || transferIdForAdvance(companyId, initial.advanceId);
  const [advanceSnapshot, employeeSnapshot, settingsSnapshot] = await Promise.all([advanceRef.get(), employeeRef.get(), settingsRef.get()]);
  if (!advanceSnapshot.exists) {
    await db.runTransaction(async (transaction) => {
      const latestPayout = await transaction.get(payoutRef);
      if (!latestPayout.exists || !["QUEUED", "DISPATCHING", "UNKNOWN"].includes(latestPayout.data().status)) return;
      transaction.update(payoutRef, {
        status: "FAILED",
        providerStatus: null,
        failureCode: "PAYOUT_SOURCE_NOT_FOUND",
        failureReason: "ADVANCE_NOT_FOUND",
        dispatchedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(companyRef.collection("ActivityLogs").doc(`advance_payout_failed-${payoutId}`), {
        type: "advance_payout_failed",
        companyId,
        actorId: "system",
        actorEmployeeId: null,
        targetUserId: initial.employeeFirestoreId,
        metadata: { advanceId: initial.advanceId, payoutId, transferId, status: "FAILED", providerStatus: null, failureCode: "PAYOUT_SOURCE_NOT_FOUND" },
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });
    });
    return { payoutId, transferId, status: "FAILED" };
  }
  if (!employeeSnapshot.exists || !settingsSnapshot.exists) throw new Error("PAYOUT_SOURCE_NOT_FOUND");
  const settings = settingsSnapshot.data() || {};
  const eligibility = assertDispatchEligibility({ advance: advanceSnapshot.data(), payout: initial, settings, employee: employeeSnapshot.data() });
  const credentials = await credentialResolver.resolve(settings, { companyId });
  if (!credentials?.configured || !isCashfreePayoutAuthMode(credentials.authMode)) throw new Error("PAYOUT_CREDENTIALS_REQUIRED");

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

  const latestAdvanceSnapshot = await advanceRef.get();
  if (!latestAdvanceSnapshot.exists) {
    await db.runTransaction(async (transaction) => {
      const latestPayout = await transaction.get(payoutRef);
      if (!latestPayout.exists || !["QUEUED", "DISPATCHING", "UNKNOWN"].includes(latestPayout.data().status)) return;
      transaction.update(payoutRef, {
        status: "FAILED",
        providerStatus: null,
        failureCode: "PAYOUT_SOURCE_NOT_FOUND",
        failureReason: "ADVANCE_NOT_FOUND",
        dispatchedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(companyRef.collection("ActivityLogs").doc(`advance_payout_failed-${payoutId}`), {
        type: "advance_payout_failed",
        companyId,
        actorId: "system",
        actorEmployeeId: null,
        targetUserId: initial.employeeFirestoreId,
        metadata: { advanceId: initial.advanceId, payoutId, transferId, status: "FAILED", providerStatus: null, failureCode: "PAYOUT_SOURCE_NOT_FOUND" },
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });
    });
    return { payoutId, transferId, status: "FAILED" };
  }

  const providerResult = shouldReconcile
    ? await provider.getTransferStatus({ environment: settings.environment, authMode: settings.authMode }, credentials.credentials, transferId)
    : await provider.createTransfer({ environment: settings.environment, authMode: settings.authMode }, credentials.credentials, { transferId, amount: eligibility.amount, beneficiaryId: eligibility.beneficiaryId });
  const outcome = shouldReconcile && providerResult.found === false
    ? { status: "UNKNOWN", providerStatus: null, failureCode: providerResult.code || "TRANSFER_NOT_FOUND", failureReason: "PENDING_RECONCILIATION" }
    : outcomeFields(providerResult);

  await db.runTransaction(async (transaction) => {
    const latestPayout = await transaction.get(payoutRef);
    const latestAdvance = await transaction.get(advanceRef);
    if (!latestPayout.exists) throw new Error("PAYOUT_SOURCE_NOT_FOUND");
    if (!latestAdvance.exists) {
      transaction.update(payoutRef, {
        status: "FAILED",
        providerStatus: null,
        failureCode: "PAYOUT_SOURCE_NOT_FOUND",
        failureReason: "ADVANCE_NOT_FOUND",
        dispatchedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(companyRef.collection("ActivityLogs").doc(`advance_payout_failed-${payoutId}`), {
        type: "advance_payout_failed",
        companyId,
        actorId: "system",
        actorEmployeeId: null,
        targetUserId: initial.employeeFirestoreId,
        metadata: { advanceId: initial.advanceId, payoutId, transferId, status: "FAILED", providerStatus: null, failureCode: "PAYOUT_SOURCE_NOT_FOUND" },
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: false });
      return;
    }
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
    const advanceSnapshot = await transaction.get(advanceRef);
    transaction.update(payoutRef, { status: "FAILED", failureCode: safeCode, failureReason: "ELIGIBILITY_OR_DISPATCH_BLOCKED", updatedAt: FieldValue.serverTimestamp() });
    if (advanceSnapshot.exists) transaction.update(advanceRef, { payoutStatus: "FAILED", updatedAt: FieldValue.serverTimestamp() });
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

module.exports = { assertDispatchEligibility, assertTrustedDispatch, authorizePayoutInitiation, dispatchAdvancePayout, dispatchOperationForStatus, initiateAdvancePayout, mapReconciledTransferOutcome, mapTransferStatus, markAdvancePayoutFailed, outcomeFields, payoutIdForAdvance, reconcileAdvancePayout, retryQueuedAdvancePayout, transferIdForAdvance, validateInitiationInput };
