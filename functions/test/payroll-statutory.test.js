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
  const { employee, payroll } = fixture(); delete employee.compensation; delete employee.salaryStructure.grossSalary;
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


test("canonical gross salary wins over legacy fields, including explicit zero", () => {
  const { salarySource, netSalary, adjustPayrollRow } = require("../src/workforce/payrollMath");
  const employee = { salaryStructure: { grossSalary: "30000" }, salary: 90000 };
  const calculate = () => calculatePayrollRow({ employee, attendance: [{ status: "present", checkOut: {} }], leaves: [], advances: [], month: "2026-10", holidays: new Set(), weeklyOff: "Sunday" });
  assert.equal(calculate().grossSalary, 30000);
  assert.equal(calculate().earnedSalary, 30000 / 27);
  assert.equal(captureStatutoryInputs(employee, {}, "2026-10").monthlySalary, 30000);
  employee.salaryStructure.grossSalary = 0;
  assert.equal(calculate().grossSalary, 0);
  employee.salaryStructure.grossSalary = "";
  assert.equal(salarySource(employee), 90000);
  const row = { earnedSalary: 10000, advanceDeduction: 1000, pfDeduction: 1200, esiDeduction: 75, bonus: 0, otherDeduction: 0 };
  const adjusted = adjustPayrollRow(row, "bonus", "500");
  assert.equal(adjusted.netSalary, 8225);
  assert.equal(netSalary({ ...adjusted, overtimeAmount: 99999 }), 8225);
  assert.equal(adjustPayrollRow(adjusted, "otherDeduction", 100000).netSalary, 0);
  assert.equal(adjustPayrollRow(row, "bonus", "invalid").netSalary, 7725);
});

test("read-only preview and generation use identical calculations; saved rows win over changed source", async () => {
  const h = harness();
  h.records.delete(h.payrollPath);
  h.records.delete("Companies/tenant-a/Usermanagement/reviewer");
  const base = "Companies/tenant-a";
  const employee = { ...fixture().employee, salary: 99000, salaryStructure: { ...fixture().employee.salaryStructure, grossSalary: 30000 }, employment: { shiftPolicyId: "shift-a" } };
  h.records.set(`${base}/Usermanagement/employee-a`, employee);
  h.records.set(`${base}/ShiftPolicies/shift-a`, { weeklyOff: { primary: "Saturday" } });
  h.records.set(`${base}/Holidays/2026-10-02`, { date: "2026-10-02" });
  h.records.set(`${base}/PayrollSettings/current`, { statutoryRules: { pf: { enabled: true }, esi: { enabled: true, eligibilityThreshold: 30000 } } });
  for (const [day, status] of [["01", "present"], ["05", "halfday"], ["06", "absent"], ["07", "pending"]]) h.records.set(`${base}/Attendance/a-${day}`, { employeeFirestoreId: "employee-a", date: `2026-10-${day}`, status, checkOut: status === "pending" ? null : "done" });
  h.records.set(`${base}/LeaveRequests/l`, { employeeFirestoreId: "employee-a", fromDate: "2026-10-08", totalDays: 1, leaveType: "Paid", status: "Approved" });
  h.records.set(`${base}/advance_requests/a`, { employeeFirestoreId: "employee-a", status: "Approved", advanceType: "Personal", remainingAmount: 500, monthlyDeduction: 200 });
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const data = { month: "2026-10", companyId: "tenant-b", adjustments: { "employee-a": { bonus: 500, otherDeduction: 100 } } };
  const preview = await h.functions.previewPayroll.run({ auth, data });
  assert.equal(preview.saved, false);
  assert.equal(h.commits.length, 0);
  assert.equal(preview.rows[0].grossSalary, 30000);
  assert.equal(preview.rows[0].scheduledDays, 25);
  assert.equal(preview.rows[0].payableDays, 2.5);
  assert.equal(preview.rows[0].netSalary, 1265);
  const generated = await h.functions.generatePayroll.run({ auth, data });
  assert.deepEqual(preview.rows, generated.rows);
  assert.equal(generated.saved, true);
  employee.salaryStructure.grossSalary = 999999;
  const stored = await h.functions.previewPayroll.run({ auth, data });
  assert.equal(stored.saved, true);
  assert.equal(stored.rows[0].grossSalary, 30000);
  assert.equal(stored.rows[0].netSalary, 1265);
  assert.ok(h.reads.every((path) => path.startsWith(base)));
});

