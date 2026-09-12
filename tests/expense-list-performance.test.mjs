import test from 'node:test';
import assert from 'node:assert/strict';
import { listExpenses } from '../src/lib/server/expenseListService.js';

const context = { companyId: 'tenant-a', permissions: ['expense.view'], employee: { employeeId: 'E1', access: { roleId: 'employee' } } };
const payment = (company, expense, amount) => ({ id: 'payment', data: () => ({ amount }), ref: { parent: { parent: { id: expense, parent: { path: `Companies/${company}/Expenses` } } } } });
function database(expenses, ledgerRead, counts) {
  return {
    collection(name) {
      assert.equal(name, 'Companies');
      return { doc(company) {
        assert.equal(company, 'tenant-a');
        return { collection(name) {
          assert.equal(name, 'Expenses');
          return { where(field, operator, value) {
            assert.deepEqual([field, operator, value], ['employeeId', '==', 'E1']);
            return { get: async () => { counts.expenses++; return { docs: expenses }; } };
          } };
        } };
      } };
    },
    collectionGroup(name) {
      assert.equal(name, 'Reimbursements');
      return { where(field, operator, company) {
        assert.deepEqual([field, operator, company], ['companyId', '==', 'tenant-a']);
        return { get: async () => { counts.ledger++; return ledgerRead(); } };
      } };
    },
  };
}
test('indexed path uses two reads, excludes other employee/tenant histories and counts each record once', async () => {
  const counts = { expenses: 0, ledger: 0 };
  const expenses = [{ id: 'own', data: () => ({ status: 'approved', amount: 500 }), ref: { collection() { assert.fail('Indexed path must not query per-expense history'); } } }];
  const ledger = [payment('tenant-a', 'own', 100), { ...payment('tenant-a', 'own', 200), id: 'second' }, payment('tenant-a', 'other-employee', 999), payment('tenant-b', 'own', 999)];
  const result = await listExpenses(database(expenses, () => ({ docs: ledger }), counts), context);
  assert.deepEqual(counts, { expenses: 1, ledger: 1 });
  assert.equal(result.length, 1); assert.equal(result[0].reimbursements.length, 2);
  assert.equal(result[0].reimbursement.reimbursedAmount, 300);
  assert.equal(result[0].reimbursement.outstandingAmount, 200);
  assert.equal(JSON.stringify(result).includes('999'), false);
});
test('missing-index fallback limits concurrency to eight and reads each history once', async () => {
  const counts = { expenses: 0, ledger: 0 }; let active = 0; let peak = 0;
  const seen = [];
  const expenses = Array.from({ length: 19 }, (_, index) => ({ id: String(index), data: () => ({ status: 'approved', amount: 100 }), ref: {
    path: `Companies/tenant-a/Expenses/${index}`,
    collection(name) {
      assert.equal(name, 'Reimbursements');
      return { get: async () => {
        active++; peak = Math.max(peak, active); seen.push(index);
        await new Promise(resolve => setImmediate(resolve)); active--;
        return { docs: [payment('tenant-a', String(index), 25)] };
      } };
    },
  } }));
  const db = database(expenses, () => { throw Object.assign(new Error('Missing COLLECTION_GROUP_ASC index'), { code: 9 }); }, counts);
  const result = await listExpenses(db, context);
  assert.equal(peak, 8); assert.equal(active, 0); assert.equal(seen.length, 19); assert.equal(new Set(seen).size, 19);
  assert.deepEqual(counts, { expenses: 1, ledger: 1 });
  assert.equal(result.reduce((sum, expense) => sum + expense.reimbursement.reimbursedAmount, 0), 19 * 25);
});
