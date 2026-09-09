"use strict";

const crypto = require("node:crypto");
const { FieldValue } = require("firebase-admin/firestore");
const { isCashfreePayoutAuthMode } = require("./PayoutPolicy");

const SUPPORTED_EVENTS = new Set([
  "TRANSFER_ACKNOWLEDGED",
  "TRANSFER_SUCCESS",
  "TRANSFER_FAILED",
  "TRANSFER_REJECTED",
  "TRANSFER_REVERSED",
]);

function rawBodyBuffer(request) {
  if (Buffer.isBuffer(request?.rawBody)) return request.rawBody;
  if (typeof request?.rawBody === "string") return Buffer.from(request.rawBody, "utf8");
  throw new Error("RAW_BODY_REQUIRED");
}

function parseRoutingHint(rawBody) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > 1_000_000) throw new Error("INVALID_WEBHOOK_BODY");
  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new Error("INVALID_WEBHOOK_BODY");
  }
  return {
    eventType: String(payload?.type || "").trim().toUpperCase(),
    transferId: String(payload?.data?.transfer_id || "").trim(),
    payload,
  };
}

function signatureFor(rawBody, timestamp, clientSecret) {
  return crypto.createHmac("sha256", clientSecret).update(Buffer.concat([Buffer.from(String(timestamp), "utf8"), rawBody])).digest("base64");
}

function timingSafeSignatureEqual(expected, provided) {
  const left = Buffer.from(String(expected || ""), "utf8");
  const right = Buffer.from(String(provided || ""), "utf8");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function verifyWebhookSignature(rawBody, timestamp, providedSignature, credentials) {
  if (!timestamp || !providedSignature || !Array.isArray(credentials) || !credentials.length) return false;
  return credentials.some((credential) => credential?.clientSecret
    && timingSafeSignatureEqual(signatureFor(rawBody, timestamp, credential.clientSecret), providedSignature));
}

async function resolvePayoutRoute(db, transferId) {
  if (!transferId || transferId.length > 40) return null;
  const indexRef = db.collection("PayoutTransferIndex").doc(transferId);
  const indexSnapshot = await indexRef.get();
  if (indexSnapshot.exists) {
    const index = indexSnapshot.data() || {};
    if (!index.companyId || !index.payoutId || index.type !== "ADVANCE") return null;
    return { companyId: index.companyId, payoutId: index.payoutId, type: index.type, indexRef, legacy: false };
  }
  const fallback = await db.collectionGroup("Payouts").where("transferId", "==", transferId).limit(2).get();
  if (fallback.size !== 1) return null;
  const payoutDocument = fallback.docs[0];
  const companyRef = payoutDocument.ref.parent.parent;
  if (!companyRef || companyRef.parent.id !== "Companies" || payoutDocument.data()?.type !== "ADVANCE") return null;
  return { companyId: companyRef.id, payoutId: payoutDocument.id, type: payoutDocument.data()?.type, indexRef, legacy: true };
}

function validateVerifiedPayload(payload, payout) {
  const data = payload?.data || {};
  const mismatches = [];
  if (String(data.transfer_id || "") !== String(payout.transferId || "")) mismatches.push("TRANSFER_ID_MISMATCH");
  if (data.cf_transfer_id != null && payout.cfTransferId != null && String(data.cf_transfer_id) !== String(payout.cfTransferId)) mismatches.push("CF_TRANSFER_ID_MISMATCH");
  const beneficiaryId = data.beneficiary_details?.beneficiary_id;
  if (beneficiaryId != null && String(beneficiaryId) !== String(payout.beneficiaryId || "")) mismatches.push("BENEFICIARY_ID_MISMATCH");
  if (data.transfer_amount != null && Math.round(Number(data.transfer_amount) * 100) !== Math.round(Number(payout.amount) * 100)) mismatches.push("TRANSFER_AMOUNT_MISMATCH");
  return mismatches;
}

function mappedWebhookState(eventType, data) {
  if (eventType === "TRANSFER_REVERSED") return { payoutStatus: "REVERSED", advancePayoutStatus: "REVERSED" };
  if (eventType === "TRANSFER_FAILED") return { payoutStatus: "FAILED", advancePayoutStatus: "FAILED" };
  if (eventType === "TRANSFER_REJECTED") return { payoutStatus: "REJECTED", advancePayoutStatus: "REJECTED" };
  if (eventType === "TRANSFER_SUCCESS" && String(data?.status).toUpperCase() === "SUCCESS" && String(data?.status_code).toUpperCase() === "COMPLETED") {
    return { payoutStatus: "PAID", advancePayoutStatus: "PAID" };
  }
  return { payoutStatus: "PROCESSING", advancePayoutStatus: "PROCESSING" };
}

function applyTransition(currentPayoutStatus, currentAdvancePayoutStatus, incoming) {
  if (currentPayoutStatus === "REVERSED") return { payoutStatus: "REVERSED", advancePayoutStatus: "REVERSED", firstPaid: false };
  if (incoming.payoutStatus === "REVERSED") return { ...incoming, firstPaid: false };
  if (["SUCCESS", "PAID"].includes(currentPayoutStatus)) {
    return { payoutStatus: "PAID", advancePayoutStatus: "PAID", firstPaid: currentAdvancePayoutStatus !== "PAID" };
  }
  if (["FAILED", "REJECTED"].includes(currentPayoutStatus) && incoming.payoutStatus === "PROCESSING") {
    return { payoutStatus: currentPayoutStatus, advancePayoutStatus: currentAdvancePayoutStatus || currentPayoutStatus, firstPaid: false };
  }
  return { ...incoming, firstPaid: incoming.advancePayoutStatus === "PAID" && currentAdvancePayoutStatus !== "PAID" };
}

const sanitizedText = (value, max) => value == null ? null : String(value).replace(/[^A-Za-z0-9._:/-]/g, "_").slice(0, max);

function sanitizedProviderFields(data) {
  return {
    providerStatus: sanitizedText(data?.status, 50),
    providerStatusCode: sanitizedText(data?.status_code, 80),
    cfTransferId: sanitizedText(data?.cf_transfer_id, 100),
    transferUtr: sanitizedText(data?.transfer_utr, 100),
  };
}

function webhookEventId(eventType, transferId, rawHash) {
  return crypto.createHash("sha256").update(`${eventType}:${transferId}:${rawHash}`).digest("hex").slice(0, 40);
}

async function recordVerifiedMismatch(db, route, eventId, eventType, transferId, mismatches) {
  const eventRef = db.collection("PayoutWebhookEvents").doc(eventId);
  const activityRef = db.collection("Companies").doc(route.companyId).collection("ActivityLogs").doc(`payout-webhook-security-${eventId}`);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(eventRef);
    if (existing.exists) return;
    transaction.create(eventRef, { companyId: route.companyId, payoutId: route.payoutId, type: eventType, transferId, outcome: "REJECTED_MISMATCH", mismatchCodes: mismatches, createdAt: FieldValue.serverTimestamp() });
    transaction.create(activityRef, { type: "payout_webhook_security_mismatch", companyId: route.companyId, actorId: "cashfree-webhook", actorEmployeeId: null, metadata: { payoutId: route.payoutId, transferId, eventType, mismatchCodes: mismatches }, createdAt: FieldValue.serverTimestamp() });
  });
}

