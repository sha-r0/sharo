"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePayrollRow } = require("../src/workforce/WorkforceFunctions");
const { captureStatutoryInputs, buildPayrollStatutory } = require("../src/workforce/payrollStatutory");

const employee = (overrides = {}) => ({
  employeeId: "00000001",
  salaryStructure: {
    grossSalary: 30000, basicSalary: 12000, includePf: true, includeEsi: true,
    employeePfPercent: 12, employerPfPercent: 12, employeeEsiPercent: 0.75, employerEsiPercent: 3.25,
    ...overrides,
  },
  statutoryDetails: { uan: "123456789012", ipNumber: "1234567890" },
});

const calculate = (person, rules = { pf: { enabled: true, wageCeiling: 15000 }, esi: { enabled: true, eligibilityThreshold: 30000 } }) => calculatePayrollRow({
  employee: person, attendance: Array.from({ length: 26 }, () => ({ status: "present", checkOut: "done" })),
  leaves: [], advances: [], expenses: [], month: "2026-09", holidays: new Set(), weeklyOff: "Sunday", statutoryRules: rules,
});

test("PF uses prorated earned basic, configured ceiling/rate, and employer shares separately", () => {
  const row = calculate(employee());
  assert.equal(row.earnedBasicSalary, 12000);
  assert.equal(row.pfWages, 12000);
  assert.equal(row.pfDeduction, 1440);
  assert.equal(row.employerEps, 1000);
  assert.equal(row.employerPf, 440);
  assert.equal(row.netSalary, 28335);
});

test("PF disabled employee and disabled company produce no PF deduction or wages", () => {
  const employeeDisabled = calculate(employee({ includePf: false }));
  assert.equal(employeeDisabled.pfDeduction, 0);
  assert.equal(employeeDisabled.pfWages, 0);
  const companyDisabled = calculate(employee(), { pf: { enabled: false, wageCeiling: 15000 }, esi: { enabled: true, eligibilityThreshold: 30000 } });
  assert.equal(companyDisabled.pfDeduction, 0);
  assert.equal(companyDisabled.pfWages, 0);
});

test("ESI eligible employee uses earned salary and ceil rate; above threshold and disabled employee are excluded", () => {
  const eligible = calculate(employee({ grossSalary: 30000 }));
  assert.equal(eligible.esiEligible, true);
  assert.equal(eligible.esiWages, 30000);
  assert.equal(eligible.esiDeduction, 225);
  assert.equal(eligible.employerEsi, 975);
  const above = calculate(employee({ grossSalary: 30001 }));
  assert.equal(above.esiEligible, false);
  assert.equal(above.esiDeduction, 0);
  assert.equal(above.esiWages, 0);
  const disabled = calculate(employee({ includeEsi: false }));
  assert.equal(disabled.esiEligible, false);
  assert.equal(disabled.esiDeduction, 0);
});

test("employee PF/ESI deductions reduce net; employer contributions do not", () => {
  const row = calculate(employee());
  assert.equal(row.netSalary, row.earnedSalary - row.pfDeduction - row.esiDeduction);
  assert.equal(row.netSalary, 28335);
  assert.equal(row.employerPf + row.employerEps, 1440);
  assert.equal(row.employerEsi, 975);
});

test("preview/generation statutory fields are consumed first by finalized snapshot", () => {
  const person = employee();
  const row = calculate(person);
  const payroll = {
    month: "2026-09", employeeName: "Test", grossSalary: row.grossSalary, earnedSalary: row.earnedSalary,
    scheduledDays: row.scheduledDays, payableDays: row.payableDays, pendingDays: row.pendingDays,
    pfEnabled: row.pfEnabled, esiEnabled: row.esiEnabled, pfDeduction: row.pfDeduction, esiDeduction: row.esiDeduction,
    pfWages: row.pfWages, esiWages: row.esiWages, employerPf: row.employerPf, employerEps: row.employerEps, employerEsi: row.employerEsi,
    bonus: 0,
  };
  payroll.statutoryInputs = captureStatutoryInputs(person, payroll, payroll.month);
  const snapshot = buildPayrollStatutory(payroll);
  assert.equal(snapshot.pf.epfWages, row.pfWages);
  assert.equal(snapshot.pf.employeePf, row.pfDeduction);
  assert.equal(snapshot.pf.employerPf, row.employerPf);
  assert.equal(snapshot.pf.employerEps, row.employerEps);
  assert.equal(snapshot.esi.esiWages, row.esiWages);
  assert.equal(snapshot.esi.employeeEsi, row.esiDeduction);
  assert.equal(snapshot.esi.employerEsi, row.employerEsi);
  assert.equal(snapshot.esi.payableDays, row.payableDays);
  assert.ok(!snapshot.issues.esi.some((issue) => issue.includes("wages") || issue.includes("contribution")));
});

test("PF/ESI snapshot retains unresolved statutory membership/refund fields as validation issues", () => {
  const person = employee();
  const row = calculate(person);
  const payroll = { month: "2026-09", employeeName: "Test", grossSalary: row.grossSalary, earnedSalary: row.earnedSalary, scheduledDays: row.scheduledDays, payableDays: row.payableDays, pendingDays: 0, pfEnabled: true, esiEnabled: true, pfDeduction: row.pfDeduction, esiDeduction: row.esiDeduction, pfWages: row.pfWages, esiWages: row.esiWages, employerPf: row.employerPf, employerEps: row.employerEps, employerEsi: row.employerEsi, bonus: 0 };
  payroll.statutoryInputs = captureStatutoryInputs(person, payroll, payroll.month);
  const snapshot = buildPayrollStatutory(payroll);
  assert.ok(snapshot.issues.pf.includes("Missing ncpDays"));
  assert.ok(snapshot.issues.pf.includes("Missing refundOfAdvance"));
  assert.ok(snapshot.pf.epfWages !== null && snapshot.pf.epsWages !== null && snapshot.pf.edliWages !== null);
});
