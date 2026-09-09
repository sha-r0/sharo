"use strict";

const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("../auth/CompanyActor");
const { assertCompanyScope, isCashfreePayoutAuthMode } = require("./PayoutPolicy");

const SAFE_STATUSES = new Set(["NOT_CONNECTED", "CONFIGURED", "CONNECTED", "ERROR"]);

function configurationFingerprint(companyId, settings) {
  return crypto.createHash("sha256").update(JSON.stringify({
    companyId,
    provider: settings.provider || null,
    environment: settings.environment || null,
    authMode: settings.authMode || null,
    merchantId: settings.merchantId || null,
    secretRef: settings.secretRef || null,
  })).digest("hex").slice(0, 24);
}

function publicVerification(status, code, options = {}) {
  return {
    ok: status === "CONNECTED",
    status,
    code,
    idempotent: options.idempotent === true,
  };
}

async function evaluateConnection({ companyId, settings, credentialResolver, provider }) {
  const fingerprint = configurationFingerprint(companyId, settings);
  if (settings.status === "CONNECTED" && settings.verificationFingerprint === fingerprint) {
    return { ...publicVerification("CONNECTED", "VERIFIED", { idempotent: true }), fingerprint };
  }
  if (!settings.provider || !settings.environment || !settings.authMode) {
    return { ...publicVerification("NOT_CONNECTED", "INCOMPLETE_CONFIG"), fingerprint };
  }

  let resolved;
  try {
    resolved = await credentialResolver.resolve(settings, { companyId });
  } catch {
    return { ...publicVerification("ERROR", "CREDENTIAL_RESOLUTION_FAILED"), fingerprint };
  }
  if (!resolved?.configured) {
    return { ...publicVerification("NOT_CONNECTED", resolved?.code || "CREDENTIALS_NOT_CONFIGURED"), fingerprint };
  }

  try {
    const providerResult = await provider.verifyConnection({
      provider: settings.provider,
      environment: settings.environment,
      authMode: resolved.authMode,
      merchantId: resolved.merchantId,
    }, resolved.credentials);
    if (providerResult?.ok === true) return { ...publicVerification("CONNECTED", "VERIFIED"), fingerprint };
    if (providerResult?.code === "NOT_CONFIGURED") return { ...publicVerification("CONFIGURED", "NOT_CONFIGURED"), fingerprint };
    return { ...publicVerification("ERROR", providerResult?.code || "VERIFICATION_FAILED"), fingerprint };
  } catch {
    return { ...publicVerification("ERROR", "VERIFICATION_FAILED"), fingerprint };
  }
}

async function verifyPayoutConnection(db, request, { credentialResolver, provider }) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = assertCompanyScope(actor, request.data?.companyId);
  if (request.data && Object.keys(request.data).length) throw new Error("INVALID_VERIFICATION_INPUT");
  const companyRef = db.collection("Companies").doc(companyId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const snapshot = await settingsRef.get();
  if (!snapshot.exists) {
    await companyRef.collection("ActivityLogs").doc("payout-verify-no-settings").set({
      type: "payout_config_failed",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      metadata: { settingsId: "default", resultCode: "PAYOUT_SETTINGS_NOT_FOUND" },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
    return publicVerification("NOT_CONNECTED", "PAYOUT_SETTINGS_NOT_FOUND");
  }
  const settings = snapshot.data() || {};
  const outcome = await evaluateConnection({ companyId, settings, credentialResolver, provider });

  const transactionResult = await db.runTransaction(async (transaction) => {
    const latestSnapshot = await transaction.get(settingsRef);
    if (!latestSnapshot.exists) throw new Error("PAYOUT_SETTINGS_NOT_FOUND");
    const latest = latestSnapshot.data() || {};
    const latestFingerprint = configurationFingerprint(companyId, latest);
    if (latestFingerprint !== outcome.fingerprint) throw new Error("PAYOUT_CONFIG_CHANGED");
    if (latest.status === outcome.status && latest.verificationFingerprint === outcome.fingerprint) {
      return { ...publicVerification(outcome.status, outcome.code, { idempotent: true }), fingerprint: outcome.fingerprint };
    }

    const status = SAFE_STATUSES.has(outcome.status) ? outcome.status : "ERROR";
    transaction.update(settingsRef, {
      status,
      payoutsEnabled: status === "CONNECTED" && isCashfreePayoutAuthMode(latest.authMode),
      productionSecurityReady: false,
      verificationFingerprint: outcome.fingerprint,
      verifiedAt: status === "CONNECTED" ? FieldValue.serverTimestamp() : null,
      connectedAt: status === "CONNECTED" ? latest.connectedAt || FieldValue.serverTimestamp() : null,
      lastVerificationError: status === "CONNECTED" ? null : outcome.code,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const eventType = status === "CONNECTED" ? "payout_config_verified" : "payout_config_failed";
    const auditRef = companyRef.collection("ActivityLogs").doc(`payout-verify-${outcome.fingerprint}-${status.toLowerCase()}`);
    transaction.set(auditRef, {
      type: eventType,
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      metadata: { settingsId: "default", provider: latest.provider || null, environment: latest.environment || null, authMode: latest.authMode || null, resultCode: outcome.code },
      createdAt: FieldValue.serverTimestamp(),
    }, { merge: false });
    return { ...publicVerification(status, outcome.code), fingerprint: outcome.fingerprint };
  });

  const { fingerprint: _privateFingerprint, ...result } = transactionResult;
  return result;
}

module.exports = { configurationFingerprint, evaluateConnection, publicVerification, verifyPayoutConnection };