test("preview requires payroll view and cannot write; generation still requires write permission", async () => {
  const denied = harness({ permissions: ["employee.manage"] });
  await assert.rejects(denied.functions.previewPayroll.run({ auth: denied.auth, data: { month: "2026-09" } }));
  assert.equal(denied.commits.length, 0);
  const viewer = harness({ permissions: ["payroll.view"] });
  assert.equal((await viewer.functions.previewPayroll.run({ auth: viewer.auth, data: { month: "2026-09" } })).saved, true);
  await assert.rejects(viewer.functions.generatePayroll.run({ auth: viewer.auth, data: { month: "2026-09" } }));
  await assert.rejects(viewer.functions.previewPayroll.run({ auth: viewer.auth, data: { month: "invalid" } }));
  assert.equal(viewer.commits.length, 0);
});


test("September preview and generation include active Usermanagement employees without salary or Firebase login", async () => {
  const h = harness();
  h.records.delete(h.payrollPath);
  h.records.delete("Companies/tenant-a/Usermanagement/reviewer");
  const base = "Companies/tenant-a/Usermanagement";
  const included = {
    active: { employment: { status: "Active" } },
    lowercase: { employment: { status: " active " } },
    legacy: { status: "Active" },
    notice: { employment: { status: "Notice Period" } },
    noLogin: { employment: { status: "Active" }, access: { status: "inactive", loginEnabled: false, authUid: null } },
    accessOnly: { access: { status: "active" } },
    legacyMissingStatus: { personalInfo: { fullName: "Legacy employee" } },
  };
  for (const [id, employee] of Object.entries(included)) h.records.set(`${base}/${id}`, employee);
  h.records.set(`${base}/inactive`, { employment: { status: "Inactive" }, access: { status: "active" } });
  h.records.set(`${base}/terminated`, { employment: { status: "Terminated" } });
  h.records.set("Companies/tenant-b/Usermanagement/otherTenant", { employment: { status: "Active" } });
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const data = { month: "2026-09", companyId: "tenant-b" };
  const preview = await h.functions.previewPayroll.run({ auth, data });
  assert.deepEqual(preview.rows.map((row) => row.employeeFirestoreId).sort(), Object.keys(included).sort());
  assert.equal(h.commits.length, 0);
  for (const row of preview.rows) {
    assert.equal(row.month, "2026-09");
    assert.equal(row.statutoryInputs.monthlySalary, null);
  }
  const generated = await h.functions.generatePayroll.run({ auth, data });
  assert.deepEqual(generated.rows, preview.rows);
  assert.ok(h.reads.every((path) => path.startsWith("Companies/tenant-a")));
});

test("preview and generation read canonical expense ledgers and persist identical breakdown without payments", async () => {
  const h = harness();
  const base = "Companies/tenant-a";
  h.records.delete(h.payrollPath);
  h.records.delete(`${base}/Usermanagement/reviewer`);
  h.records.set(`${base}/Usermanagement/employee-a`, fixture().employee);
  const expense = { companyId: "tenant-a", employeeFirestoreId: "employee-a", projectFirestoreId: "p", status: "approved", date: "2026-09-05", amount: 1000, reimbursementLedgerVersion: 1, reimbursedAmount: 0 };
  h.records.set(`${base}/Expenses/e`, expense);
  h.records.set(`${base}/Expenses/e/Reimbursements/r`, { companyId: "tenant-a", amount: 250 });
  h.records.set(`${base}/Expenses/other`, { ...expense, employeeFirestoreId: "other-employee" });
  h.records.set(`${base}/advance_requests/a`, { companyId: "tenant-a", employeeFirestoreId: "employee-a", advanceType: "Company", projectId: "p", status: "Approved", payoutStatus: "NOT_INITIATED", approvedAt: "2026-09-01", remainingAmount: 300 });
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const data = { month: "2026-09", companyId: "tenant-b", reimbursement: 999999 };
  const preview = await h.functions.previewPayroll.run({ auth, data });
  assert.equal(preview.rows[0].approvedExpenses, 750);
  assert.equal(preview.rows[0].companyAdvance, 300);
  assert.equal(preview.rows[0].reimbursement, 450);
  assert.equal(preview.rows[0].netSalary, 450);
  assert.equal(h.commits.length, 0);
  const generated = await h.functions.generatePayroll.run({ auth, data });
  assert.deepEqual(generated.rows, preview.rows);
  const saved = h.records.get(`${base}/Payrolls/2026-09_employee-a`);
  assert.equal(saved.reimbursement, 450);
  assert.equal(saved.expenseItems[0].expenseId, "e");
  assert.equal(saved.companyAdvanceItems[0].advanceId, "a");
  assert.equal(saved.personalAdvanceDeduction, 0);
  assert.equal(saved.totalDeductions, 0);
  assert.equal(saved.breakdownVersion, 2);
  assert.deepEqual(h.records.get(`${base}/Expenses/e`), expense);
  assert.equal(h.records.get(`${base}/advance_requests/a`).remainingAmount, 300);
  assert.ok(h.reads.includes(`${base}/Expenses/e/Reimbursements`));
  assert.ok(h.reads.every((path) => path.startsWith(base)));
});

