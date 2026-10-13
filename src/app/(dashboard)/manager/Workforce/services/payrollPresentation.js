import payrollOrder from "../../../../../../functions/src/workforce/payrollOrder.js";
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
export const companyOutstanding = (row) => row.companyAdvanceOutstanding ?? row.companyAdvance;
export const expenseAdjustment = (row) => row.expenseAdjustment ?? row.reimbursement;
export const adjustmentTone = (value) => number(value) < 0 ? "text-red-600" : number(value) > 0 ? "text-green-700" : "text-slate-700";
export const signedAdjustment = (value) => `${number(value) > 0 ? "+" : number(value) < 0 ? "-" : ""}₹${Math.abs(number(value)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const personalDeduction = (row) => row.personalAdvanceDeduction ?? row.advanceDeduction;
export const deductions = (row) => number(personalDeduction(row)) + number(row.pfDeduction) + number(row.esiDeduction) + number(row.otherDeduction) + Math.max(0, -number(row.expenseAdjustment));
export function payrollTotals(rows) {
  return rows.reduce((sum, row) => ({
    gross: sum.gross + number(row.grossSalary), earned: sum.earned + number(row.earnedSalary),
    expenseAdjustment: sum.expenseAdjustment + number(expenseAdjustment(row)),
    deductions: sum.deductions + deductions(row), net: sum.net + number(row.netSalary),
  }), { gross: 0, earned: 0, expenseAdjustment: 0, deductions: 0, net: 0 });
}
export function payrollExportRows(rows) {
  return payrollOrder.sortPayrollEmployees(rows).map((row) => ({
    Employee: row.employeeName, Employee_ID: row.employeeId, Month: row.month,
    Gross_Salary: row.grossSalary, Scheduled_Days: row.scheduledDays,
    Present_Days: row.presentDays, Paid_Leave: row.paidLeaveDays, Payable_Days: row.payableDays,
    Earned_Salary: row.earnedSalary, Approved_Expenses: row.approvedExpenses ?? "",
    Company_Advance_Outstanding: companyOutstanding(row) ?? "", Company_Advance_Applied: row.companyAdvanceApplied ?? "",
    Expense_Adjustment: expenseAdjustment(row) ?? "", Company_Advance_Salary_Recovery: row.companyAdvanceSalaryRecovery ?? "", Personal_Advance_Deduction: personalDeduction(row) ?? "",
    PF: row.pfDeduction ?? "", ESI: row.esiDeduction ?? "", Bonus: row.bonus,
    Other_Deduction: row.otherDeduction, Total_Deductions: deductions(row), Net_Salary: row.netSalary,
    Status: row.status, Reimbursement_Issues: (row.reimbursementIssues || []).join("; "),
  }));
}
