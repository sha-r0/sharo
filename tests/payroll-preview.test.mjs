import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import payrollEligibility from "../functions/src/workforce/payrollEligibility.js";
import payrollOrder from "../functions/src/workforce/payrollOrder.js";
import payrollMath from "../functions/src/workforce/payrollMath.js";

// Execute the web service with only Firebase transport replaced; keep its real
// adjustment and saved-row handling and the production shared math module.
function serviceHarness(respond, employees = [], rosterError = null) {
  const calls = [];
  const source = fs.readFileSync(new URL("../src/app/(dashboard)/manager/Workforce/services/PayrollService.js", import.meta.url), "utf8")
    .replace(/^import .*;\n/gm, "")
    .replace("export default class PayrollService", "globalThis.PayrollService = class PayrollService");
  const context = vm.createContext({ payrollMath, payrollOrder, payrollEligibility, db: {},
    collection: (_, ...path) => { assert.deepEqual(path.slice(0, 1), ["Companies"]); assert.equal(path.at(-1), "Usermanagement"); return path; },
    getDocs: async () => { if (rosterError) throw rosterError; return { docs: employees.map((employee, index) => ({ id: `employee-${index}`, data: () => employee })) }; },
    functions: {}, httpsCallable: (_, name) => async (data) => {
    calls.push({ name, data }); return { data: await respond(name, data) };
  } });
  vm.runInContext(source, context);
  return { service: context.PayrollService, calls };
}

test("web displays backend preview/saved values without recalculation, then persists only adjustments", async () => {
  const backendRow = { id: "2026-10_e", employeeFirestoreId: "e", month: "2026-10", status: "Draft", grossSalary: 30000, earnedSalary: 10000, pfDeduction: 1200, esiDeduction: 75, advanceDeduction: 1000, bonus: 0, otherDeduction: 0, netSalary: 7725 };
  let saved = false;
  const { service, calls } = serviceHarness(() => ({ rows: [backendRow], saved }));
  let [row] = await service.load("ignored-tenant", "2026-10");
  assert.equal(row.netSalary, backendRow.netSalary);
  assert.equal(row._saved, false);
  await assert.rejects(service.setStatus("ignored-tenant", row, "Processed"));
  saved = true;
  [row] = await service.load("ignored-tenant", "2026-10");
  row = service.updateAdjustment(row, "bonus", "500");
  assert.equal(row.netSalary, 8225); // No overtimeAmount field; PF/ESI retained.
  assert.equal(row._dirty, true);
  await assert.rejects(service.setStatus("ignored-tenant", row, "Processed"));
  const [generated] = await service.save("ignored-tenant", [row], "2026-10");
  assert.equal(generated._dirty, false);
  assert.equal(generated.netSalary, backendRow.netSalary); // Server response wins.
  await service.setStatus("ignored-tenant", generated, "Processed");
  assert.deepEqual(calls.map((call) => call.name), ["previewPayroll", "previewPayroll", "generatePayroll", "transitionPayroll"]);
  assert.equal(calls[2].data.adjustments.e.bonus, 500);
  for (const { data } of calls) assert.equal(data.companyId, undefined);
  const processed = { ...generated, status: "Processed" };
  assert.equal(service.updateAdjustment(processed, "bonus", 9999), processed);
});

test("preview errors propagate instead of presenting zero-value payroll", async () => {
  const { service } = serviceHarness(() => { throw new Error("permission-denied"); });
  await assert.rejects(service.load("tenant", "2026-10"), /permission-denied/);
});


test("September roster remains visible when preview callable is unavailable; no amounts are fabricated", async () => {
  const { service } = serviceHarness(() => { throw Object.assign(new Error("Function not found"), { code: "functions/not-found" }); }, [
    { personalInfo: { fullName: "Active employee" }, employment: { status: "Active" }, access: { loginEnabled: false, status: "inactive" } },
    { employment: { status: "Inactive" } },
  ]);
  await assert.rejects(service.load("tenant-a", "2026-09"), (error) => {
    assert.equal(error.code, "functions/not-found");
    assert.equal(error.employeeRows.length, 1);
    const row = error.employeeRows[0];
    assert.equal(row.employeeName, "Active employee");
    assert.equal(row.month, "2026-09");
    assert.equal(row._unavailable, true);
    assert.equal(row.netSalary, undefined);
    assert.equal(row.grossSalary, undefined);
    return true;
  });
});

test("empty backend result cannot silently hide a nonempty active roster", async () => {
  const { service } = serviceHarness(() => ({ rows: [], saved: false }), [{ employment: { status: "Active" } }]);
  await assert.rejects(service.load("tenant-a", "2026-09"), (error) => {
    assert.match(error.message, /active employee records exist/);
    assert.equal(error.employeeRows.length, 1);
    return true;
  });
});

test("roster fallback does not bypass denied Firestore access or block a valid payroll response", async () => {
  const denied = serviceHarness(() => { throw new Error("preview denied"); }, [], new Error("roster denied"));
  await assert.rejects(denied.service.load("tenant-a", "2026-09"), (error) => error.employeeRows.length === 0);
  const valid = serviceHarness(() => ({ rows: [{ id: "saved", status: "Draft", netSalary: 123 }], saved: true }), [], new Error("roster denied"));
  assert.equal((await valid.service.load("tenant-a", "2026-09"))[0].netSalary, 123);
});

test("web sorts both preview and saved responses by business employee ID", async () => {
  for (const saved of [false, true]) {
    const { service } = serviceHarness(() => ({ saved, rows: [
      { id: "a", employeeId: "00000028", netSalary: 28 },
      { id: "b", employeeId: "00000002", netSalary: 2 },
      { id: "z", employeeId: "00000001", netSalary: 1 },
    ] }));
    const rows = await service.load("tenant-a", "2026-09");
    assert.deepEqual(Array.from(rows, (row) => row.employeeId), ["00000001", "00000002", "00000028"]);
    assert.equal(rows[0].netSalary, 1);
  }
});
