import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createExpenseCategoryService } from "../src/lib/server/expenseCategoryService.js";
import { generateRules, validateCategory } from "../src/lib/expense-settings/categoryModel.js";
import { requireCompanyPermission } from "../src/lib/server/companyPermission.js";
import { canAccessPath } from "../src/app/allservice/rbac/AuthorizationService.js";

function food(name = "Food") {
  const conditions = { locationEnabled: true, gstEnabled: false };
  return { name, description: "Meal allowance", active: true, calculationType: "fixed_limit", conditions,
    rules: generateRules(conditions).map((rule, index) => ({ ...rule, amount: index ? 450 : 150 })) };
}
const owner = { companyId: "expense-setup-a", token: { uid: "owner-a" }, isOwner: true, permissions: [] };
const manager = { ...owner, isOwner: false, token: { uid: "manager-a" }, employee: { id: "manager-doc", access: { roleId: "manager" } }, permissions: ["expense.manage"] };

test("Food exposes Delhi NCR 150 and Outside Delhi NCR 450", () => {
  const category = validateCategory(food());
  assert.deepEqual(category.locationOptions, ["Delhi NCR", "Outside Delhi NCR"]);
  assert.deepEqual(category.rules.map(({ locationType, amount, basis }) => ({ locationType, amount, basis })), [
    { locationType: "Delhi NCR", amount: 150, basis: "per_expense" },
    { locationType: "Outside Delhi NCR", amount: 450, basis: "per_expense" },
  ]);
});
test("Hotel generates four independent rules with no default amounts", () => {
  const conditions = { locationEnabled: true, gstEnabled: true };
  const rules = generateRules(conditions);
  assert.equal(rules.length, 4);
  assert.ok(rules.every((rule) => rule.amount === ""));
  const category = validateCategory({ ...food("Hotel"), conditions, rules: rules.map((rule, index) => ({ ...rule, amount: index * 100 })) });
  assert.deepEqual(category.rules.map((rule) => [rule.locationType, rule.gstType]), [
    ["Delhi NCR", "with_gst"], ["Delhi NCR", "without_gst"], ["Outside Delhi NCR", "with_gst"], ["Outside Delhi NCR", "without_gst"],
  ]);
});
test("Labour supports per-person, per-day, per-unit and actual calculations", () => {
  for (const basis of ["per_person", "per_day", "per_unit"]) {
    const input = food("Labour"); input.calculationType = "per_unit"; input.rules = input.rules.map((rule) => ({ ...rule, basis }));
    assert.equal(validateCategory(input).rules[0].basis, basis);
  }
  const input = food("Labour"); input.calculationType = "actual"; input.rules = input.rules.map((rule) => ({ ...rule, amount: 0 }));
  assert.equal(validateCategory(input).calculationType, "actual");
});
test("duplicate and missing rule combinations are rejected", () => {
  const input = food(); input.rules[1] = { ...input.rules[0] };
  assert.throws(() => validateCategory(input), /Duplicate rule/);
  assert.throws(() => validateCategory({ ...food(), rules: [] }), /every rule/);
});
test("validation rejects malformed values and browser-controlled authority", () => {
  for (const extra of [{ companyId: "other" }, { createdBy: "forged" }, { updatedBy: "forged" }, { createdAt: 1 }, { updatedAt: 1 }, { code: "FOOD" }, { name: " " }, { active: "true" }, { calculationType: "fake" }, { calculationType: ["actual"] }]) {
    assert.throws(() => validateCategory({ ...food(), ...extra }), /INVALID_CATEGORY/);
  }
  for (const extra of [{ amount: -1 }, { amount: Infinity }, { amount: "150" }, { basis: "fake" }, { basis: ["per_day"] }, { locationType: "Paris" }, { gstType: "with_gst" }]) {
    const input = food(); input.rules[0] = { ...input.rules[0], ...extra };
    assert.throws(() => validateCategory(input), /INVALID_CATEGORY/);
  }
});
test("existing permission helper and route mapping require manage, owner bypass works", () => {
  assert.doesNotThrow(() => requireCompanyPermission(owner, "expense.manage"));
  assert.doesNotThrow(() => requireCompanyPermission(manager, "expense.manage"));
  for (const permission of ["expense.view", "expense.create", "expense.edit", "expense.approve"]) {
    const context = { ...manager, permissions: [permission] };
    assert.throws(() => requireCompanyPermission(context, "expense.manage"), /FORBIDDEN/);
    assert.equal(canAccessPath(context, "/manager/expenses/setup"), false);
  }
  assert.equal(canAccessPath(owner, "/manager/expenses/setup"), true);
  assert.equal(canAccessPath(manager, "/manager/expenses/setup"), true);
});

