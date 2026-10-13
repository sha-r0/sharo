import test from "node:test";
import assert from "node:assert/strict";
import { payrollTotals, payrollExportRows } from "../src/app/(dashboard)/manager/Workforce/services/payrollPresentation.js";

test("summary/export include reimbursement and all deductions without subtracting company advance twice", () => {
  const rows = [{ grossSalary: 26000, earnedSalary: 1000, approvedExpenses: 1000, companyAdvance: 300, companyAdvanceApplied: 300, reimbursement: 700, personalAdvanceDeduction: 200, advanceDeduction: 200, pfDeduction: 100, esiDeduction: 50, bonus: 100, otherDeduction: 25, netSalary: 1425 }];
  assert.deepEqual(payrollTotals(rows), { gross: 26000, earned: 1000, expenseAdjustment: 700, deductions: 375, net: 1425 });
  const [row] = payrollExportRows(rows);
  assert.equal(row.Approved_Expenses, 1000); assert.equal(row.Company_Advance_Outstanding, 300);
  assert.equal(row.Expense_Adjustment, 700); assert.equal(row.Personal_Advance_Deduction, 200);
  assert.equal(row.PF, 100); assert.equal(row.ESI, 50); assert.equal(row.Total_Deductions, 375);
  assert.equal(row.Net_Salary, 1425);
});

test("legacy saved net remains authoritative and missing expense breakdown is not fabricated", () => {
  const rows = [{ advanceDeduction: 50, netSalary: 1234 }];
  assert.equal(payrollTotals(rows).net, 1234);
  assert.equal(payrollTotals(rows).deductions, 50);
  const [row] = payrollExportRows(rows);
  assert.equal(row.Approved_Expenses, ""); assert.equal(row.Expense_Adjustment, "");
  assert.equal(row.Personal_Advance_Deduction, 50); assert.equal(row.Net_Salary, 1234);
});

test("export sorts business employee IDs numerically without changing leading zeros or stored amounts", () => {
  const rows = [
    { id: "a", employeeName: "A", employeeId: "00000028", netSalary: 28 },
    { id: "z", employeeName: "Z", employeeId: "00000002", netSalary: 2 },
    { id: "b", employeeName: "B", employeeId: "00000001", netSalary: 1 },
    { id: "c", employeeId: "STAFF-B", netSalary: 40 },
    { id: "d", employeeId: "STAFF-A", netSalary: 30 },
  ];
  const result = payrollExportRows(rows);
  assert.deepEqual(result.map((row) => row.Employee_ID), ["00000001", "00000002", "00000028", "STAFF-A", "STAFF-B"]);
  assert.deepEqual(result.map((row) => row.Net_Salary), [1, 2, 28, 30, 40]);
  assert.equal(rows[0].employeeId, "00000028");
});

test("signed expense adjustments retain sign in totals/export and use positive green, negative red", async () => {
  const { expenseAdjustment, signedAdjustment, adjustmentTone } = await import("../src/app/(dashboard)/manager/Workforce/services/payrollPresentation.js");
  for (const [value, label, tone] of [[1750, "+₹1,750", "text-green-700"], [0, "₹0", "text-slate-700"], [-1000, "-₹1,000", "text-red-600"]]) {
    const row = { expenseAdjustment: value, netSalary: 10000 + value };
    assert.equal(expenseAdjustment(row), value);
    assert.equal(signedAdjustment(value), label);
    assert.equal(adjustmentTone(value), tone);
    assert.equal(payrollTotals([row]).expenseAdjustment, value);
    assert.equal(payrollTotals([row]).deductions, Math.max(0, -value));
    assert.equal(payrollExportRows([row])[0].Expense_Adjustment, value);
  }
});
