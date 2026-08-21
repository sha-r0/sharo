"use strict";

const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("../auth/CompanyActor");

const BENEFICIARY_STATUSES = new Set(["VERIFIED", "INITIATED", "INVALID", "FAILED", "CANCELLED", "DELETED"]);

function authorizeBeneficiarySync(actor) {
  if (!actor?.uid) throw new Error("UNAUTHENTICATED");
  if (!actor.companyId || !(actor.isOwner || actor.permissions?.includes("company.manage") || actor.permissions?.includes("employee.manage"))) {
    throw new Error("FORBIDDEN");
  }
  return actor.companyId;
}

function validateSyncInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_BENEFICIARY_INPUT");
  if (Object.keys(input).some((key) => key !== "employeeFirestoreId")) throw new Error("INVALID_BENEFICIARY_INPUT");
  const employeeFirestoreId = String(input.employeeFirestoreId || "").trim();
  if (!employeeFirestoreId || employeeFirestoreId.length > 128 || employeeFirestoreId.includes("/")) throw new Error("INVALID_EMPLOYEE_ID");
  return { employeeFirestoreId };
}

function normalizeBankDetails(employee) {
  const bank = employee?.bankDetails || {};
  const accountHolderName = String(bank.accountHolderName || "").trim().replace(/\s+/g, " ");
  const accountNumber = String(bank.accountNumber || "").replace(/\s+/g, "").toUpperCase();
  const ifsc = String(bank.ifsc || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Za-z ]{2,100}$/.test(accountHolderName)) throw new Error("INVALID_ACCOUNT_HOLDER_NAME");
  if (!/^[A-Z0-9]{4,25}$/.test(accountNumber)) throw new Error("INVALID_ACCOUNT_NUMBER");
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) throw new Error("INVALID_IFSC");
  return { accountHolderName, accountNumber, ifsc };
}

function bankFingerprint(bank) {
  return crypto.createHash("sha256").update(`${bank.accountNumber}|${bank.ifsc}`).digest("hex");
}

function beneficiaryId(companyId, employeeFirestoreId, fingerprint) {
  const digest = crypto.createHash("sha256").update(`${companyId}:${employeeFirestoreId}:${fingerprint}`).digest("hex").slice(0, 36);
  return `emp_${digest}`;
}

function normalizeProviderBeneficiary(value) {
  const beneficiaryIdValue = String(value?.beneficiary_id || "").trim();
  const status = String(value?.beneficiary_status || "").trim().toUpperCase();
  if (!beneficiaryIdValue || !BENEFICIARY_STATUSES.has(status)) throw new Error("INVALID_PROVIDER_BENEFICIARY");
  return { beneficiaryId: beneficiaryIdValue, status };
}

function assertVerifiedMerchantSettings(settings) {
  if (settings?.status !== "CONNECTED" || settings.payoutsEnabled !== true || settings.authMode !== "MERCHANT") {
    throw new Error("PAYOUT_CONNECTION_REQUIRED");
  }
  if (!["sandbox", "production"].includes(settings.environment)) throw new Error("INVALID_PAYOUT_ENVIRONMENT");
  return settings;
}

function providerBankMatches(value, desired) {
  const instrument = value?.beneficiary_instrument_details || {};
  return String(instrument.bank_account_number || "").replace(/\s+/g, "").toUpperCase() === desired.accountNumber
    && String(instrument.bank_ifsc || "").replace(/\s+/g, "").toUpperCase() === desired.ifsc;
}

function isBeneficiaryPayoutReady(employee) {
  try {
    const bank = normalizeBankDetails(employee);
    return employee?.payoutBeneficiary?.provider === "cashfree"
      && employee.payoutBeneficiary.status === "VERIFIED"
      && employee.payoutBeneficiary.bankFingerprint === bankFingerprint(bank);
  } catch {
    return false;
  }
}

