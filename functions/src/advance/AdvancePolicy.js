"use strict";

const FINAL_DECISIONS = new Set(["Approved", "Rejected"]);

function hasPermission(actor, permission) {
  return Boolean(actor?.isOwner || actor?.permissions?.includes(permission));
}

function normalizeDecision(action) {
  const value = String(action || "").trim().toLowerCase();
  if (value === "approve" || value === "approved") return "Approved";
  if (value === "reject" || value === "rejected") return "Rejected";
  throw new Error("INVALID_ADVANCE_ACTION");
}

function authorizeDecision({ actor, advanceCompanyId, employeeFirestoreId, status, action }) {
  if (!actor?.uid) throw new Error("UNAUTHENTICATED");
  if (!actor.companyId || actor.companyId !== advanceCompanyId) throw new Error("COMPANY_MISMATCH");
  if (!hasPermission(actor, "advance.approve")) throw new Error("FORBIDDEN");
  if (actor.employeeId && actor.employeeId === employeeFirestoreId) throw new Error("SELF_APPROVAL_FORBIDDEN");

  const decision = normalizeDecision(action);
  const current = String(status || "").trim().toLowerCase();
  if (current !== "pending") throw new Error("ADVANCE_ALREADY_DECIDED");
  return { decision };
}

function validateAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
    throw new Error("INVALID_ADVANCE_AMOUNT");
  }
  return amount;
}

module.exports = { FINAL_DECISIONS, authorizeDecision, hasPermission, normalizeDecision, validateAmount };
