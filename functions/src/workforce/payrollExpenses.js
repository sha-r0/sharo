"use strict";

const { deriveReimbursement } = require("../expense/reimbursement");
const normalize = (value) => String(value || "").trim().toLowerCase();
const cents = (value) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value) * 100)) : 0;
const projectOf = (item) => String(item.projectFirestoreId || item.projectId || "").trim();
function monthOf(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7) : "";
}

function companyAdvanceBalance(advance) {
  // Current records carry a remaining balance; legacy records may only have
  // principal and settlements. Explicit zero must never fall back to principal.
  return advance.remainingAmount != null && advance.remainingAmount !== ""
    ? cents(advance.remainingAmount)
    : Math.max(0, cents(advance.amount) - cents(advance.settledAmount));
}

function companyAdvanceEligible(advance, month) {
  if (normalize(advance.advanceType) !== "company") return false;

  const selectedMonth = monthOf(advance.requiredDate);

  // Company advance belongs only to the employee-selected month.
  if (!selectedMonth || selectedMonth !== month) return false;

  // Ignore already fully settled records.
  return companyAdvanceBalance(advance) > 0;
}

function matchesCompanyAdvanceEmployee(advance, employeeFirestoreId, employeeIds) {
  const canonicalId = String(advance.employeeFirestoreId || "").trim();
  return canonicalId ? canonicalId === employeeFirestoreId : employeeIds.has(String(advance.employeeId || "").trim());
}

// Inputs are employee-scoped by the authenticated backend. No payment or
// settlement is performed here; these are inspectable generation snapshots.
function expenseBreakdown(expenses, advances, month) {
  const expenseItems = [], companyAdvanceItems = [], reimbursementIssues = [];
  let approvedCents = 0;
  for (const expense of expenses) {
    if (normalize(expense.status) !== "approved" || monthOf(expense.date) !== month) continue;
    const state = deriveReimbursement({ ...expense, status: "approved" }, expense.reimbursements || []);
    if (state.reconciliationRequired) {
      reimbursementIssues.push(`Expense ${expense.id}: reimbursement ledger needs reconciliation`);
      continue;
    }
    // Legacy paid flags/statuses must never become a new payroll reimbursement.
    if (expense.reimbursed === true || normalize(expense.reimbursementStatus) === "paid") continue;
    const outstanding = cents(state.outstandingAmount);
    if (!outstanding) continue;
    const projectId = projectOf(expense);
    approvedCents += outstanding;
    expenseItems.push({ expenseId: expense.id, projectId, approvedAmount: cents(expense.amount) / 100, reimbursedAmount: state.reimbursedAmount, outstandingAmount: outstanding / 100 });
  }
  let offsetCents = 0;
  // Monthly settlement pools this employee's eligible expenses against the full
  // company advance balance. Project IDs remain in the audit snapshot only.
  const eligible = advances.filter((advance) => companyAdvanceEligible(advance, month))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
  for (const advance of eligible) {
    const balance = companyAdvanceBalance(advance);
    if (!balance) continue;
    const applied = Math.min(balance, approvedCents - offsetCents);
    offsetCents += applied;
    companyAdvanceItems.push({
      advanceId: advance.id, projectId: projectOf(advance), remainingAmount: balance / 100,
      appliedAmount: applied / 100, expenseCoveredAmount: applied / 100,
      salaryRecoveredAmount: (balance - applied) / 100,
    });
  }
  const companyAdvanceOutstanding = companyAdvanceItems.reduce((sum, item) => sum + cents(item.remainingAmount), 0) / 100;
  return {
    approvedExpenses: approvedCents / 100,
    companyAdvanceOutstanding,
    companyAdvance: companyAdvanceOutstanding, // Compatibility for existing saved-row consumers.
    companyAdvanceApplied: offsetCents / 100,
    expenseAdjustment: (approvedCents - cents(companyAdvanceOutstanding)) / 100,
    companyAdvanceSalaryRecovery: (cents(companyAdvanceOutstanding) - offsetCents) / 100,
    companyAdvanceSettlementVersion: 1,
    reimbursement: Math.max(0, approvedCents - cents(companyAdvanceOutstanding)) / 100, // Legacy positive-only field.
    expenseItems, companyAdvanceItems, reimbursementIssues,
  };
}
module.exports = { expenseBreakdown, matchesCompanyAdvanceEmployee, companyAdvanceBalance };