async function reconcileBeneficiary(provider, config, credentials, desired) {
  const byId = await provider.getBeneficiary(config, credentials, { beneficiaryId: desired.beneficiaryId });
  if (byId.ok) {
    if (!providerBankMatches(byId.beneficiary, desired)) throw new Error("BENEFICIARY_BANK_MISMATCH");
    return { ...normalizeProviderBeneficiary(byId.beneficiary), idempotent: true };
  }
  if (byId.code !== "BENEFICIARY_NOT_FOUND") throw new Error(byId.code || "BENEFICIARY_LOOKUP_FAILED");

  const created = await provider.createBeneficiary(config, credentials, desired);
  if (created.ok) {
    if (!providerBankMatches(created.beneficiary, desired)) throw new Error("BENEFICIARY_BANK_MISMATCH");
    return { ...normalizeProviderBeneficiary(created.beneficiary), idempotent: false };
  }
  if (!created.duplicate) throw new Error(created.code || "BENEFICIARY_CREATE_FAILED");

  const duplicateById = await provider.getBeneficiary(config, credentials, { beneficiaryId: desired.beneficiaryId });
  if (duplicateById.ok) {
    if (!providerBankMatches(duplicateById.beneficiary, desired)) throw new Error("BENEFICIARY_BANK_MISMATCH");
    return { ...normalizeProviderBeneficiary(duplicateById.beneficiary), idempotent: true };
  }
  const duplicateByBank = await provider.getBeneficiary(config, credentials, { accountNumber: desired.accountNumber, ifsc: desired.ifsc });
  if (duplicateByBank.ok) {
    if (!providerBankMatches(duplicateByBank.beneficiary, desired)) throw new Error("BENEFICIARY_BANK_MISMATCH");
    return { ...normalizeProviderBeneficiary(duplicateByBank.beneficiary), idempotent: true };
  }
  throw new Error("BENEFICIARY_RECONCILIATION_FAILED");
}

async function syncEmployeePayoutBeneficiary(db, request, { credentialResolver, provider }) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = authorizeBeneficiarySync(actor);
  const { employeeFirestoreId } = validateSyncInput(request.data);
  const companyRef = db.collection("Companies").doc(companyId);
  const employeeRef = companyRef.collection("Usermanagement").doc(employeeFirestoreId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const [employeeSnapshot, settingsSnapshot] = await Promise.all([employeeRef.get(), settingsRef.get()]);
  if (!employeeSnapshot.exists) throw new Error("EMPLOYEE_NOT_FOUND");
  if (!settingsSnapshot.exists) throw new Error("PAYOUT_CONNECTION_REQUIRED");
  const settings = settingsSnapshot.data() || {};
  assertVerifiedMerchantSettings(settings);

  const bank = normalizeBankDetails(employeeSnapshot.data());
  const fingerprint = bankFingerprint(bank);
  const desiredId = beneficiaryId(companyId, employeeFirestoreId, fingerprint);
  const resolved = await credentialResolver.resolve(settings, { companyId });
  if (!resolved?.configured || resolved.authMode !== "MERCHANT") throw new Error("PAYOUT_CREDENTIALS_REQUIRED");
  const result = await reconcileBeneficiary(provider, { environment: settings.environment, authMode: "MERCHANT" }, resolved.credentials, {
    beneficiaryId: desiredId,
    ...bank,
  });

  await db.runTransaction(async (transaction) => {
    const [latestSnapshot, latestSettingsSnapshot] = await Promise.all([
      transaction.get(employeeRef),
      transaction.get(settingsRef),
    ]);
    if (!latestSnapshot.exists) throw new Error("EMPLOYEE_NOT_FOUND");
    if (!latestSettingsSnapshot.exists) throw new Error("PAYOUT_CONNECTION_REQUIRED");
    const latestSettings = assertVerifiedMerchantSettings(latestSettingsSnapshot.data() || {});
    if (latestSettings.environment !== settings.environment || latestSettings.secretRef !== settings.secretRef) throw new Error("PAYOUT_CONFIG_CHANGED");
    const latestBank = normalizeBankDetails(latestSnapshot.data());
    if (bankFingerprint(latestBank) !== fingerprint) throw new Error("EMPLOYEE_BANK_CHANGED");
    transaction.update(employeeRef, {
      payoutBeneficiary: {
        provider: "cashfree",
        beneficiaryId: result.beneficiaryId,
        status: result.status,
        environment: settings.environment,
        bankFingerprint: fingerprint,
        syncedAt: FieldValue.serverTimestamp(),
        verifiedAt: result.status === "VERIFIED" ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });
    const auditKey = crypto.createHash("sha256").update(`${employeeFirestoreId}:${fingerprint}:${result.status}`).digest("hex").slice(0, 24);
    transaction.set(companyRef.collection("ActivityLogs").doc(`payout-beneficiary-${auditKey}`), {
      type: "payout_beneficiary_synced",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      metadata: { employeeFirestoreId, beneficiaryId: result.beneficiaryId, provider: "cashfree", status: result.status },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });

  return { providerBeneficiaryId: result.beneficiaryId, status: result.status, environment: settings.environment, payoutReady: result.status === "VERIFIED", idempotent: result.idempotent };
}

module.exports = {
  BENEFICIARY_STATUSES,
  assertVerifiedMerchantSettings,
  authorizeBeneficiarySync,
  bankFingerprint,
  beneficiaryId,
  isBeneficiaryPayoutReady,
  normalizeBankDetails,
  normalizeProviderBeneficiary,
  providerBankMatches,
  reconcileBeneficiary,
  syncEmployeePayoutBeneficiary,
  validateSyncInput,
};
