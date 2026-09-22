import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildComplianceReport, validateMonth } from "../src/lib/esi-pf/compliance.js";
import { buildEcr, buildEsiWorkbook, buildPreviewWorkbook, ESI_HEADERS, PF_HEADERS } from "../src/lib/esi-pf/exports.js";
import { createComplianceGet, loadComplianceDataset } from "../src/lib/esi-pf/server.js";
import { requireCompanyPermission } from "../src/lib/server/companyPermission.js";
import { canAccessPath } from "../src/app/allservice/rbac/AuthorizationService.js";

const month = "2026-09";
const fixture = () => ({
  month,
  employees: [{ id: "doc-a", employeeId: "0001", personalInfo: { fullName: "Test Member" }, salaryStructure: { includePf: true, includeEsi: true, basicSalary: 99999 }, statutoryDetails: { uan: "001234567890", ipNumber: "0012345678" } }],
  payroll: [{ id: "2026-09_doc-a", month, companyId: "company-a", employeeFirestoreId: "doc-a", employeeId: "0001", employeeName: "Test Member", status: "Processed", grossSalary: 30000, earnedSalary: 18000, payableDays: 25.5, pfEnabled: true, esiEnabled: true, pfDeduction: 1800, esiDeduction: 135,
    compliance: {
      pf: { grossWages: 18000, epfWages: 15000, epsWages: 15000, edliWages: 15000, epsContribution: 1250, employerContribution: 550, ncpDays: 4, refunds: 0 },
      esi: { grossWages: 18000, employerContribution: 585 },
    },
  }],
});

test("finalized stored values are used without salary/rate calculations or input mutation", () => {
  const data = fixture(), before = structuredClone(data), report = buildComplianceReport(data);
  assert.deepEqual(data, before);
  assert.deepEqual(report.summary, { totalEmployees: 1, pfEligible: 1, esiEligible: 1, missingData: 0 });
  assert.equal(report.rows[0].pf.employeeContribution, 1800);
  assert.equal(report.rows[0].pf.employerContribution, 550);
  assert.equal(report.rows[0].pf.epfWages, 15000);
  assert.equal(report.rows[0].esi.workingDays, 25.5);
  assert.equal(report.rows[0].pf.ready, true);
  assert.equal(report.rows[0].esi.ready, true);
});

test("Draft, unknown status and other months cannot supply amounts or identifiers", () => {
  for (const status of ["Draft", "Pending", "Approved", "", undefined]) {
    const data = fixture(); data.payroll[0].status = status;
    data.payroll[0].finalizedAt = "2026-09-30";
    const report = buildComplianceReport(data);
    assert.equal(report.rows[0].pf.employeeContribution, null);
    assert.ok(report.rows[0].pf.issues.includes("Missing payroll"));
    assert.equal(report.ignoredDrafts, 1);
    assert.throws(() => buildEcr(report), /EXPORT_BLOCKED/);
  }
  const data = fixture(); data.payroll[0].month = "2026-08";
  assert.equal(buildComplianceReport(data).rows[0].earnedSalary, null);
  for (const status of ["Processed", "Paid", "Finalized", "processed"]) {
    data.payroll[0].month = month; data.payroll[0].status = status;
    assert.equal(buildComplianceReport(data).rows[0].pf.ready, true);
  }
});

test("actual existing writer schema is flagged, never filled with guessed statutory data", () => {
  const data = fixture(); delete data.payroll[0].compliance; delete data.employees[0].statutoryDetails;
  const report = buildComplianceReport(data), row = report.rows[0];
  assert.ok(row.pf.issues.includes("Missing UAN"));
  assert.ok(row.esi.issues.includes("Missing IP No."));
  assert.equal(row.pf.epfWages, null);
  assert.equal(row.pf.grossWages, null);
  assert.equal(row.esi.employerContribution, null);
  assert.equal(row.payrollGrossSalary, 30000);
  assert.equal(row.earnedSalary, 18000);
  assert.equal(row.pf.employeeContribution, 1800);
  assert.equal(report.summary.missingData, 1);
  assert.throws(() => buildEcr(report), /EXPORT_BLOCKED/);
  assert.throws(() => buildEsiWorkbook(report), /EXPORT_BLOCKED/);
  assert.ok(buildPreviewWorkbook(report, "pf").length > 0);
});