test("category service and rules against Firestore emulator", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async (t) => {
  const app = initializeApp({ projectId: "demo-sharo" }, "expense-setup-test");
  const db = getFirestore(app);
  const service = createExpenseCategoryService(db, () => FieldValue.serverTimestamp());
  const require = createRequire(new URL("../functions/package.json", import.meta.url));
  const { initializeTestEnvironment, assertFails } = require("@firebase/rules-unit-testing");
  const { doc, setDoc, getDoc } = require("firebase/firestore");
  const environment = await initializeTestEnvironment({ projectId: "demo-sharo", firestore: { rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") } });
  try {
    await db.doc("Companies/expense-setup-a").set({ ownerUid: owner.token.uid });
    await db.doc("Companies/expense-setup-b").set({ ownerUid: "owner-b" });
    let foodId;
    await t.test("owner creates Food with server identity, timestamps and tenant-scoped path", async () => {
      ({ id: foodId } = await service.save(owner, food()));
      const saved = (await db.doc(`Companies/expense-setup-a/ExpenseCategories/${foodId}`).get()).data();
      assert.equal(saved.rules[0].amount, 150); assert.equal(saved.rules[1].amount, 450);
      assert.equal(saved.createdBy.uid, "owner-a"); assert.ok(saved.createdAt.toDate());
      assert.equal(saved.companyId, undefined); assert.equal(saved.id, foodId);
    });
    await t.test("normalized duplicate name rejected including disabled categories", async () => {
      await assert.rejects(service.save(owner, food("  FOOD  ")), /CATEGORY_NAME_EXISTS/);
      await service.save(manager, { ...food(), active: false }, foodId);
      await assert.rejects(service.save(owner, food("food")), /CATEGORY_NAME_EXISTS/);
    });
    await t.test("manager deactivation preserves creator, rules and stable code", async () => {
      const before = (await service.list(owner)).find((item) => item.id === foodId);
      await service.save(manager, { ...food(), active: false }, foodId);
      const after = (await service.list(owner)).find((item) => item.id === foodId);
      assert.equal(after.active, false); assert.equal(after.createdBy.uid, "owner-a");
      assert.equal(after.updatedBy.uid, "manager-a"); assert.equal(after.code, before.code);
      assert.deepEqual(after.rules, before.rules);
    });
    await t.test("unauthorized setup update rejected while create/view may read", async () => {
      for (const permission of ["expense.create", "expense.view", "expense.edit", "expense.approve"]) {
        const context = { ...manager, permissions: [permission] };
        await assert.rejects(service.save(context, food(), foodId), /FORBIDDEN/);
        if (["expense.create", "expense.view"].includes(permission)) assert.equal((await service.list(context)).length, 1);
      }
      await assert.rejects(service.list({ ...manager, permissions: [] }), /FORBIDDEN/);
    });
    await t.test("tenant isolation: cannot read/update another tenant; same names allowed across tenants", async () => {
      const other = { ...owner, companyId: "expense-setup-b", token: { uid: "owner-b" } };
      assert.deepEqual(await service.list(other), []);
      await assert.rejects(service.save(other, food(), foodId), /CATEGORY_NOT_FOUND/);
      await service.save(other, food());
      assert.equal((await service.list(other)).length, 1);
      await assert.rejects(service.save(owner, { ...food(), companyId: other.companyId }), /INVALID_CATEGORY/);
    });
    await t.test("Hotel saves independently configurable location/GST values", async () => {
      const conditions = { locationEnabled: true, gstEnabled: true };
      const rules = generateRules(conditions).map((rule, index) => ({ ...rule, amount: index + 1 }));
      const { id } = await service.save(manager, { ...food("Hotel"), conditions, rules });
      assert.deepEqual((await service.list(manager)).find((item) => item.id === id).rules, rules);
    });
    await t.test("simultaneous duplicate creates allow exactly one commit", async () => {
      const results = await Promise.allSettled([service.save(owner, food("Travel")), service.save(owner, food("TRAVEL"))]);
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.match(results.find((result) => result.status === "rejected").reason.message, /CATEGORY_NAME_EXISTS/);
    });
    await t.test("rename reserves new name, releases old name, and preserves category ID", async () => {
      await assert.rejects(service.save(owner, food("Hotel"), foodId), /CATEGORY_NAME_EXISTS/);
      await service.save(owner, food("Meals"), foodId);
      await service.save(owner, food("Food"));
      assert.equal((await service.list(owner)).find((item) => item.id === foodId).name, "Meals");
    });
    await t.test("client category and name-index writes denied even for owner", async () => {
      for (const context of [environment.unauthenticatedContext(), environment.authenticatedContext(owner.token.uid), environment.authenticatedContext("manager-a", { companyId: owner.companyId, companyEmployeeId: "manager-doc" })]) {
        const client = context.firestore();
        await assertFails(setDoc(doc(client, "Companies", owner.companyId, "ExpenseCategories", "forged"), food()));
        await assertFails(setDoc(doc(client, "Companies", owner.companyId, "ExpenseCategoryNames", "forged"), { categoryId: "forged" }));
        await assertFails(getDoc(doc(client, "Companies", owner.companyId, "ExpenseCategories", foodId)));
      }
    });
  } finally {
    await environment.cleanup();
    await db.terminate();
    await deleteApp(app);
  }
});
