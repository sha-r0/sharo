import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import * as statutory from "../src/app/allservice/employee/employeeStatutory.js";
import * as catalog from "../src/app/allservice/rbac/permissionCatalog.js";
import * as employeeAuth from "../src/app/allservice/rbac/employeeAuth.js";
import { buildComplianceReport } from "../src/lib/esi-pf/compliance.js";

const require = createRequire(import.meta.url), swc = require("next/dist/build/swc");
await swc.loadBindings();
async function loadSource(path, dependencies = {}) {
  const filename = new URL(path, import.meta.url).pathname;
  const { code } = await swc.transform(fs.readFileSync(filename, "utf8"), { filename, jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" } });
  const module = { exports: {} };
  new Function("require", "module", "exports", code)((name) => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const profile = () => ({
  personalInfo: { firstName: "Test", lastName: "Employee", email: "test@example.invalid", phone: "9876543210" },
  employment: { department: "Operations", designation: "Staff", role: "employee", status: "Active" },
  salaryStructure: { includePf: true, includeEsi: true, grossSalary: 22000, employeePfPercent: 12 },
  statutoryDetails: { uan: "001234567890", ipNumber: "0012345678" },
});

test("existing eligibility schema takes precedence, legacy flags remain readable", () => {
  assert.deepEqual(statutory.readEmployeeStatutory({}), { pfApplicable: null, esiApplicable: null, uan: "", ipNumber: "" });
  const employee = { compensation: { pfEnabled: true }, payroll: { esiEnabled: true }, salaryStructure: { includePf: false } };
  assert.equal(statutory.readEmployeeStatutory(employee).pfApplicable, false);
  assert.equal(statutory.readEmployeeStatutory(employee).esiApplicable, true);
});

test("identifiers are conditionally required; malformed or numeric IDs and nonboolean flags fail", () => {
  const data = profile(); data.statutoryDetails = { uan: "", ipNumber: "" };
  assert.deepEqual(Object.keys(statutory.validateEmployeeStatutory(data)), ["uan", "ipNumber"]);
  data.salaryStructure = { includePf: false, includeEsi: false };
  assert.deepEqual(statutory.validateEmployeeStatutory(data), {});
  for (const value of [123456789012, "123", "12345678901x", {}, false, "1234567890123"]) {
    data.statutoryDetails.uan = value;
    assert.ok(statutory.validateEmployeeStatutory(data).uan);
  }
  data.statutoryDetails.uan = "001234567890";
  data.salaryStructure.includePf = "yes";
  assert.ok(statutory.validateEmployeeStatutory(data).includePf);
});

test("server merges preserve salary fields, unrelated statutory metadata and leading zeroes", () => {
  const existing = profile(); existing.statutoryDetails.verifiedBy = "auditor";
  const before = structuredClone(existing);
  const result = statutory.mergeEmployeeStatutory({ statutoryDetails: { uan: " 009876543210 " } }, existing);
  assert.equal(result.statutoryDetails.uan, "009876543210");
  assert.equal(result.statutoryDetails.ipNumber, "0012345678");
  assert.equal(result.statutoryDetails.verifiedBy, "auditor");
  assert.deepEqual(result.salaryStructure, existing.salaryStructure);
  assert.deepEqual(existing, before);
  assert.throws(() => statutory.mergeEmployeeStatutory({ statutoryDetails: { uan: "" } }, existing), /required/);
});

test("legacy edits without statutory fields remain compatible; enabling a scheme requires its ID", () => {
  const existing = { salaryStructure: { includePf: true, includeEsi: false, grossSalary: 10000 } };
  assert.deepEqual(statutory.mergeEmployeeStatutory({ salaryStructure: { includePf: true } }, existing), existing);
  assert.deepEqual(statutory.mergeEmployeeStatutory({}, existing), existing);
  assert.throws(() => statutory.mergeEmployeeStatutory({ salaryStructure: { includeEsi: true } }, existing), /ESIC\/IP Number is required/);
  assert.throws(() => statutory.mergeEmployeeStatutory({ salaryStructure: { includePf: true } }), /UAN Number is required/);
  assert.throws(() => statutory.mergeEmployeeStatutory({ statutoryDetails: [] }, existing), /Invalid statutoryDetails/);
  assert.throws(() => statutory.mergeEmployeeStatutory({ salaryStructure: null }, existing), /Invalid salaryStructure/);
});

test("disabling eligibility preserves identifiers and introduces no duplicate eligibility fields", () => {
  const result = statutory.mergeEmployeeStatutory({ salaryStructure: { includePf: false, includeEsi: false } }, profile());
  assert.equal(result.salaryStructure.includePf, false);
  assert.deepEqual(result.statutoryDetails, profile().statutoryDetails);
  assert.equal(result.statutoryDetails.pfApplicable, undefined);
  assert.equal(result.statutoryDetails.esiApplicable, undefined);
});

test("mapper carries statutory details and validator enforces the same rules before client saves", async () => {
  const { mapEmployee } = await loadSource("../src/app/allservice/employee/employeeMapper.js", { "firebase/firestore": { serverTimestamp: () => "timestamp" }, "./employee.constants": { EMPLOYEE_STATUS: { ACTIVE: "Active" } } });
  const { validateEmployee } = await loadSource("../src/app/allservice/employee/employeeValidator.js", { "./employeeStatutory.js": statutory });
  const form = { ...profile(), firstName: "Test", lastName: "Employee", email: "test@example.invalid", phone: "9876543210", department: "Operations", designation: "Staff", role: "employee", loginEnabled: false, documents: { governmentId: {} }, bankDetails: {}, address: {} };
  const mapped = mapEmployee({ companyId: "A", firestoreId: "doc-a", employeeId: "0001", form });
  assert.deepEqual(mapped.statutoryDetails, form.statutoryDetails);
  form.statutoryDetails.uan = "";
  assert.match(validateEmployee(form).uan, /required/);
});

test("form section exposes accessible Yes/No controls, conditional required IDs and preserves values on toggle", async () => {
  const { default: Section } = await loadSource("../src/app/(dashboard)/manager/userManagement/components/EmployeeStatutorySection.jsx");
  let state = profile();
  const render = () => Section({ ...state, onChange: (update) => { state = { ...state, ...update }; } });
  const elements = (node) => !node || typeof node !== "object" ? [] : Array.isArray(node) ? node.flatMap(elements) : [node, ...elements(node.props?.children)];
  const find = (name) => elements(render()).find((node) => node.props?.name === name);
  assert.match(renderToStaticMarkup(render()), /PF &amp; ESI Details/);
  assert.equal(find("statutoryDetails.uan").props.required, true);
  assert.equal(find("statutoryDetails.uan").props.type, "text");
  assert.equal(find("statutoryDetails.ipNumber").props.pattern, "[0-9]{10}");
  find("salaryStructure.includePf").props.onChange({ target: { value: "no" } });
  assert.equal(state.salaryStructure.includePf, false);
  assert.equal(find("statutoryDetails.uan").props.required, false);
  assert.equal(state.statutoryDetails.uan, "001234567890");
  find("statutoryDetails.ipNumber").props.onChange({ target: { value: "0098765432" } });
  assert.equal(state.statutoryDetails.ipNumber, "0098765432");
  assert.equal(state.salaryStructure.grossSalary, 22000);
});

test("compliance reads saved identifiers and canonical flags without replacing finalized eligibility", () => {
  const employee = { id: "doc-a", ...profile(), ...statutory.mergeEmployeeStatutory(profile()) };
  const payroll = { id: "p", month: "2026-09", employeeFirestoreId: "doc-a", employeeName: "Test Employee", status: "Processed", pfEnabled: true, esiEnabled: true, pfDeduction: 100, esiDeduction: 10 };
  const report = buildComplianceReport({ month: "2026-09", employees: [employee], payroll: [payroll] });
  assert.equal(report.rows[0].pf.identifier, "001234567890");
  assert.equal(report.rows[0].esi.identifier, "0012345678");
  assert.ok(!report.rows[0].pf.issues.includes("Missing UAN"));
  assert.ok(!report.rows[0].esi.issues.includes("Missing IP No."));
  assert.equal(report.rows[0].pf.employeeContribution, 100);
  assert.equal(report.rows[0].pf.epfWages, null);
  payroll.pfEnabled = false;
  const mismatch = buildComplianceReport({ month: "2026-09", employees: [employee], payroll: [payroll] });
  assert.equal(mismatch.rows[0].pf.eligible, false);
  assert.ok(mismatch.rows[0].pf.issues.some((issue) => issue.startsWith("Eligibility differs")));
});

async function apiHarness({ permissions = [], isOwner = true, existing = null } = {}) {
  const records = { "Companies/A": { plan: "enterprise", nextEmployeeNumber: 1 } }, writes = [], reads = [];
  if (existing) records["Companies/A/Usermanagement/doc-a"] = { ...existing, employeeId: "00000001", access: { roleId: "employee", loginEnabled: false, permissionOverrides: { grant: [], deny: [] } } };
  const snapshot = (path) => ({ id: path.split("/").at(-1), exists: Boolean(records[path]), data: () => records[path], ref: ref(path) });
  const ref = (path) => ({
    path, id: path.split("/").at(-1), parent: { get: () => ref(path.split("/").slice(0, -1).join("/")).get(), where: () => ({ get: async () => ({ docs: [] }) }) },
    doc: (id = "log") => ref(`${path}/${id}`), collection: (name) => ref(`${path}/${name}`),
    get: async () => {
      reads.push(path);
      if (path.split("/").length % 2 === 0) return snapshot(path);
      return { docs: Object.keys(records).filter((key) => key.startsWith(`${path}/`) && key.split("/").length === path.split("/").length + 1).map(snapshot) };
    },
  });
  const save = (reference, data) => { writes.push(reference.path); records[reference.path] = { ...records[reference.path], ...data }; };
  const db = { collection: ref, batch: () => ({ update: save, set: save, commit: async () => {} }), runTransaction: async (callback) => callback({ get: (reference) => reference.get(), create: save, update: save }) };
  const api = await loadSource("../src/app/api/rbac/users/route.js", {
    "next/server": { NextResponse: { json: (body, options) => Response.json(body, options) } },
    "firebase-admin/firestore": { FieldValue: { serverTimestamp: () => "timestamp" } },
    "@/lib/firebase-admin": { adminDb: db, adminAuth: {} },
    "@/app/allservice/rbac/permissionCatalog": catalog,
    "@/app/allservice/rbac/employeeAuth": employeeAuth,
    "@/app/allservice/employee/employeeStatutory": statutory,
    "@/lib/server/authorizeCompanyRequest": { authorizeCompanyRequest: async (request) => {
      if (request.headers.get("authorization") !== "Bearer valid") throw new Error("UNAUTHENTICATED");
      return { token: { uid: "actor" }, companyId: "A", company: records["Companies/A"], isOwner, permissions, employee: { access: { roleId: "hr_manager" } } };
    } },
  });
  const send = (method, data, token = "valid") => api[method](new Request("http://localhost/api/rbac/users", { method, headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ employeeFirestoreId: "doc-a", companyId: "B", loginEnabled: false, access: { roleId: "employee", loginEnabled: false, permissionOverrides: { grant: [], deny: [] } }, ...data }) }));
  return { send, records, writes, reads };
}

test("actual create API persists canonical fields only inside authenticated company", async () => {
  const api = await apiHarness();
  const response = await api.send("POST", { profile: profile() });
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  const saved = api.records["Companies/A/Usermanagement/doc-a"];
  assert.deepEqual(saved.statutoryDetails, profile().statutoryDetails);
  assert.equal(saved.salaryStructure.includePf, true);
  assert.equal(saved.companyId, "A");
  assert.ok(api.writes.every((path) => path === "Companies/A" || path.startsWith("Companies/A/")));
});

test("actual edit API updates statutory details and preserves unrelated existing salary values", async () => {
  const api = await apiHarness({ existing: profile() });
  const changed = profile(); changed.statutoryDetails = { uan: "009876543210" }; changed.salaryStructure = { includePf: true };
  const response = await api.send("PUT", { profile: changed });
  assert.equal(response.status, 200, JSON.stringify(await response.json()));
  const saved = api.records["Companies/A/Usermanagement/doc-a"];
  assert.equal(saved.statutoryDetails.uan, "009876543210");
  assert.equal(saved.statutoryDetails.ipNumber, "0012345678");
  assert.equal(saved.salaryStructure.grossSalary, 22000);
  assert.equal(saved.salaryStructure.includeEsi, true);
  assert.equal(saved.employeeId, "00000001");
});

test("actual API rejects invalid statutory values, unauthenticated and insufficiently privileged requests before writes", async () => {
  const oldError = console.error; console.error = () => {};
  try {
    for (const method of ["POST", "PUT"]) {
      const invalid = profile(); invalid.statutoryDetails.uan = "";
      const api = await apiHarness({ existing: method === "PUT" ? profile() : null });
      const response = await api.send(method, { profile: invalid });
      assert.equal(response.status, 400);
      assert.match((await response.json()).error, /UAN Number is required/);
      assert.deepEqual(api.writes, []);
      const denied = await apiHarness({ isOwner: false, permissions: ["payroll.view", "payroll.export"], existing: method === "PUT" ? profile() : null });
      assert.equal((await denied.send(method, { profile: profile() })).status, 403);
      assert.deepEqual(denied.writes, []);
      assert.equal((await denied.send(method, { profile: profile() }, "invalid")).status, 401);
    }
  } finally { console.error = oldError; }
});