test("missing, numeric, malformed and conflicting statutory IDs cannot be exported", () => {
  for (const [scheme, field, value] of [["pf", "uan", 123456789012], ["pf", "uan", "123"], ["pf", "uan", ""], ["esi", "ipNumber", 1234567890], ["esi", "ipNumber", "123456789x"]]) {
    const data = fixture(); data.employees[0].statutoryDetails[field] = value;
    assert.equal(buildComplianceReport(data).rows[0][scheme].ready, false);
  }
  const data = fixture(); data.payroll[0].compliance.pf.uan = "999999999999";
  assert.ok(buildComplianceReport(data).rows[0].pf.issues.includes("Conflicting UAN"));
});

test("employee joins prefer document ID; legacy IDs must match exactly and uniquely", () => {
  const data = fixture(); data.payroll[0].employeeId = "WRONG";
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, true);
  delete data.payroll[0].employeeFirestoreId; data.payroll[0].employeeId = "0001";
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, true);
  data.payroll[0].employeeId = "1";
  assert.equal(buildComplianceReport(data).exportStatus.pf.ready, false);
  data.payroll[0].employeeId = "0001";
  data.employees.push({ ...data.employees[0], id: "doc-b" });
  assert.equal(buildComplianceReport(data).exportStatus.pf.ready, false);
  assert.ok(buildComplianceReport(data).rows.some((row) => row.pf.issues.includes("Ambiguous employee match")));
});

test("missing employee and duplicate finalized payroll remain visible and block export", () => {
  const missing = fixture(); missing.employees = [];
  assert.ok(buildComplianceReport(missing).rows[0].pf.issues.includes("Missing employee record"));
  const duplicate = fixture(); duplicate.payroll.push({ ...duplicate.payroll[0], id: "duplicate", status: "Paid" });
  const report = buildComplianceReport(duplicate);
  assert.equal(report.rows.length, 1);
  assert.ok(report.rows[0].pf.issues.includes("Duplicate finalized payroll"));
  assert.equal(report.rows[0].pf.employeeContribution, null);
  assert.equal(report.exportStatus.pf.ready, false);
});

test("duplicate UAN or IP number blocks both records instead of silently dropping a member", () => {
  const data = fixture();
  data.employees.push({ ...data.employees[0], id: "doc-b", employeeId: "0002" });
  data.payroll.push({ ...data.payroll[0], id: "2026-09_doc-b", employeeFirestoreId: "doc-b" });
  const report = buildComplianceReport(data);
  assert.equal(report.exportStatus.pf.blocked, 2);
  assert.equal(report.exportStatus.esi.blocked, 2);
});

test("eligibility discrepancies and unknown finalized eligibility require review", () => {
  const data = fixture(); data.payroll[0].pfEnabled = false;
  const report = buildComplianceReport(data);
  assert.equal(report.rows[0].pf.eligible, false);
  assert.equal(report.rows[0].pf.candidate, true);
  assert.equal(report.exportStatus.pf.ready, false);
  delete data.payroll[0].pfEnabled;
  assert.ok(buildComplianceReport(data).rows[0].pf.issues.includes("Missing finalized eligibility"));
  data.payroll[0].pfEnabled = false; data.employees[0].salaryStructure.includePf = false;
  assert.equal(buildComplianceReport(data).exportStatus.pf.candidates, 0);
  assert.throws(() => buildEcr(buildComplianceReport(data)), /EXPORT_BLOCKED/);
});

