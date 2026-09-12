import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generateRules } from "../src/lib/expense-settings/categoryModel.js";
import { calculateExpensePolicy, validateExpenseInput } from "../src/lib/expenses/creationPolicy.js";
import { createExpenseCreationService } from "../src/lib/server/expenseCreationService.js";
import { createExpenseCategoryService } from "../src/lib/server/expenseCategoryService.js";
import { canAccessPath } from "../src/app/allservice/rbac/AuthorizationService.js";

const makeCategory = (name = "Food", calculationType = "fixed_limit", locationEnabled = true, gstEnabled = false, basis = "per_expense", amounts = [150, 450]) => {
  const conditions = { locationEnabled, gstEnabled };
  return { name, description: "", active: true, calculationType, conditions,
    locationOptions: locationEnabled ? ["Delhi NCR", "Outside Delhi NCR"] : [], gstOptions: gstEnabled ? ["with_gst", "without_gst"] : [],
    rules: generateRules(conditions).map((rule, index) => ({ ...rule, basis, amount: amounts[index] ?? amounts[0] })) };
};
const input = (extra = {}) => ({ requestId: randomUUID(), projectFirestoreId: "project-a", categoryId: "food", date: "2026-09-09", amount: 100, locationType: "Delhi NCR", ...extra });

test("Food under limit, over limit and outside Delhi resolve configured policy", () => {
  const category = makeCategory();
  const compliant = calculateExpensePolicy(category, input());
  assert.equal(compliant.allowedAmount, 150); assert.equal(compliant.policyExceeded, false); assert.equal(compliant.excessAmount, 0);
  const exceeded = calculateExpensePolicy(category, input({ amount: 220 }));
  assert.equal(exceeded.allowedAmount, 150); assert.equal(exceeded.policyExceeded, true); assert.equal(exceeded.excessAmount, 70);
  assert.equal(calculateExpensePolicy(category, input({ locationType: "Outside Delhi NCR" })).allowedAmount, 450);
});
test("Hotel independently resolves all four location/GST combinations", () => {
  const category = makeCategory("Hotel", "fixed_limit", true, true, "per_expense", [100, 200, 300, 400]);
  for (const rule of category.rules) {
    const result = calculateExpensePolicy(category, { amount: 10, locationType: rule.locationType, gstType: rule.gstType });
    assert.equal(result.ruleId, rule.id); assert.equal(result.allowedAmount, rule.amount);
  }
});
test("Labour five people at 800 yields 4000, while days and units allow fractional quantities", () => {
  const category = makeCategory("Labour", "per_unit", false, false, "per_person", [800]);
  const result = calculateExpensePolicy(category, { quantity: 5, amount: 4000 });
  assert.equal(result.configuredRate, 800); assert.equal(result.allowedAmount, 4000); assert.equal(result.quantity, 5);
  assert.throws(() => calculateExpensePolicy(category, { quantity: 1.5, amount: 100 }), /whole number/);
  for (const basis of ["per_day", "per_unit"]) {
    assert.equal(calculateExpensePolicy(makeCategory("Other", "per_unit", false, false, basis, [100]), { quantity: 1.5, amount: 200 }).allowedAmount, 150);
  }
});
test("Actual category omits all configured monetary and quantity fields", () => {
  const result = calculateExpensePolicy(makeCategory("Material", "actual", false, false, "per_expense", [0]), { amount: 50000 });
  for (const key of ["allowedAmount", "configuredLimit", "configuredRate", "quantity", "locationType", "gstType"]) assert.equal(Object.hasOwn(result, key), false);
  assert.equal(result.policyExceeded, false); assert.equal(result.excessAmount, 0);
});
test("Disabled category, invalid conditions, duplicate rules and invalid quantities rejected", () => {
  assert.throws(() => calculateExpensePolicy({ ...makeCategory(), active: false }, input()), /disabled/);
  assert.throws(() => calculateExpensePolicy(makeCategory(), { amount: 100 }), /location/);
  assert.throws(() => calculateExpensePolicy(makeCategory(), input({ gstType: "with_gst" })), /unconfigured/);
  const category = makeCategory(); category.rules.push(category.rules[0]);
  assert.throws(() => calculateExpensePolicy(category, input()), /unique/);
  for (const quantity of [undefined, 0, -1, Infinity, "5"]) assert.throws(() => calculateExpensePolicy(makeCategory("Labour", "per_unit", false, false, "per_person", [800]), { quantity, amount: 100 }), /quantity/);
});
test("Forged monetary guidance is ignored; identity, status and audit forgery rejected", () => {
  const safe = validateExpenseInput(input({ configuredLimit: 99999, configuredRate: -2, allowedAmount: 99999, policyExceeded: false, excessAmount: 0, amount: 220 }));
  assert.equal(safe.configuredLimit, undefined);
  assert.equal(calculateExpensePolicy(makeCategory(), safe).excessAmount, 70);
  for (const extra of [{ status: "approved" }, { status: "pending" }, { approvedBy: "me" }, { approvedAt: 1 }, { rejectedBy: "me" }, { rejectedAt: 1 }, { companyId: "other" }, { employeeId: "other" }, { employeeFirestoreId: "other" }, { employeeName: "other" }, { createdAt: 1 }, { createdBy: "me" }]) assert.throws(() => validateExpenseInput(input(extra)), /protected/);
});
test("Dates, positive money, receipt protocol and finite quantity validated", () => {
  for (const extra of [{ date: "2026-02-30" }, { date: "bad" }, { amount: 0 }, { amount: -1 }, { amount: Infinity }, { amount: 1.001 }, { billUrl: "javascript:alert(1)" }, { billUrl: "https://name:password@example.com/bill.pdf" }, { quantity: 0 }]) assert.throws(() => validateExpenseInput(input(extra)), /INVALID_EXPENSE/);
  assert.equal(validateExpenseInput(input({ billUrl: "https://example.com/bill.pdf" })).billUrl, "https://example.com/bill.pdf");
});
test("Add Expense route uses create permission; existing setup/view routes remain distinct", () => {
  assert.equal(canAccessPath({ permissions: ["expense.create"] }, "/manager/expenses/add"), true);
  assert.equal(canAccessPath({ permissions: ["expense.view"] }, "/manager/expenses/add"), false);
  assert.equal(canAccessPath({ isOwner: true }, "/manager/expenses/add"), true);
});

