"use strict";

const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("../auth/CompanyActor");
const { assertCompanyScope } = require("./PayoutPolicy");

const ENVIRONMENTS = new Set(["sandbox", "production"]);
const INPUT_FIELDS = new Set(["clientId", "clientSecret", "publicKey", "environment", "authMode"]);
const AUTH_MODES = new Set(["MERCHANT", "PUBLIC_KEY"]);

function validateConnectInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_CONNECTION_INPUT");
  if (Object.keys(input).some((key) => !INPUT_FIELDS.has(key))) throw new Error("INVALID_CONNECTION_INPUT");
  const clientId = String(input.clientId || "").trim();
  const clientSecret = String(input.clientSecret || "").trim();
  const environment = String(input.environment || "").trim().toLowerCase();
  let publicKey = input.publicKey == null || input.publicKey === "" ? null : String(input.publicKey).trim();
  if (publicKey && (!/BEGIN PUBLIC KEY/.test(publicKey) || !/END PUBLIC KEY/.test(publicKey))) {
    throw new Error("INVALID_PUBLIC_KEY");
  }
  let authMode = input.authMode == null || input.authMode === "" ? null : String(input.authMode).trim().toUpperCase();
  if (!authMode) authMode = publicKey ? "PUBLIC_KEY" : "MERCHANT";
  if (!clientId || clientId.length > 256 || !clientSecret || clientSecret.length > 512 || !ENVIRONMENTS.has(environment) || !AUTH_MODES.has(authMode)) {
    throw new Error("INVALID_CONNECTION_INPUT");
  }
  if (authMode === "PUBLIC_KEY" && !publicKey) throw new Error("INVALID_CONNECTION_INPUT");
  return { clientId, clientSecret, publicKey, environment, authMode };
}

function sanitizedResult(verified, status, message) {
  return { verified: verified === true, status, message };
}

function eventId(versionName, result) {
  return crypto.createHash("sha256").update(`${versionName}:${result}`).digest("hex").slice(0, 24);
}

function verifiedSettings(latest, input, secretRef) {
  return {
    ...latest,
    provider: "cashfree",
    environment: input.environment,
    authMode: input.authMode || "MERCHANT",
    secretRef,
    status: "CONNECTED",
    payoutsEnabled: true,
    productionSecurityReady: false,
    verificationFingerprint: null,
    verifiedAt: FieldValue.serverTimestamp(),
    connectedAt: FieldValue.serverTimestamp(),
    lastVerificationError: null,
    lastConnectionAttemptStatus: "CONNECTED",
    lastConnectionAttemptAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function failedSettings(latest, input, verification, preservePrevious) {
  const failureFields = {
    lastConnectionAttemptStatus: "ERROR",
    lastConnectionAttemptAt: FieldValue.serverTimestamp(),
    lastVerificationError: verification?.code || "VERIFICATION_FAILED",
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (preservePrevious) return { ...latest, ...failureFields };
  return {
    ...latest,
    provider: "cashfree",
    environment: input.environment,
    authMode: input.authMode || latest.authMode || "MERCHANT",
    secretRef: latest.secretRef || null,
    status: "ERROR",
    payoutsEnabled: false,
    productionSecurityReady: false,
    verifiedAt: null,
    connectedAt: null,
    ...failureFields,
  };
}

function disconnectedSettings() {
  return {
    status: "NOT_CONNECTED",
    payoutsEnabled: false,
    verifiedAt: null,
    verificationFingerprint: null,
    lastConnectionAttemptStatus: "DISCONNECTED",
    lastConnectionAttemptAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function connectMerchantPayout(db, request, { secretStore, provider }) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = assertCompanyScope(actor, request.data?.companyId);
  const input = validateConnectInput(request.data || {});
  const authMode = input.authMode || (input.publicKey ? "PUBLIC_KEY" : "MERCHANT");
  const companyRef = db.collection("Companies").doc(companyId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const previousSnapshot = await settingsRef.get();
  const previous = previousSnapshot.exists ? previousSnapshot.data() || {} : {};
  const staged = await secretStore.stageCredentials(companyId, input);

  const verification = await provider.verifyConnection({
    provider: "cashfree",
    environment: input.environment,
    authMode,
    merchantId: previous.merchantId || null,
  }, input);

  if (verification?.ok === true) {
    try {
      await secretStore.activateVersion(staged.versionName);
      await db.runTransaction(async (transaction) => {
        const latestSnapshot = await transaction.get(settingsRef);
        const latest = latestSnapshot.exists ? latestSnapshot.data() || {} : {};
        transaction.set(settingsRef, {
          ...verifiedSettings(latest, input, staged.secretRef),
          createdAt: latestSnapshot.exists && latest.createdAt ? latest.createdAt : FieldValue.serverTimestamp(),
        }, { merge: false });
        transaction.set(companyRef.collection("ActivityLogs").doc(`payout-connect-${eventId(staged.versionName, "verified")}`), {
          type: "payout_config_verified",
          actorId: actor.uid,
          actorEmployeeId: actor.employeeId,
          companyId,
          metadata: { settingsId: "default", provider: "cashfree", environment: input.environment, authMode },
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: false });
      });
    } catch (error) {
      await secretStore.discardVersion(staged.versionName);
      throw error;
    }
    return sanitizedResult(true, "CONNECTED", "Cashfree merchant payout connection verified.");
  }

  await secretStore.discardVersion(staged.versionName);
  const preserved = previous.status === "CONNECTED" && previous.secretRef;
  await db.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(settingsRef);
    const latest = latestSnapshot.exists ? latestSnapshot.data() || {} : {};
    const next = failedSettings(latest, input, verification, preserved);
    transaction.set(settingsRef, {
      ...next,
      ...(!latestSnapshot.exists || !latest.createdAt ? { createdAt: FieldValue.serverTimestamp() } : {}),
    }, { merge: false });
    transaction.set(companyRef.collection("ActivityLogs").doc(`payout-connect-${eventId(staged.versionName, "failed")}`), {
      type: "payout_config_failed",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      metadata: { settingsId: "default", provider: "cashfree", environment: input.environment, authMode, resultCode: verification?.code || "VERIFICATION_FAILED", previousConnectionPreserved: Boolean(preserved) },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
  return sanitizedResult(false, "ERROR", verification?.message || "Cashfree merchant credential verification failed.");
}

async function disconnectMerchantPayout(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = assertCompanyScope(actor, request.data?.companyId);
  if (request.data && Object.keys(request.data).length) throw new Error("INVALID_DISCONNECT_INPUT");
  const companyRef = db.collection("Companies").doc(companyId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(settingsRef);
    if (!snapshot.exists) throw new Error("PAYOUT_SETTINGS_NOT_FOUND");
    const settings = snapshot.data() || {};
    transaction.update(settingsRef, disconnectedSettings());
    const fingerprint = crypto.createHash("sha256").update(`${companyId}:${settings.secretRef || "none"}`).digest("hex").slice(0, 24);
    transaction.set(companyRef.collection("ActivityLogs").doc(`payout-disconnect-${fingerprint}`), {
      type: "payout_config_disconnected",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      metadata: { settingsId: "default", provider: settings.provider || null, environment: settings.environment || null },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
  });
  return sanitizedResult(false, "NOT_CONNECTED", "Merchant payout connection disconnected.");
}

module.exports = {
  connectMerchantPayout,
  disconnectedSettings,
  disconnectMerchantPayout,
  failedSettings,
  sanitizedResult,
  validateConnectInput,
  verifiedSettings,
};