async function processVerifiedWebhook(db, route, parsed, rawHash, notificationService) {
  const { eventType, transferId, payload } = parsed;
  const eventId = webhookEventId(eventType, transferId, rawHash);
  const companyRef = db.collection("Companies").doc(route.companyId);
  const payoutRef = companyRef.collection("Payouts").doc(route.payoutId);
  const preflight = await payoutRef.get();
  if (!preflight.exists) throw new Error("PAYOUT_NOT_FOUND");
  const mismatches = validateVerifiedPayload(payload, preflight.data() || {});
  if (mismatches.length) {
    await recordVerifiedMismatch(db, route, eventId, eventType, transferId, mismatches);
    return { handled: false, mismatch: true };
  }

  const eventRef = db.collection("PayoutWebhookEvents").doc(eventId);
  const data = payload.data || {};
  const transactionResult = await db.runTransaction(async (transaction) => {
    const existingEvent = await transaction.get(eventRef);
    if (existingEvent.exists) {
      const existing = existingEvent.data() || {};
      return { duplicate: true, notifyPaid: existing.notifyPaid === true && existing.notificationSent !== true, employeeFirestoreId: existing.employeeFirestoreId, advanceId: existing.advanceId };
    }
    const payoutSnapshot = await transaction.get(payoutRef);
    if (!payoutSnapshot.exists) throw new Error("PAYOUT_NOT_FOUND");
    const payout = payoutSnapshot.data() || {};
    const advanceRef = companyRef.collection("advance_requests").doc(payout.advanceId);
    const advanceSnapshot = await transaction.get(advanceRef);
    if (!advanceSnapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
    const currentAdvance = advanceSnapshot.data() || {};
    const transition = applyTransition(payout.status, currentAdvance.payoutStatus, mappedWebhookState(eventType, data));
    const providerFields = sanitizedProviderFields(data);
    const paidAt = transition.firstPaid ? FieldValue.serverTimestamp() : payout.paidAt || null;
    const cfTransferId = providerFields.cfTransferId || payout.cfTransferId || null;
    const transferUtr = providerFields.transferUtr || payout.transferUtr || null;
    transaction.update(payoutRef, {
      status: transition.payoutStatus,
      providerStatus: providerFields.providerStatus,
      providerStatusCode: providerFields.providerStatusCode,
      cfTransferId,
      transferUtr,
      paidAt,
      failureCode: ["FAILED", "REJECTED", "REVERSED"].includes(transition.payoutStatus) ? sanitizedText(data.status_code, 80) || transition.payoutStatus : null,
      failureReason: ["FAILED", "REJECTED", "REVERSED"].includes(transition.payoutStatus) ? eventType : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(advanceRef, { payoutStatus: transition.advancePayoutStatus, updatedAt: FieldValue.serverTimestamp() });
    if (route.legacy) transaction.set(route.indexRef, { companyId: route.companyId, payoutId: route.payoutId, type: "ADVANCE", createdAt: FieldValue.serverTimestamp() }, { merge: true });
    transaction.create(eventRef, {
      companyId: route.companyId, payoutId: route.payoutId, advanceId: payout.advanceId, employeeFirestoreId: payout.employeeFirestoreId,
      type: eventType, transferId, rawHash, outcome: transition.payoutStatus, notifyPaid: transition.firstPaid, notificationSent: false,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(companyRef.collection("ActivityLogs").doc(`payout-webhook-${eventId}`), {
      type: "advance_payout_webhook_processed", companyId: route.companyId, actorId: "cashfree-webhook", actorEmployeeId: null,
      targetUserId: payout.employeeFirestoreId, metadata: { advanceId: payout.advanceId, payoutId: route.payoutId, transferId, eventType, status: transition.payoutStatus },
      createdAt: FieldValue.serverTimestamp(),
    });
    return { duplicate: false, notifyPaid: transition.firstPaid, employeeFirestoreId: payout.employeeFirestoreId, advanceId: payout.advanceId };
  });

  if (transactionResult.notifyPaid) {
    await notificationService.emit({
      companyId: route.companyId, type: "advance.paid", module: "advance", sourceCollection: "advance_requests", sourceId: transactionResult.advanceId,
      eventKey: `paid-${transferId}`, data: {}, receiverIds: [transactionResult.employeeFirestoreId], actionRoute: "/manager/advance",
    });
    await eventRef.update({ notificationSent: true, notificationSentAt: FieldValue.serverTimestamp() });
  }
  return { handled: true, duplicate: transactionResult.duplicate };
}

async function handlePayoutWebhook(db, request, { secretStore, notificationService }) {
  const rawBody = rawBodyBuffer(request);
  const parsed = parseRoutingHint(rawBody);
  if (!SUPPORTED_EVENTS.has(parsed.eventType)) return { httpStatus: 200, body: { ok: true, ignored: true } };
  if (!parsed.transferId) return { httpStatus: 400, body: { ok: false } };
  const signature = request.get?.("x-webhook-signature") || request.headers?.["x-webhook-signature"];
  const timestamp = request.get?.("x-webhook-timestamp") || request.headers?.["x-webhook-timestamp"];
  if (!signature || !timestamp) return { httpStatus: 400, body: { ok: false } };
  const route = await resolvePayoutRoute(db, parsed.transferId);
  if (!route) return { httpStatus: 404, body: { ok: false } };
  const companyRef = db.collection("Companies").doc(route.companyId);
  const [settingsSnapshot, payoutSnapshot] = await Promise.all([
    companyRef.collection("PayoutSettings").doc("default").get(),
    companyRef.collection("Payouts").doc(route.payoutId).get(),
  ]);
  if (!settingsSnapshot.exists || !payoutSnapshot.exists) return { httpStatus: 404, body: { ok: false } };
  const settings = settingsSnapshot.data() || {};
  if (!isCashfreePayoutAuthMode(settings.authMode) || settings.environment !== "sandbox" || !settings.secretRef) return { httpStatus: 403, body: { ok: false } };
  const credentials = await secretStore.resolveAllEnabled(settings.secretRef, { companyId: route.companyId });
  if (!verifyWebhookSignature(rawBody, timestamp, signature, credentials)) return { httpStatus: 401, body: { ok: false } };

  const trustedPayout = payoutSnapshot.data() || {};
  if (trustedPayout.transferId !== parsed.transferId) return { httpStatus: 409, body: { ok: false } };
  const rawHash = crypto.createHash("sha256").update(rawBody).digest("hex");
  const result = await processVerifiedWebhook(db, route, parsed, rawHash, notificationService);
  return { httpStatus: 200, body: { ok: true, ...result } };
}

module.exports = {
  SUPPORTED_EVENTS,
  applyTransition,
  handlePayoutWebhook,
  mappedWebhookState,
  parseRoutingHint,
  processVerifiedWebhook,
  resolvePayoutRoute,
  sanitizedProviderFields,
  signatureFor,
  timingSafeSignatureEqual,
  validateVerifiedPayload,
  verifyWebhookSignature,
  webhookEventId,
};
