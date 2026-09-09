const paidStatuses = new Set(["paid", "completed", "approved"]);
const activeStatuses = new Set(["paid", "completed", "approved", "pending", "submitted", "processing"]);
const inactiveStatuses = new Set(["failed", "cancelled", "rejected", "void"]);

const lower = (value) => String(value || "").trim().toLowerCase();

export function isVendorPaymentFinanciallyPaid(payment = {}) {
  return paidStatuses.has(lower(payment?.status));
}

export function isVendorPaymentActiveAllocation(payment = {}) {
  const status = lower(payment?.status);
  return activeStatuses.has(status);
}

export function isVendorPaymentInactive(payment = {}) {
  return inactiveStatuses.has(lower(payment?.status));
}

export function evaluateVendorPayment({ allocatedAmount, paidAmount, paymentAmount, managerApproved }) {
  const allocated = Number(allocatedAmount || 0); const paid = Number(paidAmount || 0); const amount = Number(paymentAmount || 0);
  if (!(amount > 0)) return { allowed: false, reason: "Payment amount must be greater than zero." };
  const nextPaid = paid + amount; const exceeds = nextPaid > allocated;
  if (exceeds && !managerApproved) return { allowed: false, reason: "Payment exceeds the allocated amount and requires manager approval.", allocated, paid, nextPaid, exceeds };
  return { allowed: true, allocated, paid, nextPaid, exceeds, remaining: Math.max(0, allocated - nextPaid), paymentPercent: allocated ? Math.round(nextPaid / allocated * 10_000) / 100 : 0 };
}