test("bad numbers never become zero; ECR requires whole amounts and consistent wages", () => {
  for (const value of [null, "", " ", true, false, NaN, Infinity, -1, {}, "0x12", "1e3", 12.5]) {
    const data = fixture(); data.payroll[0].compliance.pf.epfWages = value;
    assert.equal(buildComplianceReport(data).rows[0].pf.ready, false, String(value));
  }
  for (const patch of [{ ncpDays: 31 }, { edliWages: 15001 }, { edliWages: 10 }, { epfWages: 0 }, { epfWages: 19000 }, { epsWages: 16000 }, { epsWages: 0, epsContribution: 1 }]) {
    const data = fixture(); Object.assign(data.payroll[0].compliance.pf, patch);
    assert.equal(buildComplianceReport(data).rows[0].pf.ready, false);
  }
});

test("unknown eligibility and duplicate records cannot be excluded by current disabled settings", () => {
  const data = fixture();
  data.employees[0].salaryStructure.includePf = false;
  delete data.payroll[0].pfEnabled;
  let report = buildComplianceReport(data);
  assert.equal(report.rows[0].pf.eligible, null);
  assert.equal(report.rows[0].pf.candidate, true);
  assert.equal(report.exportStatus.pf.ready, false);
  data.payroll.push({ ...data.payroll[0], id: "duplicate" });
  report = buildComplianceReport(data);
  assert.equal(report.rows[0].pf.candidate, true);
  assert.equal(report.exportStatus.pf.blocked, 1);
});

test("supplied invalid ESI reason codes cannot silently turn into no-reason code zero", () => {
  for (const value of ["bad", "", -1, true, 0.5, 14]) {
    const data = fixture(); data.payroll[0].compliance.esi.zeroWageReasonCode = value;
    assert.equal(buildComplianceReport(data).rows[0].esi.ready, false, String(value));
  }
});

test("zero payroll values are retained; PF full-month NCP and ESI reason/date are mandatory", () => {
  const data = fixture(), payroll = data.payroll[0];
  Object.assign(payroll, { payableDays: 0, pfDeduction: 0, esiDeduction: 0 });
  for (const key of Object.keys(payroll.compliance.pf)) payroll.compliance.pf[key] = 0;
  Object.assign(payroll.compliance.esi, { grossWages: 0, employerContribution: 0 });
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, false);
  assert.equal(buildComplianceReport(data).rows[0].esi.ready, false);
  payroll.compliance.pf.ncpDays = 30;
  payroll.compliance.esi.zeroWageReasonCode = 1;
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, true);
  assert.equal(buildComplianceReport(data).rows[0].esi.ready, true);
  payroll.compliance.esi.zeroWageReasonCode = 2;
  assert.equal(buildComplianceReport(data).rows[0].esi.ready, false);
  for (const date of ["2026-02-30", "2026-10-01", "bad"]) {
    payroll.compliance.esi.lastWorkingDay = date;
    assert.equal(buildComplianceReport(data).rows[0].esi.ready, false);
  }
  payroll.compliance.esi.lastWorkingDay = "2026-09-03";
  assert.equal(buildComplianceReport(data).rows[0].esi.ready, true);
});

test("leap-year month lengths are used for NCP and day validation", () => {
  const data = fixture(); data.month = "2024-02"; data.payroll[0].month = data.month;
  data.payroll[0].compliance.pf.ncpDays = 29;
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, true);
  data.payroll[0].compliance.pf.ncpDays = 30;
  assert.equal(buildComplianceReport(data).rows[0].pf.ready, false);
});

test("ECR is an exact eleven-field, headerless CRLF file preserving identifier zeroes", () => {
  const ecr = buildEcr(buildComplianceReport(fixture()));
  assert.equal(ecr, "001234567890#~#Test Member#~#18000#~#15000#~#15000#~#15000#~#1800#~#1250#~#550#~#4#~#0\r\n");
  assert.equal(ecr.trim().split("#~#").length, 11);
  for (const name of ["Bad#~#Name", "Bad\nName", "Bad\tName"]) {
    const data = fixture(); data.payroll[0].employeeName = name;
    assert.throws(() => buildEcr(buildComplianceReport(data)), /EXPORT_BLOCKED/);
  }
});

