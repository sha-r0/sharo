"use strict";

const crypto = require("node:crypto");

function transferIdForAdvance(companyId, advanceId) {
  const digest = crypto.createHash("sha256").update(`${companyId}:${advanceId}`).digest("hex").slice(0, 32);
  return `adv_${digest}`;
}

function payoutIdForAdvance(advanceId) {
  const safeId = String(advanceId || "").trim().replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 180);
  if (!safeId) throw new Error("INVALID_ADVANCE_ID");
  return `advance_${safeId}`;
}

module.exports = { payoutIdForAdvance, transferIdForAdvance };