test("Expense creation transaction and tenant enforcement against emulator", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
  const app = initializeApp({ projectId: "demo-sharo" }, "expense-creation-test");
  const db = getFirestore(app);
  const service = createExpenseCreationService(db, () => FieldValue.serverTimestamp());
  const settings = createExpenseCategoryService(db, () => FieldValue.serverTimestamp());
  const companyId = "phase2-a";
  const employeeData = { companyId, employeeId: "EMP001", personalInfo: { fullName: "Employee A" }, access: { authUid: "employee-a", roleId: "employee", loginEnabled: true, status: "active", effectivePermissions: ["expense.create"] } };
  const employee = { companyId, token: { uid: "employee-a" }, isOwner: false, employee: { id: "employee-doc-a", ...employeeData }, permissions: ["expense.create"] };
  const owner = { companyId, token: { uid: "owner-a" }, isOwner: true, employee: null, permissions: [] };
  const require = createRequire(new URL("../functions/package.json", import.meta.url));
  const { initializeTestEnvironment, assertFails } = require("@firebase/rules-unit-testing");
  const { doc, setDoc } = require("firebase/firestore");
  const environment = await initializeTestEnvironment({ projectId: "demo-sharo", firestore: { rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") } });
  try {
    await db.doc(`Companies/${companyId}`).set({ ownerUid: owner.token.uid });
    await db.doc(`Companies/${companyId}/Usermanagement/employee-doc-a`).set(employeeData);
    await db.doc(`Companies/${companyId}/Projectmanagement/project-a`).set({ companyId, projectId: "PRJ001", projectName: "Project A" });
    const createCategory = async (category) => {
      const { locationOptions, gstOptions, ...body } = category;
      return (await settings.save(owner, body)).id;
    };
    const foodId = await createCategory(makeCategory());
    await t.test("References provide only company projects and linked employee name", async () => {
      const references = await service.references(employee);
      assert.equal(references.employeeName, "Employee A");
      assert.deepEqual(references.projects, [{ projectFirestoreId: "project-a", projectId: "PRJ001", projectName: "Project A" }]);
    });
    await t.test("Creates identical canonical and employee mirror, pending with unchanged requested amount", async () => {
      const result = await service.create(employee, input({ categoryId: foodId, amount: 220, configuredLimit: 99999 }));
      const canonical = (await db.doc(`Companies/${companyId}/Expenses/${result.expenseId}`).get()).data();
      const mirror = (await db.doc(`Companies/${companyId}/Usermanagement/employee-doc-a/Expenses/${result.expenseId}`).get()).data();
      assert.deepEqual(canonical, mirror); assert.equal(canonical.expenseId, result.expenseId);
      assert.equal(canonical.amount, 220); assert.equal(canonical.allowedAmount, 150); assert.equal(canonical.excessAmount, 70); assert.equal(canonical.policyExceeded, true);
      assert.equal(canonical.status, "pending"); assert.equal(canonical.companyId, companyId); assert.equal(canonical.employeeFirestoreId, "employee-doc-a");
      assert.equal(canonical.employeeId, "EMP001"); assert.equal(canonical.employeeName, "Employee A"); assert.equal(canonical.createdBy.uid, "employee-a");
      assert.equal(canonical.projectId, "PRJ001"); assert.equal(canonical.projectFirestoreId, "project-a"); assert.equal(canonical.projectName, "Project A");
      assert.equal(canonical.category, "Food"); assert.equal(canonical.categoryName, "Food"); assert.equal(canonical.categoryId, foodId);
      assert.equal(canonical.month, 9); assert.equal(canonical.year, 2026); assert.ok(canonical.createdAt.toDate());
    });
    await t.test("Concurrent/retried same submission creates exactly one expense and detects changed payload", async () => {
      const body = input({ categoryId: foodId });
      const before = (await db.collection(`Companies/${companyId}/Expenses`).get()).size;
      const results = await Promise.all([service.create(employee, body), service.create(employee, body)]);
      assert.equal(results[0].expenseId, results[1].expenseId);
      assert.equal((await db.collection(`Companies/${companyId}/Expenses`).get()).size, before + 1);
      assert.equal((await service.create(employee, body)).duplicate, true);
      await assert.rejects(service.create(employee, { ...body, amount: 110 }), /SUBMISSION_CONFLICT/);
    });
    await t.test("Owner without employee profile references and creates canonical approved expense", async () => {
      await db.doc(`Companies/${companyId}`).update({ ownerName: "Trusted Owner" });
      const references = await service.references(owner);
      assert.equal(references.submitterType, "owner"); assert.equal(references.employeeName, "Trusted Owner"); assert.equal(references.projects.length, 1);
      const result = await service.create(owner, input({ categoryId: foodId, amount: 220 }));
      const expense = (await db.doc(`Companies/${companyId}/Expenses/${result.expenseId}`).get()).data();
      assert.equal(expense.status, "approved"); assert.equal(expense.submitterType, "owner");
      assert.equal(expense.employeeName, "Trusted Owner"); assert.equal(expense.employeeId, undefined); assert.equal(expense.employeeFirestoreId, undefined);
      assert.equal(expense.approvedBy.uid, owner.token.uid); assert.equal(expense.approvedBy.role, "owner"); assert.ok(expense.approvedAt);
      assert.equal(expense.reviewedByUid, owner.token.uid); assert.equal(expense.allowedAmount, 150); assert.equal(expense.excessAmount, 70); assert.equal(expense.policyExceeded, true);
      assert.equal(expense.reimbursed, undefined); assert.equal(expense.reimbursedAmount, undefined);
      const employees = await db.collection(`Companies/${companyId}/Usermanagement`).get();
      for (const member of employees.docs) assert.equal((await member.ref.collection("Expenses").doc(result.expenseId).get()).exists, false);
      assert.equal((await db.collection(`Companies/${companyId}/Expenses`).where("status", "==", "pending").get()).docs.some((doc) => doc.id === result.expenseId), false);
      for (const forged of [{ status: "approved" }, { approvedAt: "now" }, { approvedBy: "owner" }, { submitterType: "owner" }, { companyId }]) await assert.rejects(service.create(employee, input({ categoryId: foodId, ...forged })), /protected/);
      const normal = await service.create({ ...employee, isOwner: true, company: { ownerUid: employee.token.uid } }, input({ categoryId: foodId }));
      assert.equal((await db.doc(`Companies/${companyId}/Expenses/${normal.expenseId}`).get()).data().status, "pending");
      await assert.rejects(service.create({ ...employee, isOwner: true, permissions: [] }, input({ categoryId: foodId })), /FORBIDDEN/);
    });
    await t.test("Disabled category, invalid project and unauthorized creation rejected", async () => {
      const disabled = await createCategory({ ...makeCategory("Disabled"), active: false });
      await assert.rejects(service.create(employee, input({ categoryId: disabled })), /disabled/);
      await assert.rejects(service.create(employee, input({ categoryId: foodId, projectFirestoreId: "missing" })), /Project not found/);
      await assert.rejects(service.create({ ...employee, permissions: ["expense.view"] }, input({ categoryId: foodId })), /FORBIDDEN/);
      await assert.rejects(service.create(employee, input({ categoryId: foodId, status: "approved" })), /protected/);
    });
    await t.test("Tenant isolation and identity forgery: references never cross companies", async () => {
      await db.doc("Companies/phase2-b/Projectmanagement/other-project").set({ projectName: "Other", projectId: "PRJ002" });
      const foreignOwner = { ...owner, companyId: "phase2-b", token: { uid: "owner-b" } };
      const foreignCategory = (await settings.save(foreignOwner, { name: "Foreign", description: "", active: true, calculationType: "actual", conditions: { locationEnabled: false, gstEnabled: false }, rules: [{ id: "all_all", locationType: null, gstType: null, basis: "per_expense", amount: 0 }] })).id;
      await assert.rejects(service.create(employee, input({ categoryId: foodId, projectFirestoreId: "other-project" })), /Project not found/);
      await assert.rejects(service.create(employee, input({ categoryId: foreignCategory })), /Category not found/);
      await assert.rejects(service.create(employee, input({ categoryId: foodId, employeeFirestoreId: "owner-employee" })), /protected/);
      assert.equal((await service.references(employee)).projects.length, 1);
      assert.equal((await db.collection("Companies/phase2-b/Expenses").get()).size, 0);
    });
    await t.test("Actual category persists no allowance, Labour recomputes allowance on server", async () => {
      const actual = await createCategory(makeCategory("Material", "actual", false, false, "per_expense", [0]));
      const labour = await createCategory(makeCategory("Labour", "per_unit", false, false, "per_person", [800]));
      for (const [categoryId, quantity, allowance] of [[actual, undefined, undefined], [labour, 5, 4000]]) {
        const body = input({ categoryId, amount: 5000 }); delete body.locationType;
        if (quantity) body.quantity = quantity;
        const result = await service.create(employee, body);
        const saved = (await db.doc(`Companies/${companyId}/Expenses/${result.expenseId}`).get()).data();
        assert.equal(saved.allowedAmount, allowance);
        assert.equal(saved.policyExceeded, allowance !== undefined);
      }
    });
    await t.test("Client cannot forge idempotency records, including owner wildcard", async () => {
      const requestKey = createHash("sha256").update("employee-a:fake").digest("hex");
      for (const context of [environment.authenticatedContext("owner-a"), environment.authenticatedContext("employee-a", { companyId, companyEmployeeId: "employee-doc-a" })]) {
        await assertFails(setDoc(doc(context.firestore(), "Companies", companyId, "ExpenseCreateRequests", requestKey), { expenseId: "forged" }));
      }
    });
  } finally { await environment.cleanup(); await db.terminate(); await deleteApp(app); }
});
