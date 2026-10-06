const test = require("node:test");
const assert = require("node:assert/strict");

const { deleteAdvanceRequest } = require("../src/advance/AdvanceService");

function harness({ owner = false, role = "accounts_manager", permissions = ["advance.delete"], status = "Pending", payoutStatus = "NOT_INITIATED", companyId = "company-a", storedCompanyId = companyId, targetEmployeeId = "target" } = {}) {
  const writes = [];
  const company = { ownerUid: owner ? "owner-uid" : "different-owner", serviceStatus: "active" };
  const employees = {
    caller: { access: { authUid: "caller-uid", roleId: role, status: "active", loginEnabled: true, effectivePermissions: permissions }, employeeId: "EMP-CALLER" },
    target: { access: { authUid: "target-uid", roleId: "employee", status: "active", loginEnabled: true }, employeeId: "EMP-TARGET" },
  };
  const advance = { companyId: storedCompanyId, employeeFirestoreId: targetEmployeeId, status, payoutStatus };
  const ref = (kind, id) => {
    const value = { id, kind, get: async () => kind === "company" ? { id, exists: true, data: () => company, ref: value } : kind === "employee" ? { id, exists: Boolean(employees[id]), data: () => employees[id], ref: value } : { id, exists: id === "advance-a", data: () => advance, ref: value } };
    if (kind === "company") value.collection = (name) => ({
      doc: (childId) => name === "Usermanagement" ? ref("employee", childId) : ref(name === "advance_requests" ? "advance" : "audit", childId),
    });
    return value;
  };
  const companyRef = ref("company", companyId);
  const db = {
    collection: (name) => ({
      doc: (id) => name === "Companies" ? companyRef : ref("root", id),
    }),
    runTransaction: async (work) => work({
      get: (target) => target.get(),
      delete: (target) => writes.push({ type: "delete", target }),
      create: (target, data) => writes.push({ type: "create", target, data }),
    }),
  };
  const auth = owner
    ? { uid: "owner-uid", token: { companyId } }
    : { uid: "caller-uid", token: { companyId, companyEmployeeId: "caller" } };
  return { db, auth, writes };
}

test("owner can delete a pending advance and writes the deletion audit", async () => {
  const h = harness({ owner: true });
  const result = await deleteAdvanceRequest(h.db, { auth: h.auth, data: { advanceId: "advance-a" } });
  assert.deepEqual(result, { advanceId: "advance-a", status: "Deleted" });
  assert.equal(h.writes.filter((item) => item.type === "delete").length, 1);
  const audit = h.writes.find((item) => item.type === "create");
  assert.equal(audit.data.type, "advance.deleted");
  assert.equal(audit.data.companyId, "company-a");
});

test("Accounts Manager with advance.delete can delete a pending advance", async () => {
  const h = harness();
  await deleteAdvanceRequest(h.db, { auth: h.auth, data: { advanceId: "advance-a" } });
  assert.equal(h.writes.filter((item) => item.type === "delete").length, 1);
});

test("Accounts Manager receives the default delete permission when its stored snapshot is stale", async () => {
  const h = harness({ role: "Accounts Manager", permissions: [] });
  await deleteAdvanceRequest(h.db, { auth: h.auth, data: { advanceId: "advance-a" } });
  assert.equal(h.writes.filter((item) => item.type === "delete").length, 1);
});

test("normal employee cannot delete another employee's advance", async () => {
  const h = harness({ role: "employee", permissions: ["advance.delete"] });
  await assert.rejects(deleteAdvanceRequest(h.db, { auth: h.auth, data: { advanceId: "advance-a" } }), /FORBIDDEN/);
  assert.equal(h.writes.length, 0);
});

test("Accounts Manager can delete advances regardless of status or payout fields", async () => {
  for (const options of [{ status: "Approved" }, { status: "Rejected" }, { status: "Settled" }, { payoutStatus: "QUEUED" }, { payoutStatus: "PROCESSING" }, { payoutStatus: "PAID" }]) {
    const h = harness(options);
    await deleteAdvanceRequest(h.db, { auth: h.auth, data: { advanceId: "advance-a" } });
    assert.equal(h.writes.filter((item) => item.type === "delete").length, 1);
  }
});

test("cross-company and path-injected advance IDs cannot be deleted", async () => {
  const cross = harness({ storedCompanyId: "company-b" });
  await assert.rejects(deleteAdvanceRequest(cross.db, { auth: cross.auth, data: { advanceId: "advance-a" } }), /COMPANY_MISMATCH/);
  const injected = harness({ owner: true });
  await assert.rejects(deleteAdvanceRequest(injected.db, { auth: injected.auth, data: { advanceId: "company-b/advance-a" } }), /INVALID_ADVANCE_ID/);
});
