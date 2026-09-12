import test from "node:test";
import assert from "node:assert/strict";
import { normalizeExpensePeriod, assertExpensePeriodOpen } from "../src/lib/server/expensePeriodService.js";

class Snapshot { constructor(exists, data = {}) { this.exists = exists; this._data = data; } data() { return this._data; } }
test("expense period normalization and absent periods are open", async () => {
  assert.deepEqual(normalizeExpensePeriod("2026-08"), { period: "2026-08", year: 2026, month: 8, label: "August 2026" });
  const transaction = { get: async () => new Snapshot(false) };
  assert.equal((await assertExpensePeriodOpen(transaction, { collection: () => ({ doc: () => ({}) }) }, "2026-08-31")).period, "2026-08");
});
test("locked period blocks mutations while open period remains available", async () => {
  const transaction = { get: async (ref) => new Snapshot(ref.status === "locked", { status: ref.status }) };
  const company = { collection: () => ({ doc: (period) => ({ status: period === "2026-08" ? "locked" : "open" }) }) };
  await assert.rejects(() => assertExpensePeriodOpen(transaction, company, "2026-08-31"), (error) => error.code === "EXPENSE_PERIOD_LOCKED");
  assert.equal((await assertExpensePeriodOpen(transaction, company, "2026-09-01")).period, "2026-09");
});
