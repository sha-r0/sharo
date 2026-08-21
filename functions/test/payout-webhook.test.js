"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyTransition,
  mappedWebhookState,
  resolvePayoutRoute,
  sanitizedProviderFields,
  signatureFor,
  validateVerifiedPayload,
  verifyWebhookSignature,
  webhookEventId,
} = require("../src/payout/PayoutWebhookService");

const raw = Buffer.from(JSON.stringify({ type: "TRANSFER_SUCCESS", data: { transfer_id: "adv_test" } }));

test("invalid signature is rejected", () => {
  assert.equal(verifyWebhookSignature(raw, "123", "invalid", [{ clientSecret: "secret-a" }]), false);
});

test("Company A webhook cannot verify with Company B secret", () => {
  const signature = signatureFor(raw, "123", "company-a-secret");
  assert.equal(verifyWebhookSignature(raw, "123", signature, [{ clientSecret: "company-a-secret" }]), true);
  assert.equal(verifyWebhookSignature(raw, "123", signature, [{ clientSecret: "company-b-secret" }]), false);
});

test("transfer routing resolves the indexed company", async () => {
  const db = { collection: (name) => ({ doc: (id) => ({ id, get: async () => ({ exists: true, data: () => ({ companyId: "company-a", payoutId: "payout-a", type: "ADVANCE" }) }) }) }) };
  const route = await resolvePayoutRoute(db, "adv_test");
  assert.equal(route.companyId, "company-a");
  assert.equal(route.payoutId, "payout-a");
});

test("SUCCESS plus COMPLETED transitions advance to PAID", () => {
  const incoming = mappedWebhookState("TRANSFER_SUCCESS", { status: "SUCCESS", status_code: "COMPLETED" });
  assert.deepEqual(applyTransition("PROCESSING", "PROCESSING", incoming), { payoutStatus: "PAID", advancePayoutStatus: "PAID", firstPaid: true });
});

test("SUCCESS with another status code does not become PAID", () => {
  assert.deepEqual(mappedWebhookState("TRANSFER_SUCCESS", { status: "SUCCESS", status_code: "SENT_TO_BENEFICIARY" }), { payoutStatus: "PROCESSING", advancePayoutStatus: "PROCESSING" });
});

test("duplicate webhook event ID is deterministic and paid transition is not repeated", () => {
  assert.equal(webhookEventId("TRANSFER_SUCCESS", "adv_test", "hash"), webhookEventId("TRANSFER_SUCCESS", "adv_test", "hash"));
  assert.equal(applyTransition("PAID", "PAID", { payoutStatus: "PAID", advancePayoutStatus: "PAID" }).firstPaid, false);
});

test("pending event after success cannot regress state", () => {
  assert.deepEqual(applyTransition("SUCCESS", "PAID", { payoutStatus: "PROCESSING", advancePayoutStatus: "PROCESSING" }), { payoutStatus: "PAID", advancePayoutStatus: "PAID", firstPaid: false });
});

test("failed and rejected events map to non-success states", () => {
  assert.equal(mappedWebhookState("TRANSFER_FAILED", {}).payoutStatus, "FAILED");
  assert.equal(mappedWebhookState("TRANSFER_REJECTED", {}).payoutStatus, "REJECTED");
});

test("reversed event can replace confirmed success", () => {
  assert.deepEqual(applyTransition("SUCCESS", "PAID", mappedWebhookState("TRANSFER_REVERSED", {})), { payoutStatus: "REVERSED", advancePayoutStatus: "REVERSED", firstPaid: false });
});

test("amount and beneficiary mismatches are rejected", () => {
  const payout = { transferId: "adv_test", amount: 100, beneficiaryId: "bene-a" };
  const payload = { data: { transfer_id: "adv_test", transfer_amount: 101, beneficiary_details: { beneficiary_id: "bene-b" } } };
  assert.deepEqual(validateVerifiedPayload(payload, payout).sort(), ["BENEFICIARY_ID_MISMATCH", "TRANSFER_AMOUNT_MISMATCH"]);
});

test("UTR is retained in sanitized provider fields", () => {
  assert.equal(sanitizedProviderFields({ transfer_utr: "UTR-123/ABC" }).transferUtr, "UTR-123/ABC");
});

test("bank details are never included in persisted provider fields", () => {
  const fields = sanitizedProviderFields({ status: "SUCCESS", beneficiary_details: { beneficiary_instrument_details: { bank_account_number: "1234567890", bank_ifsc: "HDFC0001234" } } });
  assert.equal(Object.hasOwn(fields, "beneficiary_details"), false);
  assert.equal(JSON.stringify(fields).includes("1234567890"), false);
  assert.equal(JSON.stringify(fields).includes("HDFC0001234"), false);
});
