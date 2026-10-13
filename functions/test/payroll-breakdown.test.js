"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePayrollRow } = require("../src/workforce/WorkforceFunctions");
const { expenseBreakdown } = require("../src/workforce/payrollExpenses");
const { adjustPayrollRow } = require("../src/workforce/payrollMath");
const expense = (extra = {}) => ({ id: "e", status: "approved", date: "2026-09-10", projectFirestoreId: "p", amount: 1000, reimbursements: [], ...extra });
const advance = (extra = {}) => ({ id: "a", advanceType: "Company", status: "Approved", projectId: "p", payoutStatus: "PAID", approvedAt: "2026-08-20", requiredDate: "2026-08-20", remainingAmount: 300, ...extra });

test("expenses use ledger outstanding, excluding paid, rejected, non-reimbursable and other months", () => {
  const result = expenseBreakdown([
    expense({ reimbursementLedgerVersion: 1, reimbursedAmount: 999, reimbursements: [{ amount: 250 }] }),
    expense({ id: "paid", reimbursements: [{ amount: 1000 }] }),
    expense({ id: "legacy-paid", reimbursed: true }),
    expense({ id: "paid-status", reimbursementStatus: "paid" }),
    expense({ id: "rejected", status: "rejected" }),
    expense({ id: "not-reimbursable", reimbursable: false }),
    expense({ id: "other-month", date: "2026-08-10" }),
  ], [], "2026-09");
  assert.equal(result.approvedExpenses, 750);
  assert.equal(result.reimbursement, 750);
  assert.equal(result.expenseItems.length, 1);
});

test("ambiguous reimbursement history is excluded with review issues instead of repaid", () => {
  const result = expenseBreakdown([expense({ reimbursedAmount: 500 }), expense({ id: "invalid", reimbursements: [{ amount: -1 }] })], [], "2026-09");
  assert.equal(result.approvedExpenses, 0);
  assert.equal(result.reimbursementIssues.length, 2);
});

test("full monthly company advances settle against pooled expenses without requiring payout", () => {
  const result = expenseBreakdown([expense(), expense({ id: "other-project", projectFirestoreId: "q", amount: 200 })], [
    advance({ remainingAmount: 2000 }),
    advance({ id: "unpaid", payoutStatus: "NOT_INITIATED" }),
    advance({ id: "future", requiredDate: "2026-10-01" }),
    advance({ id: "unrelated", projectId: "r" }),
    advance({ id: "settled", remainingAmount: 0 }),
    advance({ id: "personal", advanceType: "Personal" }),
  ], "2026-09");
  assert.equal(result.companyAdvanceOutstanding, 2600);
  assert.equal(result.companyAdvanceApplied, 1200);
  assert.equal(result.approvedExpenses, 1200);
  assert.equal(result.expenseAdjustment, -1400);
  assert.equal(result.reimbursement, 0);
  assert.equal(result.companyAdvanceItems.length, 3);
});

test("net adds reimbursement; only qualifying personal installments and existing PF/ESI reduce salary", () => {
  const inputs = {
    employee: { salaryStructure: { grossSalary: 26000, includePf: true, includeEsi: true }, compensation: { pfAmount: 100, esiAmount: 50 } },
    attendance: [{ status: "present", checkOut: {} }], leaves: [], month: "2026-09", holidays: new Set(), weeklyOff: "Sunday",
    statutoryRules: { pf: { enabled: true }, esi: { enabled: true, eligibilityThreshold: 30000 } },
    expenses: [expense()], advances: [advance(),
      advance({ id: "personal", advanceType: "Personal", monthlyDeduction: 200, firstDeductionDate: "2026-09-01" }),
      advance({ id: "future-personal", advanceType: "Personal", monthlyDeduction: 200, firstDeductionDate: "2026-10-01" }),
      advance({ id: "unknown-type", advanceType: "", monthlyDeduction: 200 }),
    ], adjustment: { bonus: 100, otherDeduction: 25 },
  };
  const row = calculatePayrollRow(inputs);
  assert.equal(row.earnedSalary, 1000);
  assert.equal(row.reimbursement, 700);
  assert.equal(row.personalAdvanceDeduction, 200);
  assert.deepEqual(row.advanceDeductions, [{ advanceId: "personal", amount: 200 }]);
  assert.equal(row.totalDeductions, 375);
  assert.equal(row.netSalary, 1425);
  assert.equal(adjustPayrollRow(row, "bonus", 200).netSalary, 1525);
  assert.equal(adjustPayrollRow(row, "otherDeduction", 5000).netSalary, 0);
  const disabled = calculatePayrollRow({ ...inputs, employee: { ...inputs.employee, salaryStructure: { grossSalary: 26000, includePf: false, includeEsi: false } } });
  assert.equal(disabled.pfDeduction, 0); assert.equal(disabled.esiDeduction, 0);
  const companyDisabled = calculatePayrollRow({ ...inputs, statutoryRules: {} });
  assert.equal(companyDisabled.pfDeduction, 0); assert.equal(companyDisabled.esiDeduction, 0);
});


