import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pageExpenses, queryExpenseMatches } from '../src/lib/server/expensePageService.js';
import { buildExpenseSearchTerms } from '../src/lib/expenses/searchIndex.js';

const owner = { companyId: 'tenant-a', isOwner: true };
const employee = { companyId: 'tenant-a', permissions: ['expense.view'], employee: { employeeId: 'EMP-42', access: { roleId: 'employee' } } };
const base = { employeeName: 'Ayesha Khan', employeeId: 'EMP-42', employeeFirestoreId: 'employee-42', projectFirestoreId: 'project-1', projectId: 'P-1', projectName: 'Metro', categoryId: 'food', categoryName: 'Food', status: 'pending', amount: 1001, date: '2026-10-20' };

// Implements field-existence, ordering, limit and tuple-cursor semantics so a
// missing index field cannot accidentally pass a mocked Firestore predicate.
function database(rows) {
  const reads = [];
  class Query {
    constructor(collection, predicates = [], orders = [], after = null, maximum = Infinity) {
      Object.assign(this, { collection, predicates, orders, after, maximum });
    }
    where(...predicate) { return new Query(this.collection, [...this.predicates, predicate], this.orders, this.after, this.maximum); }
    orderBy(field, direction) { return new Query(this.collection, this.predicates, [...this.orders, [typeof field === 'string' ? field : '__name__', direction]], this.after, this.maximum); }
    startAfter(...after) { return new Query(this.collection, this.predicates, this.orders, after, this.maximum); }
    limit(maximum) { return new Query(this.collection, this.predicates, this.orders, this.after, maximum); }
    select() { return this; }
    doc() { return { get: async () => ({ exists: true, data: () => ({ totalCount: rows.length, totalExpense: rows.reduce((sum, row) => sum + row.amount, 0) }) }) }; }
    async get() {
      if (this.collection !== 'Expenses') return { docs: [], size: 0, empty: true };
      assert.ok(this.predicates.some(([, op]) => op === '>='), 'Every expense query must have a date lower bound');
      assert.ok(this.predicates.some(([, op]) => op === '<' || op === '<='), 'Every expense query must have a date upper bound');
      assert.ok(this.maximum <= 60, 'Every read must be bounded');
      const value = (row, field) => field === '__name__' ? row.id : row[field];
      const compare = (row, tuple) => {
        for (let i = 0; i < this.orders.length; i++) {
          const [field, direction] = this.orders[i];
          const x = value(row, field), y = tuple[i];
          if (x !== y) return (x < y ? -1 : 1) * (direction === 'desc' ? -1 : 1);
        }
        return 0;
      };
      let result = rows.filter(row => this.predicates.every(([field, op, expected]) => {
        if (row[field] === undefined) return false;
        return op === '==' ? row[field] === expected : op === '>=' ? row[field] >= expected : op === '<=' ? row[field] <= expected : op === '<' ? row[field] < expected : row[field].includes(expected);
      })).filter(row => this.orders.every(([field]) => value(row, field) !== undefined));
      result.sort((a, b) => compare(a, this.orders.map(([field]) => value(b, field))));
      if (this.after) result = result.filter(row => compare(row, this.after) > 0);
      result = result.slice(0, this.maximum);
      reads.push({ predicates: this.predicates, count: result.length });
      const docs = result.map(row => ({ id: row.id, data: () => ({ ...row }) }));
      return { docs, size: docs.length, empty: !docs.length };
    }
  }
  return { reads, collection(name) {
    assert.equal(name, 'Companies');
    return { doc(id) { assert.equal(id, 'tenant-a'); return { collection: name => new Query(name) }; } };
  } };
}
async function allPages(db, context, filters = {}, normal = false) {
  const rows = []; let cursor = null; let calls = 0;
  do {
    const page = normal ? await pageExpenses(db, context, '2026-10', cursor) : await queryExpenseMatches(db, context, '2026-10', filters, cursor);
    rows.push(...page.expenses); cursor = page.cursor;
    assert.ok(++calls < 100, 'Cursor must make progress');
  } while (cursor);
  return rows;
}

test('newest unindexed expense participates in Ayesha search and real total 1532', async () => {
  const old = { ...base, id: 'old', searchTerms: buildExpenseSearchTerms(base) };
  const latest = { ...base, id: 'new', date: '2026-10-26', amount: 531, createdAt: '2026-10-26T12:00:00Z' };
  const result = await queryExpenseMatches(database([old, latest]), owner, '2026-10', { search: 'Ayesha' });
  assert.deepEqual(result.expenses.map(row => row.id), ['new', 'old']);
  assert.equal(result.summary.totalExpense, 1532);
});

