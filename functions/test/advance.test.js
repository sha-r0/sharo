"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { authorizeDecision } = require("../src/advance/AdvancePolicy");
const { createAdvanceRequest, decideAdvance, requestPayload } = require("../src/advance/AdvanceService");

const employee = { uid: "employee-auth", companyId: "company-a", employeeId: "employee-a", permissions: ["advance.create"] };
const unauthorized = { uid: "manager-auth", companyId: "company-a", employeeId: "manager-a", permissions: ["advance.edit"] };
const approver = { uid: "approver-auth", companyId: "company-a", employeeId: "approver-a", permissions: ["advance.approve"] };

function decision(actor, status, action, companyId = "company-a", employeeFirestoreId = "employee-a") {
  return authorizeDecision({ actor, advanceCompanyId: companyId, employeeFirestoreId, status, action });
}

test("employee cannot approve", () => {
  assert.throws(() => decision(employee, "Pending", "approve"), /FORBIDDEN/);
});

test("unauthorized manager cannot approve", () => {
  assert.throws(() => decision(unauthorized, "Pending", "approve"), /FORBIDDEN/);
});

test("employee with approval permission cannot approve own request", () => {
  assert.throws(() => decision({ ...approver, employeeId: "employee-a" }, "Pending", "approve"), /SELF_APPROVAL_FORBIDDEN/);
});

test("authorized manager can approve", () => {
  assert.deepEqual(decision(approver, "Pending", "approve"), { decision: "Approved" });
});

test("Company A cannot approve Company B advance", () => {
  assert.throws(() => decision(approver, "Pending", "approve", "company-b"), /COMPANY_MISMATCH/);
});

test("Pending transitions to Approved or Rejected", () => {
  assert.equal(decision(approver, "Pending", "approve").decision, "Approved");
  assert.equal(decision(approver, "Pending", "reject").decision, "Rejected");
});

test("Approved or Rejected cannot be decided again", () => {
  assert.throws(() => decision(approver, "Approved", "approve"), /ADVANCE_ALREADY_DECIDED/);
  assert.throws(() => decision(approver, "Approved", "reject"), /ADVANCE_ALREADY_DECIDED/);
  assert.throws(() => decision(approver, "Rejected", "approve"), /ADVANCE_ALREADY_DECIDED/);
});

function employeeSnapshot(id, data = {}) {
  return { id, exists: true, data: () => ({ employeeId: id, access: { status: "active", loginEnabled: true }, ...data }) };
}

test("creation derives company and employee and forces Pending", () => {
  const payload = requestPayload({
    companyId: "company-b", employeeFirestoreId: "employee-b", amount: 1000, advanceType: "Personal",
    monthlyDeduction: 500, firstDeductionDate: "2026-09-01", status: "Approved", approvedBy: "browser",
    approvedAt: "2026-01-01", payoutStatus: "PAID",
  }, employee, employeeSnapshot("employee-a", { employeeId: "EMP-A" }));
  assert.equal(payload.companyId, "company-a");
  assert.equal(payload.employeeFirestoreId, "employee-a");
  assert.equal(payload.status, "Pending");
  assert.equal(payload.approvedBy, null);
  assert.equal(payload.approvedAt, null);
  assert.equal(payload.payoutStatus, "NOT_INITIATED");
});

function backendHarness({ status = "Pending", advanceCompanyId = "company-a", actorPermissions = ["advance.approve"] } = {}) {
  const writes = [];
  const advance = { companyId: advanceCompanyId, employeeFirestoreId: "employee-a", amount: 1000, status, payoutStatus: "NOT_INITIATED" };
  const employeeData = { access: { authUid: "approver-auth", status: "active", loginEnabled: true, effectivePermissions: actorPermissions } };
  let companyRef;
  const collection = (name) => ({
    doc: (id) => ({ id: id || "generated", collectionName: name, get: async () => {
      if (name === "Usermanagement") return { id, exists: true, data: () => employeeData };
      return { id, exists: true, data: () => advance };
    } }),
    get: async () => ({ docs: [] }),
  });
  companyRef = { id: "company-a", collection };
  const companySnapshot = { exists: true, data: () => ({ ownerUid: "owner-auth" }), ref: companyRef };
  const db = {
    collection: () => ({ doc: () => ({ ...companyRef, get: async () => companySnapshot }) }),
    runTransaction: async (work) => work({
      get: async () => ({ id: "advance-a", exists: true, data: () => advance }),
      update: (_ref, values) => { Object.assign(advance, values); writes.push({ type: "update", values }); },
      create: (ref, values) => writes.push({ type: "create", ref, values }),
    }),
  };
  const request = { auth: { uid: "approver-auth", token: { companyId: "company-a", companyEmployeeId: "approver-a" } }, data: { advanceId: "advance-a", action: "approve", companyId: "company-b", amount: 1, status: "Rejected" } };
  return { advance, db, request, writes };
}

test("backend transaction approves from trusted advance and writes ActivityLog", async () => {
  const harness = backendHarness();
  const result = await decideAdvance(harness.db, harness.request);
  assert.equal(result.status, "Approved");
  assert.equal(harness.advance.status, "Approved");
  assert.equal(harness.advance.payoutStatus, "NOT_INITIATED");
  assert.equal(harness.writes.filter((item) => item.type === "create").length, 1);
  assert.equal(harness.writes.find((item) => item.type === "create").values.type, "advance.approved");
});

test("duplicate approval is safely rejected by the transactional state check", async () => {
  const harness = backendHarness();
  await decideAdvance(harness.db, harness.request);
  await assert.rejects(decideAdvance(harness.db, harness.request), /ADVANCE_ALREADY_DECIDED/);
});

test("backend transaction supports Pending to Rejected", async () => {
  const harness = backendHarness();
  harness.request.data = { advanceId: "advance-a", action: "reject" };
  const result = await decideAdvance(harness.db, harness.request);
  assert.equal(result.status, "Rejected");
  assert.equal(harness.advance.approvedBy, null);
  assert.equal(harness.writes.find((item) => item.type === "create").values.type, "advance.rejected");
});

test("Firestore makes backend authoritative for creation and approval fields", () => {
  const rules = fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /match \/advance_requests\/\{id\}[\s\S]*?allow create: if false;/);
  assert.match(rules, /request\.resource\.data\.status == 'Pending'/);
  assert.doesNotMatch(rules.match(/function validEmployeeAdvanceUpdate[\s\S]*?\n    }/)?.[0] || "", /approvedBy|approvedAt|rejectedBy|rejectedAt/);
});

test("client approval sends only advanceId and action", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/app/(dashboard)/manager/advance/services/AdvanceService.js"), "utf8");
  assert.match(source, /decide\(\{ advanceId, action \}\)/);
});
