"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { captureStatutoryInputs, buildPayrollStatutory } = require("../src/workforce/payrollStatutory");
const { calculatePayrollRow, createWorkforceFunctions } = require("../src/workforce/WorkforceFunctions");

function fixture() {
  const employee = {
    employeeId: "0001", personalInfo: { fullName: "Test Member" }, employment: { joiningDate: "2020-01-01" },
    compensation: { monthlySalary: 18000, pfEnabled: true, esiEnabled: true, pfAmount: 1800, esiAmount: 135 },
    salaryStructure: { grossSalary: 18000, basicSalary: 10000, hra: 6000, otherAllowance: 2000, includePf: true, includeEsi: true, employeePfPercent: 12, employerPfPercent: 12, employeeEsiPercent: 0.75, employerEsiPercent: 3.25 },
    statutoryDetails: { uan: "001234567890", ipNumber: "0012345678" },
  };
  const payroll = { id: "2026-09_employee-a", month: "2026-09", companyId: "tenant-a", employeeFirestoreId: "employee-a", employeeId: "0001", employeeName: "Test Member", status: "Draft", scheduledDays: 26, payableDays: 26, pendingDays: 0, grossSalary: 18000, earnedSalary: 18000, bonus: 0, otherDeduction: 0, advanceDeduction: 0, pfEnabled: true, esiEnabled: true, pfDeduction: 1800, esiDeduction: 135, netSalary: 16065, compliance: { pf: { epfWages: 15000, epsWages: 15000, edliWages: 15000, refunds: 0 } } };
  payroll.statutoryInputs = captureStatutoryInputs(employee, payroll, payroll.month);
  return { employee, payroll };
}

test("finalization derives supported values, EPS split and ESI employer share without mutating net pay", () => {
  const { payroll } = fixture(), before = structuredClone(payroll);
  const result = buildPayrollStatutory(payroll);
  assert.deepEqual(result.pf, { applicable: true, uan: "001234567890", memberName: "Test Member", grossWages: 18000, epfWages: 15000, epsWages: 15000, edliWages: 15000, employeePf: 1800, employerEps: 1250, employerPf: 550, ncpDays: 0, refundOfAdvance: 0 });
  assert.deepEqual(result.esi, { applicable: true, ipNumber: "0012345678", memberName: "Test Member", esiWages: 18000, employeeEsi: 135, employerEsi: 585, payableDays: 26, zeroContributionReason: 0, lastWorkingDay: null });
  assert.deepEqual(result.issues, { pf: [], esi: [] });
  assert.equal(result.version, 2);
  assert.deepEqual(payroll, before);
});

test("ambiguous PF bases, EPS membership, EDLI exemptions and advance refunds are never guessed", () => {
  const { payroll } = fixture(); payroll.compliance = null;
  const result = buildPayrollStatutory(payroll);
  for (const field of ["epfWages", "epsWages", "edliWages", "employerEps", "employerPf", "refundOfAdvance"]) assert.equal(result.pf[field], null, field);
  assert.equal(result.pf.employeePf, 1800);
  assert.equal(result.esi.employerEsi, 585);
  payroll.advanceDeduction = 1000;
  assert.equal(buildPayrollStatutory(payroll).pf.refundOfAdvance, null);
});

test("basic-only wages are derived only when existing salary composition proves the PF basis", () => {
  const { employee, payroll } = fixture();
  employee.compensation.monthlySalary = 10000;
  Object.assign(employee.salaryStructure, { grossSalary: 10000, basicSalary: 10000, hra: 0, otherAllowance: 0 });
  Object.assign(payroll, { grossSalary: 10000, earnedSalary: 10000, pfDeduction: 1200, compliance: null });
  payroll.statutoryInputs = captureStatutoryInputs(employee, payroll, payroll.month);
  assert.equal(buildPayrollStatutory(payroll).pf.epfWages, 10000);
  delete payroll.statutoryInputs.salaryStructure.hra;
  assert.equal(buildPayrollStatutory(payroll).pf.epfWages, null);
  payroll.statutoryInputs.salaryStructure.hra = 100;
  assert.equal(buildPayrollStatutory(payroll).pf.epfWages, null);
});

test("missing salary source cannot silently turn the payroll calculator's fallback zero into statutory wages", () => {
  const { employee, payroll } = fixture(); delete employee.compensation;
  Object.assign(payroll, { grossSalary: 0, earnedSalary: 0, compliance: null });
  payroll.statutoryInputs = captureStatutoryInputs(employee, payroll, payroll.month);
  const result = buildPayrollStatutory(payroll);
  assert.equal(result.pf.grossWages, null);
  assert.equal(result.esi.esiWages, null);
  assert.ok(result.issues.esi.includes("Authoritative monthly wage basis unavailable"));
});

