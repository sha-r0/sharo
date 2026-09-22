import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import statutory from "../functions/src/workforce/payrollStatutory.js";
import { buildComplianceReport } from "../src/lib/esi-pf/compliance.js";
import { buildEcr, buildEsiWorkbook } from "../src/lib/esi-pf/exports.js";

const { captureStatutoryInputs, buildPayrollStatutory } = statutory;
function finalizedFixture() {
  const employee = { id: "employee-a", employeeId: "0001", personalInfo: { fullName: "Test Member" }, employment: { joiningDate: "2020-01-01" }, compensation: { monthlySalary: 18000, pfEnabled: true, esiEnabled: true }, salaryStructure: { includePf: true, includeEsi: true, employeePfPercent: 12, employerPfPercent: 12, employeeEsiPercent: 0.75, employerEsiPercent: 3.25 }, statutoryDetails: { uan: "001234567890", ipNumber: "0012345678" } };
  const payroll = { id: "p", employeeFirestoreId: employee.id, employeeName: "Test Member", month: "2026-09", status: "Processed", grossSalary: 18000, earnedSalary: 18000, bonus: 0, scheduledDays: 26, payableDays: 26, pendingDays: 0, pfEnabled: true, esiEnabled: true, pfDeduction: 1800, esiDeduction: 135, netSalary: 16065, compliance: { pf: { epfWages: 15000, epsWages: 15000, edliWages: 15000, refunds: 0 } } };
  payroll.statutoryInputs = captureStatutoryInputs(employee, payroll, payroll.month);
  payroll.compliance = buildPayrollStatutory(payroll);
  return { month: payroll.month, employees: [employee], payroll: [payroll] };
}

test("stored statutory calculations produce Ready records and exact ECR/ESIC portal files", () => {
  const data = finalizedFixture(), report = buildComplianceReport(data);
  assert.deepEqual(report.rows[0].pf.issues, []);
  assert.deepEqual(report.rows[0].esi.issues, []);
  assert.equal(report.exportStatus.pf.ready, true);
  assert.equal(report.exportStatus.esi.ready, true);
  assert.equal(buildEcr(report), "001234567890#~#Test Member#~#18000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#0#~#0\r\n");
  const workbook = XLSX.read(buildEsiWorkbook(report), { type: "buffer" });
  assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1, { header: 1, defval: "" })[1], ["0012345678", "Test Member", "26", "18000", "0", ""]);
});

test("exports use only stored results even after employee salaries, rates or calculation inputs change", () => {
  const data = finalizedFixture(), before = buildEcr(buildComplianceReport(data));
  data.employees[0].compensation.monthlySalary = 99000;
  data.employees[0].salaryStructure.employerPfPercent = 100;
  data.employees[0].salaryStructure.employerEsiPercent = 100;
  data.payroll[0].statutoryInputs.monthlySalary = 88000;
  assert.equal(buildEcr(buildComplianceReport(data)), before);
  assert.equal(buildComplianceReport(data).rows[0].esi.employerContribution, 585);
  assert.equal(data.payroll[0].netSalary, 16065);
});

test("versioned snapshots cannot fill missing identifiers or money from live employee/payroll values", () => {
  for (const field of ["grossWages", "epfWages", "epsWages", "edliWages", "employeePf", "employerPf", "employerEps", "ncpDays", "refundOfAdvance", "uan"]) {
    const data = finalizedFixture(); data.payroll[0].compliance.pf[field] = null;
    assert.throws(() => buildEcr(buildComplianceReport(data)), /EXPORT_BLOCKED/, field);
  }
  for (const field of ["esiWages", "employeeEsi", "employerEsi", "payableDays", "ipNumber"]) {
    const data = finalizedFixture(); data.payroll[0].compliance.esi[field] = null;
    assert.throws(() => buildEsiWorkbook(buildComplianceReport(data)), /EXPORT_BLOCKED/, field);
  }
});

test("snapshot month/version and stored payroll inconsistencies block export", () => {
  for (const mutate of [
    (row) => { row.compliance.month = "2026-08"; },
    (row) => { row.compliance.version = 999; },
    (row) => { row.compliance.pf.employeePf = 1700; },
    (row) => { row.compliance.issues.pf = ["Missing authoritative wage basis"]; },
  ]) {
    const data = finalizedFixture(); mutate(data.payroll[0]);
    assert.throws(() => buildEcr(buildComplianceReport(data)), /EXPORT_BLOCKED/);
  }
  const data = finalizedFixture(); data.payroll[0].compliance.esi.payableDays = 25;
  assert.throws(() => buildEsiWorkbook(buildComplianceReport(data)), /EXPORT_BLOCKED/);
});

test("deduction mismatch diagnostics prevent Ready without touching historical net salary", () => {
  const data = finalizedFixture(), payroll = data.payroll[0];
  payroll.pfDeduction = 0;
  payroll.compliance = buildPayrollStatutory(payroll);
  const before = structuredClone(payroll), report = buildComplianceReport(data);
  assert.ok(report.rows[0].pf.issues.some((issue) => issue.includes("deduction differs")));
  assert.equal(report.rows[0].pf.ready, false);
  assert.deepEqual(payroll, before);
  assert.equal(payroll.netSalary, 16065);
});

test("historical unversioned complete snapshots remain exportable without migration", () => {
  const data = finalizedFixture(), row = data.payroll[0], stored = row.compliance;
  row.compliance = { pf: { grossWages: stored.pf.grossWages, epfWages: stored.pf.epfWages, epsWages: stored.pf.epsWages, edliWages: stored.pf.edliWages, epsContribution: stored.pf.employerEps, employerContribution: stored.pf.employerPf, ncpDays: 0, refunds: 0 }, esi: { grossWages: stored.esi.esiWages, employerContribution: stored.esi.employerEsi } };
  delete row.statutoryInputs;
  const before = structuredClone(data);
  assert.equal(buildComplianceReport(data).exportStatus.pf.ready, true);
  assert.equal(buildComplianceReport(data).exportStatus.esi.ready, true);
  assert.ok(buildEcr(buildComplianceReport(data)));
  assert.deepEqual(data, before);
});

test("unknown statutory inputs stay blocked while finalized ESI can be ready independently", () => {
  const data = finalizedFixture(), payroll = data.payroll[0];
  delete payroll.compliance;
  payroll.compliance = buildPayrollStatutory(payroll);
  const report = buildComplianceReport(data);
  assert.equal(report.rows[0].pf.ready, false);
  assert.equal(report.rows[0].esi.ready, true);
  assert.equal(report.rows[0].pf.grossWages, 18000);
  assert.equal(report.rows[0].pf.epfWages, null);
  assert.throws(() => buildEcr(report), /EXPORT_BLOCKED/);
  assert.ok(buildEsiWorkbook(report).length);
});