test("legacy Company records without payout/project/remaining fields use actual dates and unsettled principal", () => {
  const result = expenseBreakdown([expense({ amount: 1000 })], [
    { id: "legacy", advanceType: "Company", status: "Approved", employeeId: "00000001", amount: "700", settledAmount: "200", requiredDate: "2026-09-01" },
    { id: "current", advanceType: "Company", status: "Approved", payoutStatus: "NOT_INITIATED", employeeFirestoreId: "employee-a", amount: 1000, remainingAmount: 300, approvedAt: { toDate: () => new Date("2026-09-05") }, projectId: "p" },
    { id: "zero", advanceType: "Company", status: "Approved", remainingAmount: 0, amount: 5000, requiredDate: "2026-09-01" },
  ], "2026-09");
  assert.equal(result.companyAdvanceOutstanding, 800);
  assert.equal(result.companyAdvanceApplied, 800);
  assert.equal(result.reimbursement, 200);
  assert.equal(result.companyAdvanceItems.find((item) => item.advanceId === "legacy").remainingAmount, 500);
});

test("date/status/type filters keep future and ineligible records out while carrying approved balances", () => {
  const records = [
    { id: "created", advanceType: " company ", status: " approved ", createdAt: "2026-08-01", amount: 100 },
    { id: "requested", advanceType: "Company", status: "Approved", requestedAt: "2026-09-01", amount: 200 },
    advance({ id: "future-approval", approvedAt: "2026-10-01", requiredDate: "2026-09-01" }),
    advance({ id: "future-required", requiredDate: "2026-10-01" }),
    advance({ id: "rejected", status: "Rejected" }), advance({ id: "pending", status: "Pending" }),
    advance({ id: "settled", status: "Settled" }), advance({ id: "personal", advanceType: "Personal" }),
  ];
  const result = expenseBreakdown([expense()], records, "2026-09");
  assert.equal(result.companyAdvanceOutstanding, 300);
  assert.equal(result.companyAdvanceApplied, 300);
});

test("full monthly allocation records expense coverage and salary recovery without exceeding balances", () => {
  const result = expenseBreakdown([expense({ amount: 300 }), expense({ id: "legacy-expense", projectFirestoreId: "", amount: 100 })], [
    advance({ id: "a-generic", projectId: "", remainingAmount: 1000 }),
    advance({ id: "z-specific", remainingAmount: 250 }),
    advance({ id: "other-project", projectId: "q", remainingAmount: 500 }),
  ], "2026-09");
  assert.equal(result.companyAdvanceOutstanding, 1750);
  assert.equal(result.companyAdvanceApplied, 400);
  assert.equal(result.reimbursement, 0);
  assert.equal(result.companyAdvanceSalaryRecovery, 1350);
  assert.ok(result.companyAdvanceItems.every((item) => item.appliedAmount <= item.remainingAmount));
  const mismatch = expenseBreakdown([expense()], [advance({ projectId: "q" })], "2026-09");
  assert.equal(mismatch.companyAdvanceOutstanding, 300);
  assert.equal(mismatch.companyAdvanceApplied, 300);
  assert.equal(mismatch.expenseAdjustment, 700);
});

test("company employee matching gives canonical Firestore identity precedence over compatibility ID", () => {
  const { matchesCompanyAdvanceEmployee } = require("../src/workforce/payrollExpenses");
  const ids = new Set(["employee-a", "00000001"]);
  assert.equal(matchesCompanyAdvanceEmployee({ employeeFirestoreId: "employee-a", employeeId: "wrong" }, "employee-a", ids), true);
  assert.equal(matchesCompanyAdvanceEmployee({ employeeFirestoreId: "employee-b", employeeId: "00000001" }, "employee-a", ids), false);
  assert.equal(matchesCompanyAdvanceEmployee({ employeeId: "00000001" }, "employee-a", ids), true);
  assert.equal(matchesCompanyAdvanceEmployee({ employeeId: "other" }, "employee-a", ids), false);
});
