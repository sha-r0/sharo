"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeEmployeeCode, resolveEmployee } = require("../src/easytimepro_webhook");

function employeeDoc(id, employeeId, attendanceHardware) {
  const data = { employeeId, ...(attendanceHardware ? { attendanceHardware } : {}) };
  return { id, data: () => data };
}

function companyWithEmployees(companyId, docs) {
  return {
    id: companyId,
    collection(name) {
      assert.equal(name, "Usermanagement");
      return {
        where(field, operator, value) {
          assert.equal(operator, "==");
          const matches = docs.filter((doc) => {
            const data = doc.data();
            return field === "employeeId"
              ? data.employeeId === value
              : data.attendanceHardware?.easyTimeProEmpCode === value;
          });
          return { get: async () => ({ docs: matches, size: matches.length }) };
        },
        get: async () => ({ docs }),
      };
    },
  };
}

async function matchedId(machineCode, employeeIds) {
  const docs = employeeIds.map((employeeId, index) => employeeDoc(`employee-${index + 1}`, employeeId));
  const result = await resolveEmployee(companyWithEmployees("company-a", docs), machineCode);
  return { status: result.status, id: result.employeeDoc?.id };
}

test("numeric employee codes safely normalize leading zeros", () => {
  assert.equal(normalizeEmployeeCode("29"), "29");
  assert.equal(normalizeEmployeeCode("00000029"), "29");
  assert.equal(normalizeEmployeeCode("00029"), "29");
  assert.equal(normalizeEmployeeCode("1"), "1");
  assert.equal(normalizeEmployeeCode("00000001"), "1");
  assert.equal(normalizeEmployeeCode(" ABC001 "), "ABC001");
});

test("exact and zero-padded numeric identifiers resolve deterministically", async () => {
  assert.deepEqual(await matchedId("1", ["1"]), { status: "ready", id: "employee-1" });
  assert.deepEqual(await matchedId("1", ["00000001"]), { status: "ready", id: "employee-1" });
  assert.deepEqual(await matchedId("29", ["00000029"]), { status: "ready", id: "employee-1" });
  assert.deepEqual(await matchedId("00029", ["29"]), { status: "ready", id: "employee-1" });
});

test("non-numeric identifiers require an exact match", async () => {
  assert.deepEqual(await matchedId("ABC001", ["ABC001"]), { status: "ready", id: "employee-1" });
  assert.deepEqual(await matchedId("ABC001", ["1"]), { status: "unmapped_employee", id: undefined });
});

test("unknown numeric code remains unmapped", async () => {
  assert.deepEqual(await matchedId("19", ["1", "00000029"]), { status: "unmapped_employee", id: undefined });
});

test("duplicate normalized identifiers are ambiguous and never assigned", async () => {
  const result = await resolveEmployee(companyWithEmployees("company-a", [
    employeeDoc("employee-a", "29"), employeeDoc("employee-b", "00000029"),
  ]), "00029");
  assert.equal(result.status, "ambiguous_employee");
  assert.equal(result.employeeDoc, undefined);
  assert.deepEqual(result.candidates.sort(), ["employee-a", "employee-b"]);
});

test("resolver reads only the supplied company tenant", async () => {
  const companyA = companyWithEmployees("company-a", [employeeDoc("employee-a", "29")]);
  const companyB = companyWithEmployees("company-b", [employeeDoc("employee-b", "29")]);
  assert.equal((await resolveEmployee(companyA, "29")).employeeDoc.id, "employee-a");
  assert.equal((await resolveEmployee(companyB, "29")).employeeDoc.id, "employee-b");
});