test('search matches normalized names, employee IDs, substrings and every existing search field even with stale terms', async () => {
  for (const [field, value, search] of [
    ['employeeName', 'Áyesha Khan', 'yesha'], ['employeeId', 'EMP-42', 'emp-42'],
    ['projectName', 'Metro', 'etro'], ['projectId', 'PR-123', 'pr-12'],
    ['categoryName', 'Lunch', 'unch'], ['category', 'Food', 'food'],
    ['description', 'Airport transfer', 'port trans'], ['travelFrom', 'Delhi', 'del'],
    ['travelTo', 'Mumbai', 'mum'], ['vendorName', 'Acme', 'acm'],
    ['labourName', 'Ravi', 'rav'], ['title', 'Taxi', 'tax'], ['remarks', 'Receipt attached', 'attached'],
  ]) {
    const result = await queryExpenseMatches(database([{ ...base, id: 'row', [field]: value, searchTerms: ['stale'] }]), owner, '2026-10', { search });
    assert.equal(result.expenses.length, 1, field);
  }
});

test('legacy expenseDate is discoverable; date wins over stale expenseDate, month/year and createdAt', async () => {
  const db = database([
    { ...base, id: 'legacy', date: undefined, expenseDate: '2026-10-26' },
    { ...base, id: 'both', date: '2026-10-25', expenseDate: '2026-10-26', month: 9, year: 2000, createdAt: '2026-11-01' },
    { ...base, id: 'outside', date: '2026-09-20', expenseDate: '2026-10-26' },
    { ...base, id: 'next', date: '2026-11-01' },
  ]);
  for (const normal of [false, true]) {
    const rows = await allPages(db, owner, {}, normal);
    assert.deepEqual(rows.map(row => row.id), ['legacy', 'both']);
    assert.equal(rows[0].date, '2026-10-26');
  }
  const range = await queryExpenseMatches(db, owner, '2026-10', { fromDate: '2026-10-26', toDate: '2026-10-26' });
  assert.deepEqual(range.expenses.map(row => row.id), ['legacy']);
  for (const filters of [{ fromDate: '2026-11-01' }, { toDate: '2026-09-30' }, { fromDate: '2026-10-26', toDate: '2026-10-20' }]) {
    assert.equal((await queryExpenseMatches(db, owner, '2026-10', filters)).expenses.length, 0);
  }
});

test('structured filters work without derived keys, and stale keys cannot override identity', async () => {
  const filters = { employee: 'employee-42', project: 'project-1', category: 'food', status: 'pending' };
  const rows = [{ ...base, id: 'correct', employeeFilterKey: 'stale', projectFilterKey: 'stale', categoryFilterKey: 'stale' }];
  for (const [field, value] of [['employeeFirestoreId', 'other'], ['projectFirestoreId', 'other'], ['categoryId', 'other'], ['status', 'rejected']]) rows.push({ ...base, id: field, [field]: value });
  const result = await queryExpenseMatches(database(rows), owner, '2026-10', filters);
  assert.deepEqual(result.expenses.map(row => row.id), ['correct']);
  const legacy = { ...base, id: 'legacy', employeeFirestoreId: undefined, projectFirestoreId: undefined };
  assert.equal((await queryExpenseMatches(database([legacy]), owner, '2026-10', { employee: 'EMP-42', project: 'P-1' })).expenses.length, 1);
});

test('merged pagination keeps date/id descending, handles ties and never skips or duplicates current/legacy records', async () => {
  const rows = Array.from({ length: 137 }, (_, i) => ({ ...base, id: `row-${String(i).padStart(3, '0')}`, date: i % 2 ? undefined : base.date, expenseDate: base.date }));
  const expected = rows.map(row => row.id).sort().reverse();
  for (const normal of [false, true]) assert.deepEqual((await allPages(database(rows), owner, {}, normal)).map(row => row.id), expected);
});

test('scan cap returns a resumable cursor even when a page has no matches', async () => {
  const rows = Array.from({ length: 401 }, (_, i) => ({ ...base, id: `row-${String(i).padStart(3, '0')}`, employeeName: i === 0 ? 'Ayesha' : 'Other' }));
  const db = database(rows);
  const first = await queryExpenseMatches(db, owner, '2026-10', { search: 'Ayesha' });
  assert.equal(first.expenses.length, 0); assert.ok(first.cursor);
  assert.ok(db.reads.reduce((sum, read) => sum + read.count, 0) <= 360);
  assert.deepEqual((await allPages(db, owner, { search: 'Ayesha' })).map(row => row.id), ['row-000']);
});

