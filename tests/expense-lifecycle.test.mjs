import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import lifecycle from "../functions/src/expense/lifecycle.js";
import { validateExpenseMutationInput } from "../src/app/api/expenses/[expenseId]/expenseMutationPolicy.js";

const employee = { uid: "phase3-user", companyId: "phase3", permissions: ["expense.create", "expense.edit"], employee: { id: "worker", employeeId: "EMP3", access: { roleId: "employee" }, personalInfo: { fullName: "Worker" } } };
const owner = { uid: "phase3-owner", companyId: "phase3", permissions: [], isOwner: true, name: "Owner" };
const own = { status: "pending", employeeFirestoreId: "worker", employeeId: "EMP3" };
test("normal employee edits/deletes only own pending expense", () => {
  for (const action of ["edit", "delete"]) {
    assert.doesNotThrow(() => lifecycle.assertAuthorized(employee, action, own));
    for (const status of ["approved", "rejected"]) assert.throws(() => lifecycle.assertAuthorized(employee, action, { ...own, status }), /FORBIDDEN/);
    assert.throws(() => lifecycle.assertAuthorized(employee, action, { ...own, employeeFirestoreId: "other" }), /FORBIDDEN/);
  }
});
test("review finality applies to owners and rejected requests require a reason", () => {
  for (const action of ["approve", "reject"]) {
    assert.doesNotThrow(() => lifecycle.assertAuthorized(owner, action, own));
    for (const status of ["approved", "rejected"]) assert.throws(() => lifecycle.assertAuthorized(owner, action, { ...own, status }), /EXPENSE_FINAL/);
  }
  assert.throws(() => validateExpenseMutationInput({ action: "reject" }), /REASON_REQUIRED/);
  assert.throws(() => validateExpenseMutationInput({ action: "reject", managerRemarks: " " }), /REASON_REQUIRED/);
  assert.deepEqual(validateExpenseMutationInput({ action: "reject", managerRemarks: " No receipt " }), { action: "reject", managerRemarks: "No receipt" });
  assert.throws(() => validateExpenseMutationInput({ action: "approve", approvedBy: "forged" }), /INVALID_REQUEST/);
});
test("generic edits reject protected fields; receipt omission remains omission", () => {
  for (const key of ["status", "approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "reviewedBy", "reviewedAt", "companyId", "employeeId", "employeeFirestoreId", "employeeName", "configuredRate", "allowedAmount", "policyExceeded", "ruleId"]) assert.throws(() => lifecycle.editableUpdates({ [key]: "forged" }), /INVALID_REQUEST/);
  assert.deepEqual(lifecycle.editableUpdates({ amount: 120 }), { amount: 120 });
  assert.deepEqual(lifecycle.editableUpdates({ billUrl: "" }), { billUrl: "" });
});

test("transactional Expense lifecycle and Firestore protections", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
  const app = initializeApp({ projectId: "demo-sharo" }, "phase3");
  const db = getFirestore(app);
  const require = createRequire(new URL("../functions/package.json", import.meta.url));
  const { initializeTestEnvironment, assertFails, assertSucceeds } = require("@firebase/rules-unit-testing");
  const { doc, setDoc, updateDoc, deleteDoc } = require("firebase/firestore");
  const environment = await initializeTestEnvironment({ projectId: "demo-sharo", firestore: { rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") } });
  const company = db.collection("Companies").doc("phase3");
  const run = (id, action, input = {}, actor = owner) => lifecycle.mutateExpense(db, actor, id, action, input, FieldValue);
  const canonical = (id) => company.collection("Expenses").doc(id);
  const mirror = (id) => company.collection("Usermanagement").doc("worker").collection("Expenses").doc(id);
  async function seed(id, extra = {}, withMirror = true) {
    const data = { ...own, companyId: "phase3", amount: 220, billUrl: "https://example.com/receipt.pdf", ...extra };
    await canonical(id).set(data); if (withMirror) await mirror(id).set(data);
  }
  async function synced(id) {
    const [a, b] = await Promise.all([canonical(id).get(), mirror(id).get()]);
    assert.equal(a.exists, b.exists); assert.deepEqual(a.data(), b.data()); return a.data();
  }
  try {
    await company.set({ ownerUid: owner.uid });
    await company.collection("Usermanagement").doc("worker").set({ employeeId: "EMP3", access: { authUid: employee.uid, roleId: "employee", status: "active", loginEnabled: true, effectivePermissions: employee.permissions } });
    await company.collection("ExpenseCategories").doc("food").set({ name: "Food", active: true, calculationType: "fixed_limit", conditions: { locationEnabled: true, gstEnabled: false }, locationOptions: ["Delhi NCR", "Outside Delhi NCR"], gstOptions: [], rules: [{ id: "delhi", locationType: "Delhi NCR", gstType: null, amount: 150, basis: "per_expense" }, { id: "outside", locationType: "Outside Delhi NCR", gstType: null, amount: 450, basis: "per_expense" }] });
    await company.collection("ExpenseCategories").doc("actual").set({ name: "Actual", active: true, calculationType: "actual", conditions: { locationEnabled: false, gstEnabled: false }, rules: [{ id: "actual", locationType: null, gstType: null, amount: 0, basis: "per_expense" }] });
    await company.collection("Projectmanagement").doc("project").set({ projectId: "PRJ3", projectName: "Project" });
    await t.test("pending approval/rejection succeed; opposite metadata cleared; repeat/reversal blocked", async () => {
      for (const action of ["approve", "reject"]) {
        await seed(action, { approvedBy: "old", approvedAt: "old", rejectedBy: "old", rejectedAt: "old", managerRemarks: "old" });
        await run(action, action, { managerRemarks: "No receipt" });
        const data = await synced(action);
        assert.equal(data.status, action === "approve" ? "approved" : "rejected");
        assert.equal(data.reviewedBy.uid, owner.uid);
        assert.equal(data[action === "approve" ? "approvedBy" : "rejectedBy"].uid, owner.uid);
        assert.equal(data[action === "approve" ? "rejectedBy" : "approvedBy"], undefined);
        assert.equal(data[action === "approve" ? "rejectedAt" : "approvedAt"], undefined);
        if (action === "reject") assert.equal(data.managerRemarks, "No receipt");
        for (const decision of ["approve", "reject"]) await assert.rejects(run(action, decision, { managerRemarks: "Again" }), /EXPENSE_FINAL/);
      }
    });
    await t.test("simultaneous decisions commit once with one ActivityLog", async () => {
      await seed("race");
      const results = await Promise.allSettled([run("race", "approve"), run("race", "reject", { managerRemarks: "No" })]);
      assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
      await synced("race");
      assert.equal((await company.collection("ActivityLogs").where("targetExpenseId", "==", "race").get()).size, 1);
    });
    await t.test("pending amount recomputes 70 over then within policy and preserves receipt/history", async () => {
      await seed("policy", { amount: 200, categoryId: "food", locationType: "Delhi NCR", allowedAmount: 9999 });
      await run("policy", "edit", { amount: 220 }, employee);
      let data = await synced("policy");
      assert.equal(data.allowedAmount, 150); assert.equal(data.excessAmount, 70); assert.equal(data.policyExceeded, true);
      await run("policy", "edit", { amount: 120 }, employee);
      data = await synced("policy");
      assert.equal(data.excessAmount, 0); assert.equal(data.policyExceeded, false); assert.equal(data.billUrl, "https://example.com/receipt.pdf");
      assert.equal((await canonical("policy").collection("EditHistory").get()).size, 2);
    });
    await t.test("condition/category/project changes revalidate and clear inapplicable policy fields", async () => {
      await run("policy", "edit", { locationType: "Outside Delhi NCR", projectId: "PRJ3" }, employee);
      let data = await synced("policy");
      assert.equal(data.allowedAmount, 450); assert.equal(data.ruleId, "outside"); assert.equal(data.projectFirestoreId, "project");
      await run("policy", "edit", { categoryId: "actual" }, employee);
      data = await synced("policy");
      assert.equal(data.categoryName, "Actual"); assert.equal(data.allowedAmount, undefined); assert.equal(data.locationType, undefined); assert.equal(data.configuredLimit, undefined);
      await assert.rejects(run("policy", "edit", { projectFirestoreId: "missing" }, employee), /INVALID_PROJECT/);
      await run("policy", "edit", { billUrl: "" }, employee);
      assert.equal((await synced("policy")).billUrl, "");
    });
    await t.test("employee final edits/deletes and other employee mutations are blocked", async () => {
      for (const status of ["approved", "rejected"]) {
        await seed(status, { status });
        await assert.rejects(run(status, "edit", { amount: 120 }, employee), /FORBIDDEN/);
        await assert.rejects(run(status, "delete", {}, employee), /FORBIDDEN/);
      }
      await seed("other", { employeeFirestoreId: "other" });
      await assert.rejects(run("other", "edit", { amount: 120 }, employee), /FORBIDDEN/);
    });
    await t.test("legacy mapping fallback repairs missing mirror, no invented limit; pending delete synchronized", async () => {
      await seed("legacy", {}, false);
      await canonical("legacy").update({ employeeFirestoreId: FieldValue.delete() });
      await run("legacy", "edit", { amount: 120 }, employee);
      const data = await synced("legacy");
      assert.equal(data.allowedAmount, undefined); assert.equal(data.billUrl, "https://example.com/receipt.pdf");
      await run("legacy", "delete", {}, employee); await synced("legacy");
      assert.equal((await canonical("legacy").get()).exists, false);
    });
    await t.test("privileged edits/deletes require permission; tenant boundary remains enforced", async () => {
      const manager = { ...employee, employee: { ...employee.employee, access: { roleId: "manager" } } };
      await assert.rejects(run("approved", "delete", {}, manager), /FORBIDDEN/);
      await run("approved", "edit", { amount: 120 }, manager);
      await run("approved", "delete", {}, { ...manager, permissions: ["expense.delete"] });
      await synced("approved");
      await assert.rejects(run("rejected", "edit", { amount: 120 }, { ...owner, companyId: "other-company" }), /EXPENSE_NOT_FOUND/);
    });
    await t.test("direct updates/deletes blocked for employee and owner; legacy Flutter create remains", async () => {
      await seed("rules");
      for (const context of [environment.authenticatedContext(owner.uid), environment.authenticatedContext(employee.uid, { companyId: "phase3", companyEmployeeId: "worker" })]) {
        const client = context.firestore();
        const paymentPath = doc(client, "Companies", "phase3", "Expenses", "rules", "Reimbursements", "forged");
        await assertFails(setDoc(paymentPath, { amount: 100, companyId: "phase3" }));
        await assertFails(updateDoc(paymentPath, { amount: 100 }));
        await assertFails(deleteDoc(paymentPath));
        for (const update of [{ amount: 2 }, { status: "approved" }, { employeeId: "other" }, { allowedAmount: 9999 }]) await assertFails(updateDoc(doc(client, "Companies", "phase3", "Expenses", "rules"), update));
        await assertFails(deleteDoc(doc(client, "Companies", "phase3", "Expenses", "rules")));
        await assertFails(setDoc(doc(client, "Companies", "phase3", "Expenses", "rules", "EditHistory", "forged"), { amount: 2 }));
      }
      const client = environment.authenticatedContext(employee.uid, { companyId: "phase3", companyEmployeeId: "worker" }).firestore();
      await assertSucceeds(setDoc(doc(client, "Companies", "phase3", "Expenses", "flutter-create"), { employeeId: "EMP3", status: "pending", amount: 100 }));
      for (const context of [environment.authenticatedContext(owner.uid), environment.authenticatedContext(employee.uid, { companyId: "phase3", companyEmployeeId: "worker" })]) {
        for (const forged of [{ reimbursed: true }, { reimbursedAmount: 100 }, { reimbursementStatus: "paid" }, { reimbursable: false }, { reimbursedBy: "self" }, { reimbursedAt: "today" }]) {
          await assertFails(setDoc(doc(context.firestore(), "Companies", "phase3", "Expenses", "forged-payment"), { employeeId: "EMP3", status: "pending", amount: 100, ...forged }));
          await assertFails(updateDoc(doc(context.firestore(), "Companies", "phase3", "Expenses", "rules"), forged));
        }
      }
    });
  } finally { await environment.cleanup(); await db.terminate(); await deleteApp(app); }
});
