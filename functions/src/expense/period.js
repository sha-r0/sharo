"use strict";

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
function periodFromDate(value) {
  const period = String(value || "").slice(0, 7);
  if (!PERIOD_RE.test(period)) throw new Error("INVALID_PERIOD");
  return period;
}
async function assertExpensePeriodOpen(transaction, company, date) {
  if (!date) return null;
  const period = periodFromDate(date);
  const snapshot = await transaction.get(company.collection("ExpensePeriods").doc(period));
  if (snapshot.exists && snapshot.data()?.status === "locked") throw new Error("EXPENSE_PERIOD_LOCKED");
  return period;
}
module.exports = { periodFromDate, assertExpensePeriodOpen };