test("unclassified bonus/OT, partial NCP and missing rate inputs stay unresolved", () => {
  const { payroll } = fixture(); payroll.bonus = 1000;
  assert.equal(buildPayrollStatutory(payroll).pf.grossWages, 19000);
  assert.equal(buildPayrollStatutory(payroll).esi.esiWages, null);
  payroll.bonus = 0; payroll.overtimeAmount = 100;
  assert.equal(buildPayrollStatutory(payroll).esi.esiWages, null);
  delete payroll.overtimeAmount;
  payroll.payableDays = 13; payroll.earnedSalary = 9000;
  assert.equal(buildPayrollStatutory(payroll).pf.ncpDays, null);
  payroll.statutoryInputs.salaryStructure.employerEsiPercent = null;
  assert.equal(buildPayrollStatutory(payroll).esi.employerEsi, null);
});

test("rounding is applied to statutory outputs only, not payroll amounts", () => {
  const { payroll } = fixture();
  payroll.compliance.esi = { grossWages: 18000.01 };
  payroll.compliance.pf.epsWages = 10000;
  const result = buildPayrollStatutory(payroll);
  assert.equal(result.esi.employerEsi, 586);
  assert.equal(result.pf.employerEps, 833);
  assert.equal(result.pf.employerPf, 967);
  assert.equal(payroll.earnedSalary, 18000);
  assert.equal(payroll.esiDeduction, 135);
  assert.equal(payroll.netSalary, 16065);
  assert.ok(result.issues.esi.some((issue) => issue.includes("deduction/exemption")));
});

test("employee deduction and eligibility mismatches are blocked rather than changing net salary", () => {
  const { payroll } = fixture(); payroll.pfDeduction = 0; payroll.esiDeduction = 0; payroll.pfEnabled = false;
  const before = structuredClone(payroll), result = buildPayrollStatutory(payroll);
  assert.equal(result.pf.employeePf, 0); assert.equal(result.esi.employeeEsi, 0);
  assert.ok(result.issues.pf.some((issue) => issue.includes("eligibility")));
  assert.ok(result.issues.pf.some((issue) => issue.includes("deduction differs")));
  assert.ok(result.issues.esi.some((issue) => issue.includes("deduction/exemption")));
  assert.deepEqual(payroll, before);
});

test("zero wage reason and leaving date are only copied from explicit monthly evidence", () => {
  const { payroll } = fixture();
  Object.assign(payroll, { earnedSalary: 0, payableDays: 0, pfDeduction: 0, esiDeduction: 0, compliance: null });
  let result = buildPayrollStatutory(payroll);
  assert.equal(result.pf.ncpDays, 30);
  assert.equal(result.esi.zeroContributionReason, null);
  assert.equal(result.esi.lastWorkingDay, null);
  assert.ok(result.issues.esi.includes("Missing zeroContributionReason"));
  payroll.compliance = { esi: { zeroWageReasonCode: 2, lastWorkingDay: "2026-09-01" } };
  result = buildPayrollStatutory(payroll);
  assert.equal(result.esi.zeroContributionReason, 2);
  assert.equal(result.esi.lastWorkingDay, "2026-09-01");
});

test("legacy drafts have no invented salary inputs and keep explicitly stored old aliases", () => {
  const { payroll } = fixture(); delete payroll.statutoryInputs;
  payroll.compliance = { pf: { ...payroll.compliance.pf, grossWages: 18000, employerContribution: 550, epsContribution: 1250, ncpDays: 0 }, esi: { grossWages: 18000, employerContribution: 585, zeroWageReasonCode: 0 } };
  const result = buildPayrollStatutory(payroll);
  assert.equal(result.pf.employerPf, 550); assert.equal(result.pf.employerEps, 1250);
  assert.equal(result.esi.employerEsi, 585);
  assert.equal(result.pf.uan, null);
  payroll.compliance.pf.epfWages = "garbage";
  assert.equal(buildPayrollStatutory(payroll).pf.epfWages, null);
});

function harness({ payroll = fixture().payroll, permissions = ["payroll.approve"], failCommit = false } = {}) {
  const base = "Companies/tenant-a", payrollPath = `${base}/Payrolls/${payroll.id}`;
  const records = new Map([[base, { ownerUid: "owner" }], [payrollPath, structuredClone(payroll)], [`${base}/Usermanagement/reviewer`, { access: { authUid: "reviewer-auth", effectivePermissions: permissions } }]]);
  const reads = [], commits = [];
  const ref = (path, isCollection = false) => ({ path, isCollection, id: path.split("/").at(-1), collection: (name) => ref(`${path}/${name}`, true), doc: (id = "audit") => ref(`${path}/${id}`), get: async () => { reads.push(path); return isCollection ? collectionSnapshot(path) : snap(path); } });
  const snap = (path) => ({ id: path.split("/").at(-1), ref: ref(path), exists: records.has(path), data: () => records.get(path) });
  const collectionSnapshot = (path) => ({ docs: [...records.keys()].filter((key) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1).map(snap) });
  const db = { collection: (name) => ref(name, true), runTransaction: async (run) => {
    const writes = [];
    await run({
      get: async (reference) => { assert.equal(writes.length, 0); return reference.get(); },
      getAll: async (...references) => { assert.equal(writes.length, 0); return Promise.all(references.map((reference) => reference.get())); },
      update: (reference, data) => writes.push({ path: reference.path, data, merge: true }),
      set: (reference, data, options) => writes.push({ path: reference.path, data, merge: options?.merge }),
    });
    if (failCommit) throw new Error("commit failed");
    for (const write of writes) records.set(write.path, write.merge ? { ...records.get(write.path), ...write.data } : write.data);
    commits.push(writes);
  } };
  const functions = createWorkforceFunctions(db);
  const auth = { uid: "reviewer-auth", token: { companyId: "tenant-a", companyEmployeeId: "reviewer" } };
  const transition = (status, extra = {}) => functions.transitionPayroll.run({ auth, data: { payrollId: payroll.id, status, ...extra } });
  return { records, reads, commits, payrollPath, transition, functions, auth };
}

