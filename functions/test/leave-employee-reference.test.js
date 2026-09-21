"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createWorkforceFunctions } = require("../src/workforce/WorkforceFunctions");

function harness(fields, { self = false, permitted = true, employeeExists = true } = {}) {
  const companyId = "tenant-a", employeeId = "XCWgMI95KO2eHDtpztKg";
  const base = `Companies/${companyId}`;
  const records = new Map([
    [base, { ownerUid: "owner" }],
    [`${base}/LeaveRequests/request`, { status: "Pending", totalDays: 1, leaveType: "Unpaid", ...fields }],
    ["Companies/tenant-b/Usermanagement/other-employee", {}],
  ]);
  if (employeeExists) records.set(`${base}/Usermanagement/${employeeId}`, {
    employeeId: "00000001", access: { authUid: "employee-auth", effectivePermissions: permitted ? ["leave.approve"] : [] },
  });
  const reads = [], writes = [];
  const ref = (path) => ({
    path, id: path.split("/").at(-1),
    collection: (name) => ({ doc: (id = "audit") => ref(`${path}/${name}/${id}`) }),
    get: async () => ({ exists: records.has(path), id: path.split("/").at(-1), ref: ref(path), data: () => records.get(path) }),
  });
  const db = {
    collection: (name) => ({ doc: (id) => ref(`${name}/${id}`) }),
    runTransaction: async (run) => run({
      get: async (reference) => { reads.push(reference.path); return reference.get(); },
      update: (reference, data) => writes.push({ path: reference.path, data }),
      set: (reference, data) => writes.push({ path: reference.path, data }),
    }),
  };
  const auth = self || !permitted
    ? { uid: "employee-auth", token: { companyId, companyEmployeeId: employeeId } }
    : { uid: "owner", token: { companyId } };
  const decide = (decision = "approved") => createWorkforceFunctions(db).decideLeaveRequest.run({
    auth, data: { leaveRequestId: "request", decision, companyId: "tenant-b" },
  });
  return { decide, reads, writes, employeeId, base };
}

for (const decision of ["approved", "rejected"]) {
  test(`legacy employeeId document reference supports ${decision} within authenticated tenant`, async () => {
    const h = harness({ employeeId: "XCWgMI95KO2eHDtpztKg" });
    assert.equal((await h.decide(decision)).ok, true);
    assert.ok(h.reads.includes(`${h.base}/Usermanagement/${h.employeeId}`));
    assert.ok(h.writes.every((write) => write.path.startsWith(`${h.base}/`)));
    assert.equal(h.writes[0].data.status, decision === "approved" ? "Approved" : "Rejected");
  });
}
for (const field of ["employeeFirestoreId", "userId"]) {
  test(`${field} remains supported`, async () => {
    assert.equal((await harness({ [field]: "XCWgMI95KO2eHDtpztKg" }).decide()).ok, true);
  });
}
for (const fields of [
  {},
  { employeeId: "00000001" },
  { employeeId: "employee-auth" },
  { authUid: "employee-auth" },
  { employeeId: "other-employee" },
  { employeeId: "../tenant-b/Usermanagement/other-employee" },
  { employeeId: { id: "XCWgMI95KO2eHDtpztKg" } },
  { employeeFirestoreId: "missing", employeeId: "XCWgMI95KO2eHDtpztKg" },
  { userId: "missing", employeeId: "XCWgMI95KO2eHDtpztKg" },
]) {
  test(`invalid or conflicting reference fails closed: ${JSON.stringify(fields)}`, async () => {
    const h = harness(fields);
    await assert.rejects(h.decide(), { message: "INVALID_LEAVE_EMPLOYEE" });
    assert.equal(h.writes.length, 0);
    assert.ok(h.reads.every((path) => path.startsWith(`${h.base}/`)));
  });
}
test("legacy employee reference cannot bypass self-review restriction", async () => {
  const h = harness({ employeeId: "XCWgMI95KO2eHDtpztKg" }, { self: true });
  await assert.rejects(h.decide(), { message: "LEAVE_SELF_APPROVAL_DENIED" });
  assert.equal(h.writes.length, 0);
});
test("legacy employee reference cannot bypass approval permission", async () => {
  const h = harness({ employeeId: "XCWgMI95KO2eHDtpztKg" }, { permitted: false });
  await assert.rejects(h.decide(), { message: "FORBIDDEN" });
  assert.equal(h.writes.length, 0);
});
test("legacy employee reference requires an existing tenant employee", async () => {
  const h = harness({ employeeId: "XCWgMI95KO2eHDtpztKg" }, { employeeExists: false });
  await assert.rejects(h.decide(), { message: "INVALID_LEAVE_EMPLOYEE" });
  assert.equal(h.writes.length, 0);
});