test("legacy/current Company advances and business ID order agree across preview, generation and stored reload", async () => {
  const h = harness();
  const base = "Companies/tenant-a";
  h.records.delete(h.payrollPath);
  h.records.delete(`${base}/Usermanagement/reviewer`);
  for (const [id, employeeId] of [["first-doc", "00000028"], ["second-doc", "00000002"], ["last-doc", "00000001"]]) {
    h.records.set(`${base}/Usermanagement/${id}`, { employeeId, employment: { status: "Active" } });
  }
  h.records.set(`${base}/Expenses/e`, { employeeFirestoreId: "last-doc", status: "approved", date: "2026-09-05", amount: 1000 });
  h.records.set(`${base}/advance_requests/legacy`, { employeeId: "00000001", advanceType: "Company", status: "Approved", requiredDate: "2026-09-01", amount: 600, settledAmount: 100 });
  h.records.set(`${base}/advance_requests/current`, { employeeFirestoreId: "last-doc", employeeId: "wrong", advanceType: "Company", status: "Approved", approvedAt: "2026-09-01", payoutStatus: "NOT_INITIATED", remainingAmount: 200 });
  h.records.set(`${base}/advance_requests/conflict`, { employeeFirestoreId: "first-doc", employeeId: "00000001", advanceType: "Company", status: "Approved", requestedAt: "2026-08-01", amount: 10 });
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const data = { month: "2026-09" };
  const preview = await h.functions.previewPayroll.run({ auth, data });
  assert.deepEqual(preview.rows.map((row) => row.employeeId), ["00000001", "00000002", "00000028"]);
  assert.equal(preview.rows[0].companyAdvanceOutstanding, 700);
  assert.equal(preview.rows[0].companyAdvanceApplied, 700);
  assert.equal(preview.rows[0].reimbursement, 300);
  assert.equal(preview.rows[2].companyAdvanceOutstanding, 10);
  const generated = await h.functions.generatePayroll.run({ auth, data });
  assert.deepEqual(generated.rows, preview.rows);
  const saved = await h.functions.previewPayroll.run({ auth, data });
  assert.equal(saved.saved, true);
  assert.deepEqual(saved.rows.map((row) => row.employeeId), ["00000001", "00000002", "00000028"]);
  assert.equal(saved.rows[0].companyAdvanceOutstanding, 700);
  assert.equal(saved.rows[0].netSalary, generated.rows[0].netSalary);
});

async function monthlySettlementHarness(approvedExpenses) {
  const h = harness();
  const base = "Companies/tenant-a";
  h.records.delete(h.payrollPath);
  h.records.delete(`${base}/Usermanagement/reviewer`);
  h.records.set(`${base}/Usermanagement/employee-a`, fixture().employee);
  h.records.set(`${base}/Expenses/monthly`, { companyId: "tenant-a", employeeFirestoreId: "employee-a", status: "approved", date: "2026-09-05", amount: approvedExpenses });
  const advancePath = `${base}/advance_requests/company`;
  h.records.set(advancePath, { companyId: "tenant-a", employeeFirestoreId: "employee-a", advanceType: "Company", status: "Approved", requiredDate: "2026-09-01", amount: 5500, settledAmount: 500, remainingAmount: 5000 });
  for (let day = 1; day <= 26; day++) h.records.set(`${base}/Attendance/day-${day}`, { employeeFirestoreId: "employee-a", date: `2026-09-${String(day).padStart(2, "0")}`, status: "present", checkOut: "done" });
  const auth = { uid: "owner", token: { companyId: "tenant-a" } };
  const call = (name, data) => h.functions[name].run({ auth, data });
  return { ...h, advancePath, call };
}

