import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import { buildComplianceReport } from "../src/lib/esi-pf/compliance.js";

const require = createRequire(import.meta.url);
const swc = require("next/dist/build/swc");
await swc.loadBindings();
const filename = new URL("../src/app/(dashboard)/manager/Workforce/esi-pf/page.jsx", import.meta.url).pathname;
const { code } = await swc.transform(fs.readFileSync(filename, "utf8"), {
  filename, jsc: { parser: { syntax: "ecmascript", jsx: true }, transform: { react: { runtime: "automatic" } } }, module: { type: "commonjs" },
});
const month = "2026-09";
const report = buildComplianceReport({ month, employees: [
  { id: "a", employeeId: "0001", personalInfo: { fullName: "Alice Example" }, salaryStructure: { includePf: true, includeEsi: true } },
  { id: "b", employeeId: "0002", personalInfo: { fullName: "Bob Example" }, salaryStructure: { includePf: true, includeEsi: true } },
], payroll: [] });

// Render the actual compiled component with controlled auth and hook state.
// Browser layout is not simulated; interactions and rendered semantics are checked.
function harness({ permissions = ["payroll.view", "payroll.export"], resultIdentity = `company-a:user:${month}`, loading = false, error = "" } = {}) {
  const auth = { company: { id: "company-a" }, firebaseUser: { uid: "user" }, can: (permission) => permissions.includes(permission) };
  const states = [month, "pf", "", { identity: resultIdentity, report }, loading, error, "", false, 0];
  let index = 0;
  const react = { ...require("react"), useState: (initial) => {
    const slot = index++;
    if (states[slot] === undefined) states[slot] = typeof initial === "function" ? initial() : initial;
    return [states[slot], (value) => { states[slot] = typeof value === "function" ? value(states[slot]) : value; }];
  }, useRef: (value) => ({ current: value }), useEffect: () => {} };
  const module = { exports: {} };
  const scopedRequire = (name) => name === "react" ? react : name.includes("AuthContext") ? { useAuth: () => auth } : name.includes("DashboardWidgets") ? { neo: "bg-[#F9FAFC] border border-white/80" } : require(name);
  new Function("require", "module", "exports", code)(scopedRequire, module, module.exports);
  const render = () => { index = 0; return module.exports.default(); };
  const elements = (node) => {
    if (!node || typeof node !== "object") return [];
    if (Array.isArray(node)) return node.flatMap(elements);
    return [node, ...elements(node.props?.children)];
  };
  return { auth, states, html: () => renderToStaticMarkup(render()), find: (predicate) => elements(render()).find(predicate) };
}

test("page renders month selector, four summaries, PF columns and required missing-data badges", () => {
  const ui = harness(), html = ui.html();
  for (const label of ["ESI &amp; PF Compliance", "Total Employees", "PF Eligible", "ESI Eligible", "Missing Data", "PF / EPFO", "ESI / ESIC", "UAN", "EPF wages", "EPS wages", "Employee PF", "Employer PF", "Missing UAN", "Missing payroll"]) assert.ok(html.includes(label), label);
  assert.equal(ui.find((node) => node.type === "input" && node.props.type === "month").props.value, month);
  assert.equal(ui.find((node) => node.props?.children?.includes?.("Download ECR")).props.disabled, true);
  assert.match(html, /bg-\[#F9FAFC\]/);
});

test("tab interaction switches to ESI columns and exposes IP validation", () => {
  const ui = harness();
  ui.find((node) => node.props?.id === "compliance-tab-esi").props.onClick();
  const html = ui.html();
  for (const label of ["IP number", "Working days", "Employee ESI", "Employer ESI", "Missing IP No.", "Download contribution Excel"]) assert.ok(html.includes(label), label);
  assert.equal(ui.find((node) => node.props?.id === "compliance-tab-esi").props["aria-selected"], true);
  assert.equal(ui.find((node) => node.props?.id === "compliance-tab-pf").props.tabIndex, -1);
  assert.doesNotMatch(html, /<th[^>]*>EPF wages<\/th>/);
});

test("search filters employee rows while retaining full-month summary and export scope", () => {
  const ui = harness();
  const search = ui.find((node) => node.type === "input" && node.props["aria-label"]?.startsWith("Search employees"));
  search.props.onChange({ target: { value: "alice" } });
  const html = ui.html();
  assert.match(html, /Alice Example/);
  assert.doesNotMatch(html, /Bob Example/);
  assert.match(html, /1 of 2 employees/);
  assert.match(html, /Downloads cover the full month/);
  search.props.onChange({ target: { value: "not found" } });
  assert.match(ui.html(), /No employees match your search/);
});

test("changing month or tenant never renders a previously loaded report", () => {
  const ui = harness();
  ui.find((node) => node.type === "input" && node.props.type === "month").props.onChange({ target: { value: "2026-08" } });
  assert.doesNotMatch(ui.html(), /Alice Example|Bob Example/);
  const otherTenant = harness({ resultIdentity: `company-b:user:${month}` });
  assert.doesNotMatch(otherTenant.html(), /Alice Example|Bob Example/);
});

test("read-only permissions disable all downloads and revoked view hides employee data", () => {
  const viewer = harness({ permissions: ["payroll.view"] });
  assert.match(viewer.html(), /Payroll export permission is required/);
  assert.equal(viewer.find((node) => node.props?.children?.includes?.("Excel preview/export")).props.disabled, true);
  const denied = harness({ permissions: [] });
  assert.match(denied.html(), /do not have permission to view payroll compliance/);
  assert.doesNotMatch(denied.html(), /Alice Example|Bob Example/);
});

test("loading, errors, retry and empty month are explicit", () => {
  assert.match(harness({ loading: true }).html(), /Loading finalized payroll/);
  const failure = harness({ error: "Read failed" });
  assert.match(failure.html(), /Read failed/);
  failure.find((node) => node.type === "button" && node.props.children === "Retry").props.onClick();
  assert.equal(failure.states[8], 1);
  const empty = harness(); empty.states[0] = "";
  assert.match(empty.html(), /Select a payroll month/);
});