test("ESIC export is real BIFF8 .xls with six text columns, no contribution columns, rounded days", () => {
  const data = fixture(), before = structuredClone(data);
  const buffer = buildEsiWorkbook(buildComplianceReport(data));
  assert.equal(buffer.subarray(0, 8).toString("hex"), "d0cf11e0a1b11ae1");
  const book = XLSX.read(buffer, { type: "buffer", cellNF: true }), sheet = book.Sheets.Sheet1;
  assert.deepEqual(book.SheetNames, ["Sheet1"]);
  const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  assert.deepEqual(values[0], ESI_HEADERS);
  assert.deepEqual(values[1], ["0012345678", "Test Member", "26", "18000", "0", ""]);
  for (const col of ["A", "B", "C", "D", "E", "F"]) { assert.equal(sheet[`${col}2`].t, "s"); assert.equal(sheet[`${col}2`].z, "@"); }
  assert.deepEqual(data, before);
});

test("preview workbook includes all records, missing-value diagnostics, and safe literal strings", () => {
  const data = fixture(); data.payroll[0].employeeName = '=HYPERLINK("https://invalid.example")';
  delete data.employees[0].statutoryDetails.uan;
  const report = buildComplianceReport(data);
  for (const scheme of ["pf", "esi"]) {
    const book = XLSX.read(buildPreviewWorkbook(report, scheme), { type: "buffer" });
    const sheet = book.Sheets[book.SheetNames[0]];
    assert.equal(sheet.B2.t, "s"); assert.equal(sheet.B2.f, undefined);
    assert.equal(sheet.B2.v, data.payroll[0].employeeName);
    assert.ok(book.SheetNames.includes("Read me"));
    const values = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (scheme === "pf") {
      assert.deepEqual(values[0].slice(2, 13), PF_HEADERS);
      assert.equal(values[1][2], "");
      assert.match(values[1].at(-1), /Missing UAN/);
    }
  }
});

test("incomplete members block the whole portal file; a ready subset cannot be silently exported", () => {
  const data = fixture(); data.employees.push({ id: "doc-b", employeeId: "0002", salaryStructure: { includePf: true, includeEsi: true } });
  const report = buildComplianceReport(data);
  assert.equal(report.rows[0].pf.ready || report.rows[1].pf.ready, true);
  assert.throws(() => buildEcr(report), /EXPORT_BLOCKED/);
  assert.throws(() => buildEsiWorkbook(report), /EXPORT_BLOCKED/);
});

test("month and export parameters are strictly validated", () => {
  for (const month of [null, "", "2026-1", "2026-00", "2026-13", "../../company", "2026-09\n"]) assert.throws(() => validateMonth(month), /INVALID_MONTH/);
  assert.equal(validateMonth("2026-09"), "2026-09");
});

const owner = { companyId: "company-a", isOwner: true, permissions: [] };
const endpoint = (context, dataset = fixture(), calls = []) => createComplianceGet({
  authorize: async (request) => {
    if (request.headers.get("authorization") !== "Bearer valid") throw new Error("UNAUTHENTICATED");
    return context;
  },
  requirePermission: requireCompanyPermission,
  load: async (companyId, selectedMonth) => { calls.push([companyId, selectedMonth]); return dataset; },
});
const request = (query = "", token = "valid") => new Request(`http://localhost/api/workforce/esi-pf?month=${month}${query}`, { headers: { authorization: `Bearer ${token}` } });

test("API enforces authentication and payroll.view before any data load", async () => {
  const calls = [];
  assert.equal((await endpoint(owner, fixture(), calls)(request("", "invalid"))).status, 401);
  for (const permissions of [[], ["attendance.view"], ["payroll.export"], ["payroll.manage"]]) {
    const ctx = { ...owner, isOwner: false, permissions };
    assert.equal((await endpoint(ctx, fixture(), calls)(request())).status, 403);
    assert.equal(canAccessPath(ctx, "/manager/Workforce/esi-pf"), false);
  }
  assert.deepEqual(calls, []);
});