test('employee query scope and tenant checks apply to text search and legacy dates; permission and cursors are validated', async () => {
  const db = database([
    { ...base, id: 'own', date: undefined, expenseDate: base.date },
    { ...base, id: 'other', employeeId: 'OTHER' },
    { ...base, id: 'foreign', companyId: 'tenant-b' },
  ]);
  const result = await queryExpenseMatches(db, employee, '2026-10', { search: 'Ayesha', employee: 'other' });
  assert.deepEqual(result.expenses.map(row => row.id), ['own']);
  assert.ok(db.reads.every(read => read.predicates.some(p => p[0] === 'employeeId' && p[2] === 'EMP-42')));
  const page = await pageExpenses(db, employee, '2026-10');
  assert.equal(page.totalCount, 1); assert.equal(page.summary.totalExpense, 1001);
  await assert.rejects(queryExpenseMatches(db, { ...employee, permissions: [] }, '2026-10'), /FORBIDDEN/);
  for (const cursor of ['bad', Buffer.from(JSON.stringify({ date: '2026-09-01', id: 'row' })).toString('base64url'), Buffer.from('null').toString('base64url')]) {
    await assert.rejects(queryExpenseMatches(db, owner, '2026-10', {}, cursor), /INVALID_CURSOR/);
  }
});

test('creation and lifecycle search builders share normalized prefix and travel semantics', () => {
  const require = createRequire(import.meta.url);
  const functionsIndex = require('../functions/src/expense/searchIndex.js');
  const expense = { ...base, employeeName: 'Áyesha Khan', travelFrom: 'Delhi', travelTo: 'Mumbai' };
  assert.deepEqual(functionsIndex.buildExpenseSearchTerms(expense), buildExpenseSearchTerms(expense));
  for (const term of ['aye', 'ayesha', 'emp 42', 'del', 'mum']) assert.ok(functionsIndex.buildExpenseSearchTerms(expense).includes(term));
});

test('Firestore emulator: missing fields, merged cursors, date ranges, RBAC and mutation search indexing', { skip: !process.env.FIRESTORE_EMULATOR_HOST }, async () => {
  const { initializeApp, deleteApp } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const { default: lifecycle } = await import('../functions/src/expense/lifecycle.js');
  const app = initializeApp({ projectId: 'demo-sharo' }, 'expense-query-regression');
  const db = getFirestore(app);
  const context = { ...owner, companyId: 'query-regression' };
  const company = db.collection('Companies').doc(context.companyId);
  try {
    const batch = db.batch();
    batch.set(company, { ownerUid: 'owner' });
    batch.set(company.collection('Usermanagement').doc('employee-42'), { employeeId: 'EMP-42', personalInfo: { fullName: 'Ayesha Khan' } });
    const rows = [
      { ...base, id: 'older', searchTerms: buildExpenseSearchTerms(base) },
      { ...base, id: 'latest', date: '2026-10-26', amount: 531 },
      ...Array.from({ length: 67 }, (_, i) => ({ ...base, employeeName: 'Other', employeeId: 'OTHER', id: `legacy-${String(i).padStart(3, '0')}`, date: null, expenseDate: '2026-10-25' })),
      { ...base, employeeName: 'Other', employeeId: 'OTHER', id: 'both', date: '2026-10-24', expenseDate: '2026-10-26' },
    ];
    for (const row of rows) batch.set(company.collection('Expenses').doc(row.id), row);
    batch.set(company.collection('ExpenseMonthlySummaries').doc('2026-10'), { totalCount: rows.length, totalExpense: rows.reduce((sum, row) => sum + row.amount, 0) });
    await batch.commit();
    const result = await queryExpenseMatches(db, context, '2026-10', { search: 'Ayesha' });
    assert.deepEqual(result.expenses.map(row => row.id), ['latest', 'older']);
    assert.equal(result.summary.totalExpense, 1532);
    for (const normal of [false, true]) {
      const actual = await allPages(db, context, {}, normal);
      assert.equal(actual.length, rows.length);
      assert.equal(new Set(actual.map(row => row.id)).size, rows.length);
      assert.equal(actual[0].id, 'latest');
    }
    const range = await queryExpenseMatches(db, context, '2026-10', { fromDate: '2026-10-25', toDate: '2026-10-25' });
    assert.ok(range.expenses.every(row => row.id.startsWith('legacy-')));
    const own = await pageExpenses(db, { ...employee, companyId: context.companyId }, '2026-10');
    assert.equal(own.summary.totalExpense, 1532);
    assert.equal((await queryExpenseMatches(db, { ...context, companyId: 'absent-tenant' }, '2026-10', { search: 'Ayesha' })).expenses.length, 0);
    await lifecycle.mutateExpense(db, { ...context, uid: 'owner', name: 'Owner' }, 'latest', 'approve', {}, FieldValue);
    const updated = (await company.collection('Expenses').doc('latest').get()).data();
    assert.ok(updated.searchTerms.includes('aye'), 'Approval must preserve creation prefix indexing');
    assert.equal((await queryExpenseMatches(db, context, '2026-10', { search: 'yesha', status: 'approved' })).expenses[0].id, 'latest');
  } finally {
    await db.recursiveDelete(company);
    await db.terminate();
    await deleteApp(app);
  }
});