test("finalization atomically stores statutory results and unchanged salary snapshot; repeat is idempotent", async () => {
  const h = harness(), before = structuredClone(h.records.get(h.payrollPath));
  await h.transition("Processed", { companyId: "tenant-b", compliance: { pf: { employeePf: 999 } } });
  const processed = h.records.get(h.payrollPath);
  assert.equal(processed.status, "Processed");
  assert.equal(processed.compliance.version, 2);
  assert.equal(processed.compliance.pf.employeePf, before.pfDeduction);
  for (const key of ["netSalary", "earnedSalary", "grossSalary", "pfDeduction", "esiDeduction", "payableDays", "advanceDeduction", "otherDeduction"]) assert.equal(processed[key], before[key], key);
  assert.equal(processed.finalizedSnapshot.netSalary, before.netSalary);
  assert.equal(h.commits[0].length, 2);
  assert.ok(h.reads.every((path) => path.startsWith("Companies/tenant-a")));
  assert.ok(!h.reads.includes("Companies/tenant-a/Usermanagement/employee-a"));
  const frozen = structuredClone(processed.compliance);
  await h.transition("Processed");
  assert.deepEqual(h.records.get(h.payrollPath).compliance, frozen);
  await h.transition("Paid");
  assert.deepEqual(h.records.get(h.payrollPath).compliance, frozen);
});

test("historical processed rows transition to Paid without backfill or recalculation", async () => {
  const { payroll } = fixture(); payroll.status = "Processed"; delete payroll.compliance; delete payroll.statutoryInputs;
  const h = harness({ payroll }); await h.transition("Paid");
  const after = h.records.get(h.payrollPath);
  assert.equal(after.compliance, undefined);
  assert.equal(after.netSalary, payroll.netSalary);
  assert.equal(after.pfDeduction, payroll.pfDeduction);
});

test("payroll authorization, tenant mismatch, path injection and transaction failure cannot persist results", async () => {
  for (const permissions of [[], ["payroll.view"], ["payroll.export"], ["employee.manage"]]) {
    const h = harness({ permissions }); await assert.rejects(h.transition("Processed")); assert.equal(h.commits.length, 0);
  }
  let h = harness(); await assert.rejects(h.transition("Processed", { payrollId: "a/Payrolls/b" })); assert.equal(h.commits.length, 0);
  const { payroll } = fixture(); payroll.companyId = "tenant-b";
  h = harness({ payroll }); await assert.rejects(h.transition("Processed")); assert.equal(h.commits.length, 0);
  h = harness({ failCommit: true }); await assert.rejects(h.transition("Processed"));
  assert.equal(h.records.get(h.payrollPath).status, "Draft");
  assert.equal(h.records.get(h.payrollPath).compliance.version, undefined);
});

test("generation captures inputs, clears stale draft results, and leaves the original calculator untouched", async () => {
  const { employee, payroll } = fixture();
  const h = harness({ permissions: ["payroll.create"] });
  h.records.delete("Companies/tenant-a/Usermanagement/reviewer");
  h.records.set("Companies/tenant-a/Usermanagement/employee-a", employee);
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const expected = calculatePayrollRow({ employee, attendance: [], leaves: [], advances: [], month: payroll.month, holidays: new Set(), weeklyOff: "Sunday", adjustment: {} });
  await h.functions.generatePayroll.run({ auth, data: { month: payroll.month, statutoryInputs: { monthlySalary: 999 }, companyId: "tenant-b" } });
  const row = h.records.get(h.payrollPath);
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(row[key], value, key);
  assert.equal(row.statutoryInputs.monthlySalary, 18000);
  assert.equal(row.statutoryInputs.uan, employee.statutoryDetails.uan);
  assert.equal(row.compliance, null);
  row.status = "Processed";
  await assert.rejects(h.functions.generatePayroll.run({ auth, data: { month: payroll.month } }), /PAYROLL_FINALIZED/);
  assert.equal(h.records.get(h.payrollPath).status, "Processed");
});

module.exports = { fixture };
