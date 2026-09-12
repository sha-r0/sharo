const money = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value) * 100) / 100) : 0;

// Passing ledger records makes them authoritative; the no-ledger call supports legacy consumers.
export function deriveReimbursement(expense, records) {
  if (expense.status !== "approved" || expense.reimbursable === false || expense.reimbursementStatus === "not_applicable") {
    return { reimbursementStatus: "not_applicable", reimbursedAmount: 0, outstandingAmount: 0 };
  }
  const amount = money(expense.amount);
  const ledgerAmount = records?.reduce((sum, record) => sum + (typeof record.amount === "number" && Number.isFinite(record.amount) && record.amount > 0 ? Math.round(record.amount * 100) : 0), 0) / 100;
  const reconciliationRequired = records !== undefined && (records.some((record) => typeof record.amount !== "number" || !Number.isFinite(record.amount) || record.amount <= 0) || ledgerAmount > amount || (!records.length && !expense.reimbursementLedgerVersion && money(expense.reimbursedAmount) > 0 && expense.reimbursed !== true));
  const reimbursedAmount = expense.reimbursed === true ? amount : records !== undefined ? money(ledgerAmount) : Math.min(amount, money(expense.reimbursedAmount));
  const outstandingAmount = money(amount - reimbursedAmount);
  return { ...(reconciliationRequired ? { reconciliationRequired: true } : {}), reimbursedAmount, outstandingAmount, reimbursementStatus: outstandingAmount === 0 ? "paid" : reimbursedAmount > 0 ? "partially_paid" : "unpaid" };
}