test("exports require both view and export permission; owner access is supported", async () => {
  const viewer = { ...owner, isOwner: false, permissions: ["payroll.view"] };
  assert.equal((await endpoint(viewer)(request())).status, 200);
  for (const format of ["preview", "ecr", "esi"]) {
    const calls = [];
    assert.equal((await endpoint(viewer, fixture(), calls)(request(`&format=${format}`))).status, 403);
    assert.deepEqual(calls, []);
    const exporter = { ...viewer, permissions: ["payroll.view", "payroll.export"] };
    const response = await endpoint(exporter)(request(`&format=${format}`));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control"), /no-store/);
    assert.match(response.headers.get("content-disposition"), /attachment/);
    assert.equal((await endpoint(owner)(request(`&format=${format}`))).status, 200);
  }
});

test("API ignores caller-supplied tenant, never returns raw employee personal/access data", async () => {
  const calls = [], data = fixture();
  data.employees[0].access = { authUid: "secret", effectivePermissions: ["company.manage"] };
  data.employees[0].bankDetails = { accountNumber: "secret" };
  const response = await endpoint(owner, data, calls)(request("&companyId=company-b&tenantId=company-b"));
  assert.deepEqual(calls, [["company-a", month]]);
  const body = await response.text();
  assert.doesNotMatch(body, /secret|bankDetails|effectivePermissions/);
});

test("stale browser tenant context blocks report and download before any reads", async () => {
  for (const format of ["report", "preview", "ecr", "esi"]) {
    const calls = [], stale = request(`&format=${format}`);
    stale.headers.set("X-Company-Id", "company-b");
    assert.equal((await endpoint(owner, fixture(), calls)(stale)).status, 403);
    assert.deepEqual(calls, []);
  }
});

test("API rejects incomplete exports and invalid parameters, sanitizes internal errors", async () => {
  const data = fixture(); delete data.payroll[0].compliance;
  assert.equal((await endpoint(owner, data)(request("&format=ecr"))).status, 422);
  assert.equal((await endpoint(owner, data)(request("&format=esi"))).status, 422);
  const calls = [];
  assert.equal((await endpoint(owner, data, calls)(request("&format=csv"))).status, 400);
  assert.deepEqual(calls, []);
  const failing = createComplianceGet({ authorize: async () => owner, requirePermission: requireCompanyPermission, load: async () => { throw new Error("private database details"); } });
  const response = await failing(request());
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "COMPLIANCE_REQUEST_FAILED" });
});

test("loader only reads verified company paths and selected Payroll month; failures stay failures", async () => {
  const calls = [], data = fixture();
  const ref = (path) => ({
    doc: (id) => ref(`${path}/${id}`), collection: (name) => ref(`${path}/${name}`),
    where: (...args) => { calls.push({ path, where: args }); return ref(path); },
    get: async () => { calls.push({ path }); return { docs: (path.endsWith("Payrolls") ? data.payroll : data.employees).map((row) => ({ id: row.id, data: () => ({ ...row, id: "untrusted-stored-id" }) })) }; },
  });
  const db = { collection: (name) => ref(name) };
  const result = await loadComplianceDataset(db, "company-a", month);
  assert.ok(calls.every((call) => call.path.startsWith("Companies/company-a/")));
  assert.deepEqual(calls.find((call) => call.where).where, ["month", "==", month]);
  assert.equal(result.employees[0].id, "doc-a");
  await assert.rejects(() => loadComplianceDataset(db, "company-a/other", month), /FORBIDDEN/);
  data.payroll[0].companyId = "company-b";
  await assert.rejects(() => loadComplianceDataset(db, "company-a", month), /SOURCE_TENANT_MISMATCH/);
  const failingDb = { collection: () => ({ doc: () => ({ collection: () => ({ get: async () => { throw new Error("Read denied"); }, where: () => ({ get: async () => { throw new Error("Read denied"); } }) }) }) }) };
  await assert.rejects(() => loadComplianceDataset(failingDb, "company-a", month), /Read denied/);
});
