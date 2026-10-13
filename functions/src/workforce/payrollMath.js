"use strict";

const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

function salarySource(employee) {
  const gross = employee.salaryStructure?.grossSalary;
  // An explicit zero is authoritative; an empty form field uses legacy data.
  if (gross !== undefined && gross !== null && gross !== "") return gross;
  return employee.salary || employee.employment?.salary || employee.compensation?.monthlySalary || employee.compensation?.gross || employee.payroll?.salary;
}

function netSalary(row) {
  return Math.max(0, number(row.earnedSalary) + number(row.expenseAdjustment ?? row.reimbursement) + number(row.bonus)
    - number(row.personalAdvanceDeduction ?? row.advanceDeduction) - number(row.pfDeduction)
    - number(row.esiDeduction) - number(row.otherDeduction));
}

function totalDeductions(row) {
  return number(row.personalAdvanceDeduction ?? row.advanceDeduction) + number(row.pfDeduction)
    + number(row.esiDeduction) + number(row.otherDeduction) + Math.max(0, -number(row.expenseAdjustment));
}

function adjustPayrollRow(row, key, value) {
  if (!["bonus", "otherDeduction"].includes(key)) return row;
  const next = { ...row, [key]: Math.max(0, number(value)) };
  return { ...next, totalDeductions: totalDeductions(next), netSalary: netSalary(next) };
}

module.exports = { salarySource, netSalary, totalDeductions, adjustPayrollRow };
