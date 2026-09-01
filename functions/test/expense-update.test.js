"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { updateExpenseCore } = require("../src/expense_management");

class Snapshot {
  constructor(ref, value) { this.ref = ref; this.id = ref.id; this._value = value; this.exists = value !== undefined; }
  data() { return this._value; }
}
class Ref {
  constructor(store, path) { this.store = store; this.path = path; this.id = path.split("/").at(-1); }
  collection(name) { return new Collection(this.store, `${this.path}/${name}`); }
  get() { return Promise.resolve(new Snapshot(this, this.store.docs.get(this.path))); }
}
class Query {
  constructor(collection, field, value, max = Infinity) { this.collection = collection; this.field = field; this.value = value; this.max = max; }
  limit(max) { return new Query(this.collection, this.field, this.value, max); }
  async get() {
    const prefix = `${this.collection.path}/`; const docs = [];
    for (const [path, value] of this.collection.store.docs) {
      if (!path.startsWith(prefix) || path.slice(prefix.length).includes("/")) continue;
      const fieldValue = this.field.split(".").reduce((current, key) => current?.[key], value);
      if (fieldValue === this.value) docs.push(new Snapshot(new Ref(this.collection.store, path), value));
    }
    return { docs: docs.slice(0, this.max), size: Math.min(docs.length, this.max), empty: docs.length === 0 };
  }
}
class Collection {
  constructor(store, path) { this.store = store; this.path = path; }
  doc(id = `auto-${++this.store.sequence}`) { return new Ref(this.store, `${this.path}/${id}`); }
  where(field, operator, value) { assert.equal(operator, "=="); return new Query(this, field, value); }
}
class FakeFirestore {
  constructor(seed) { this.docs = new Map(Object.entries(seed)); this.sequence = 0; }
  collection(name) { return new Collection(this, name); }
  async runTransaction(callback) {
    const transaction = {
      get: (ref) => ref.get(),
      update: (ref, value) => { this.docs.set(ref.path, { ...this.docs.get(ref.path), ...value }); },
      create: (ref, value) => { if (this.docs.has(ref.path)) throw new Error("ALREADY_EXISTS"); this.docs.set(ref.path, value); },
    };
    return callback(transaction);
  }
}

const seed = () => ({
  "Companies/company-a": { ownerUid: "owner-a", ownerName: "Ashish Owner" },
  "Companies/company-a/Usermanagement/employee-a": { employeeId: "1", personalInfo: { fullName: "Employee A" } },
  "Companies/company-a/Expenses/expense-a": { amount: 20, employeeFirestoreId: "employee-a", employeeId: "1", editCount: 0 },
  "Companies/company-a/Usermanagement/employee-a/Expenses/expense-a": { amount: 20, employeeFirestoreId: "employee-a", employeeId: "1", editCount: 0 },
  "Companies/company-a/Usermanagement/manager-a": { access: { authUid: "manager-a", roleId: "manager", status: "active", loginEnabled: true, effectivePermissions: ["expense.edit"] }, personalInfo: { fullName: "Manager A" } },
  "Companies/company-b": { ownerUid: "owner-b", ownerName: "Owner B" },
});

test("company owner without employee membership edits canonical, mirror and immutable history", async () => {
  const db = new FakeFirestore(seed());
  const result = await updateExpenseCore(db, { uid: "owner-a", token: { name: "Ashish Owner" } }, { expenseId: "expense-a", amount: 25 });
  assert.deepEqual(result.changedFields, ["amount"]);
  assert.equal(result.editCount, 1);
  const canonical = db.docs.get("Companies/company-a/Expenses/expense-a");
  const mirror = db.docs.get("Companies/company-a/Usermanagement/employee-a/Expenses/expense-a");
  for (const document of [canonical, mirror]) {
    assert.equal(document.amount, 25);
    assert.equal(document.editCount, 1);
    assert.equal(document.lastEditedByUid, "owner-a");
    assert.equal(document.lastEditedByName, "Ashish Owner");
    assert.equal(document.lastEditedByRole, "owner");
    assert.equal(document.lastEditPreviousAmount, 20);
    assert.equal(document.lastEditNewAmount, 25);
    assert.ok(document.lastEditedAt);
  }
  const histories = [...db.docs.entries()].filter(([path]) => path.startsWith("Companies/company-a/Expenses/expense-a/EditHistory/"));
  assert.equal(histories.length, 1);
  assert.equal(histories[0][1].before.amount, 20);
  assert.equal(histories[0][1].after.amount, 25);
});

test("authorized manager with company claim may edit", async () => {
  const db = new FakeFirestore(seed());
  const result = await updateExpenseCore(db, { uid: "manager-a", token: { companyId: "company-a", companyEmployeeId: "manager-a" } }, { expenseId: "expense-a", amount: 25 });
  assert.equal(result.ok, true);
  assert.equal(db.docs.get("Companies/company-a/Expenses/expense-a").lastEditedByRole, "manager");
});

test("unrelated authenticated user, another company owner and unauthenticated caller are denied", async () => {
  await assert.rejects(() => updateExpenseCore(new FakeFirestore(seed()), { uid: "outsider", token: {} }, { expenseId: "expense-a", amount: 25 }), (error) => error.code === "permission-denied");
  await assert.rejects(() => updateExpenseCore(new FakeFirestore(seed()), { uid: "owner-b", token: {} }, { expenseId: "expense-a", amount: 25 }), (error) => error.code === "not-found");
  await assert.rejects(() => updateExpenseCore(new FakeFirestore(seed()), null, { expenseId: "expense-a", amount: 25 }), (error) => error.code === "unauthenticated");
});

test("manager without expense edit permission is denied", async () => {
  const values = seed();
  values["Companies/company-a/Usermanagement/manager-a"].access.effectivePermissions = ["expense.view"];
  await assert.rejects(() => updateExpenseCore(new FakeFirestore(values), { uid: "manager-a", token: { companyId: "company-a", companyEmployeeId: "manager-a" } }, { expenseId: "expense-a", amount: 25 }), (error) => error.code === "permission-denied");
});