for (const [expenses, adjustment, covered, recovered] of [[6750, 1750, 5000, 0], [5000, 0, 5000, 0], [4000, -1000, 4000, 1000]]) {
  test(`monthly expenses ${expenses} minus advance 5000 = ${adjustment}; Paid settles exactly once`, async () => {
    const h = await monthlySettlementHarness(expenses);
    const before = structuredClone(h.records.get(h.advancePath));
    const preview = await h.call("previewPayroll", { month: "2026-09" });
    const generated = await h.call("generatePayroll", { month: "2026-09" });
    assert.deepEqual(preview.rows, generated.rows);
    const row = generated.rows[0];
    assert.equal(row.expenseAdjustment, adjustment);
    assert.equal(row.netSalary, row.earnedSalary + adjustment);
    assert.equal(row.companyAdvanceApplied, covered);
    assert.equal(row.companyAdvanceSalaryRecovery, recovered);
    assert.deepEqual(structuredClone(h.records.get(h.advancePath)), before);
    await h.call("transitionPayroll", { payrollId: row.id, status: "Processed" });
    assert.deepEqual(structuredClone(h.records.get(h.advancePath)), before);
    await h.call("transitionPayroll", { payrollId: row.id, status: "Paid" });
    const advance = structuredClone(h.records.get(h.advancePath));
    assert.equal(advance.remainingAmount, 0);
    assert.equal(advance.settledAmount, 5500);
    assert.equal(advance.status, "Settled");
    assert.equal(advance.companyAdvanceSettlement.expenseCoveredAmount, covered);
    assert.equal(advance.companyAdvanceSettlement.salaryRecoveredAmount, recovered);
    assert.equal(advance.companyAdvanceSettlement.payrollId, row.id);
    const payrollPath = `Companies/tenant-a/Payrolls/${row.id}`;
    const paid = structuredClone(h.records.get(payrollPath));
    assert.equal(paid.status, "Paid");
    assert.ok(paid.companyAdvanceRecoveryAppliedAt);
    await h.call("transitionPayroll", { payrollId: row.id, status: "Paid" });
    assert.deepEqual(structuredClone(h.records.get(h.advancePath)), advance);
    assert.deepEqual(structuredClone(h.records.get(payrollPath)), paid);
    assert.equal(h.commits.at(-1).length, 0);
    const next = await h.call("previewPayroll", { month: "2026-10" });
    assert.equal(next.rows[0].companyAdvanceOutstanding, 0);
    assert.equal(next.rows[0].expenseAdjustment, 0);
  });
}

test("a previously generated future payroll cannot recover an advance already settled by another payroll", async () => {
  const h = await monthlySettlementHarness(4000);
  const september = (await h.call("generatePayroll", { month: "2026-09" })).rows[0];
  const october = (await h.call("generatePayroll", { month: "2026-10" })).rows[0];
  for (const row of [september, october]) await h.call("transitionPayroll", { payrollId: row.id, status: "Processed" });
  await h.call("transitionPayroll", { payrollId: september.id, status: "Paid" });
  const advance = structuredClone(h.records.get(h.advancePath));
  await assert.rejects(h.call("transitionPayroll", { payrollId: october.id, status: "Paid" }), /balance changed or was already settled/);
  assert.deepEqual(structuredClone(h.records.get(h.advancePath)), advance);
  assert.equal(h.records.get(`Companies/tenant-a/Payrolls/${october.id}`).status, "Processed");
});

test("changed or mismatched advance records cannot partially commit payroll settlement", async () => {
  for (const change of [{ remainingAmount: 4000 }, { employeeFirestoreId: "other-employee" }, { companyId: "tenant-b" }]) {
    const h = await monthlySettlementHarness(4000);
    const row = (await h.call("generatePayroll", { month: "2026-09" })).rows[0];
    await h.call("transitionPayroll", { payrollId: row.id, status: "Processed" });
    Object.assign(h.records.get(h.advancePath), change);
    const advance = structuredClone(h.records.get(h.advancePath));
    const payrollPath = `Companies/tenant-a/Payrolls/${row.id}`, before = structuredClone(h.records.get(payrollPath));
    await assert.rejects(h.call("transitionPayroll", { payrollId: row.id, status: "Paid" }));
    assert.deepEqual(structuredClone(h.records.get(h.advancePath)), advance);
    assert.deepEqual(structuredClone(h.records.get(payrollPath)), before);
  }
});

test("failed commit rolls back Paid and company settlement together", async () => {
  const original = await monthlySettlementHarness(4000);
  const row = (await original.call("generatePayroll", { month: "2026-09" })).rows[0];
  await original.call("transitionPayroll", { payrollId: row.id, status: "Processed" });
  const payroll = original.records.get(`Companies/tenant-a/Payrolls/${row.id}`);
  const failing = harness({ payroll, failCommit: true });
  failing.records.set(original.advancePath, structuredClone(original.records.get(original.advancePath)));
  const beforeAdvance = structuredClone(failing.records.get(original.advancePath));
  const beforePayroll = structuredClone(failing.records.get(failing.payrollPath));
  await assert.rejects(failing.transition("Paid"), /commit failed/);
  assert.deepEqual(structuredClone(failing.records.get(original.advancePath)), beforeAdvance);
  assert.deepEqual(structuredClone(failing.records.get(failing.payrollPath)), beforePayroll);
});

test("legacy company-offset payroll cannot silently settle a balance it never deducted", async () => {
  const payroll = { ...fixture().payroll, companyAdvanceOutstanding: 5000, reimbursement: 0, approvedExpenses: 4000 };
  const h = harness({ payroll });
  await assert.rejects(h.transition("Processed"), /predates full company advance settlement/);
  assert.equal(h.commits.length, 0);
});
