"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("../auth/CompanyActor");
const { assertCompanyScope, validatePayoutSettingsInput } = require("./PayoutPolicy");

const DEFAULTS = Object.freeze({
  provider: "cashfree",
  environment: "sandbox",
  status: "NOT_CONNECTED",
  payoutsEnabled: false,
  merchantId: null,
  authMode: null,
  secretRef: null,
});

function publicSettings(data = {}) {
  return {
    provider: data.provider || DEFAULTS.provider,
    environment: data.environment || DEFAULTS.environment,
    status: data.status || DEFAULTS.status,
    payoutsEnabled: data.payoutsEnabled === true,
    merchantId: data.merchantId || null,
    authMode: data.authMode || null,
    hasSecretRef: Boolean(data.secretRef),
    connectedAt: data.connectedAt || null,
    createdAt: data.createdAt || null,
    updatedAt: data.updatedAt || null,
  };
}

function auditSettings(data = {}) {
  const settings = publicSettings(data);
  delete settings.createdAt;
  delete settings.updatedAt;
  return settings;
}

async function getPayoutSettings(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = assertCompanyScope(actor, request.data?.companyId);
  const snapshot = await db.collection("Companies").doc(companyId).collection("PayoutSettings").doc("default").get();
  return publicSettings(snapshot.exists ? snapshot.data() : DEFAULTS);
}

async function updatePayoutSettings(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const companyId = assertCompanyScope(actor, request.data?.companyId);
  const safeInput = validatePayoutSettingsInput(request.data || {});
  const companyRef = db.collection("Companies").doc(companyId);
  const settingsRef = companyRef.collection("PayoutSettings").doc("default");
  const auditRef = companyRef.collection("ActivityLogs").doc();

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(settingsRef);
    const current = snapshot.exists ? { ...DEFAULTS, ...snapshot.data() } : { ...DEFAULTS };
    const next = {
      ...safeInput,
      status: "NOT_CONNECTED",
      payoutsEnabled: false,
      secretRef: current.secretRef || null,
      verificationFingerprint: null,
      verifiedAt: null,
      connectedAt: null,
      lastVerificationError: null,
      createdAt: snapshot.exists && current.createdAt ? current.createdAt : FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(settingsRef, next, { merge: false });
    transaction.create(auditRef, {
      type: "company.payout-settings-updated",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      companyId,
      before: auditSettings(current),
      after: auditSettings(next),
      metadata: { settingsId: "default" },
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  const saved = await settingsRef.get();
  return publicSettings(saved.data());
}

module.exports = { DEFAULTS, getPayoutSettings, publicSettings, updatePayoutSettings };
