"use strict";

const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");
const { getPayoutSettings, updatePayoutSettings } = require("./PayoutSettingsService");
const { verifyPayoutConnection } = require("./PayoutConnectionService");
const { PayoutCredentialResolver } = require("./PayoutCredentialResolver");
const { GoogleSecretManagerStore } = require("./GoogleSecretManagerStore");
const { connectMerchantPayout, disconnectMerchantPayout } = require("./MerchantConnectionService");
const { syncEmployeePayoutBeneficiary } = require("./EmployeeBeneficiaryService");
const { initiateAdvancePayout } = require("./AdvancePayoutService");
const CashfreePayoutProvider = require("./providers/CashfreePayoutProvider");

const OPTIONS = { region: "asia-south1", cors: true, enforceAppCheck: false };

function callableError(error) {
  const code = error?.message || "INTERNAL";
  if (code === "UNAUTHENTICATED") return new HttpsError("unauthenticated", "Authentication required.");
  if (["FORBIDDEN", "BROWSER_COMPANY_ID_FORBIDDEN"].includes(code)) return new HttpsError("permission-denied", "You are not allowed to manage payouts.");
  if (["PAYOUT_SETTINGS_NOT_FOUND", "PAYOUT_CONFIG_CHANGED", "PAYOUT_CONNECTION_REQUIRED", "PAYOUT_CREDENTIALS_REQUIRED", "EMPLOYEE_BANK_CHANGED", "BENEFICIARY_NOT_VERIFIED", "BENEFICIARY_BANK_CHANGED", "BENEFICIARY_ENVIRONMENT_MISMATCH", "ADVANCE_NOT_APPROVED", "PAYOUT_ALREADY_INITIATED", "PRODUCTION_DISPATCH_BLOCKED"].includes(code)) return new HttpsError("failed-precondition", "The payout is not eligible or has already been initiated.");
  if (["EMPLOYEE_NOT_FOUND", "ADVANCE_NOT_FOUND"].includes(code)) return new HttpsError("not-found", "The requested payout source was not found.");
  if (code.includes("INVALID") || code === "SECRET_FIELD_FORBIDDEN") return new HttpsError("invalid-argument", "The payout settings are invalid.");
  console.error("Payout settings function failed", { code, name: error?.name || "Error" });
  return new HttpsError("internal", "Unable to process payout settings.");
}

function createPayoutDependencies() {
  const firebaseConfig = (() => { try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}"); } catch { return {}; } })();
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;
  const secretStore = new GoogleSecretManagerStore({ client: new SecretManagerServiceClient(), projectId });
  const credentialResolver = new PayoutCredentialResolver({
    partnerCredentialProvider: null,
    merchantSecretStore: secretStore,
  });
  const provider = new CashfreePayoutProvider(() => null);
  return { credentialResolver, provider, secretStore };
}

function createPayoutSettingsFunctions(db, dependencies = createPayoutDependencies()) {
  const { credentialResolver, provider, secretStore } = dependencies;
  return {
    getPayoutSettings: onCall(OPTIONS, async (request) => {
      try {
        return await getPayoutSettings(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
    updatePayoutSettings: onCall(OPTIONS, async (request) => {
      try {
        return await updatePayoutSettings(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
    verifyPayoutConnection: onCall(OPTIONS, async (request) => {
      try {
        return await verifyPayoutConnection(db, request, { credentialResolver, provider });
      } catch (error) {
        throw callableError(error);
      }
    }),
    connectMerchantPayout: onCall(OPTIONS, async (request) => {
      try {
        return await connectMerchantPayout(db, request, { secretStore, provider });
      } catch (error) {
        throw callableError(error);
      }
    }),
    disconnectMerchantPayout: onCall(OPTIONS, async (request) => {
      try {
        return await disconnectMerchantPayout(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
    syncEmployeePayoutBeneficiary: onCall(OPTIONS, async (request) => {
      try {
        return await syncEmployeePayoutBeneficiary(db, request, { credentialResolver, provider });
      } catch (error) {
        throw callableError(error);
      }
    }),
    initiateAdvancePayout: onCall(OPTIONS, async (request) => {
      try {
        return await initiateAdvancePayout(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
  };
}

module.exports = { callableError, createPayoutDependencies, createPayoutSettingsFunctions };
