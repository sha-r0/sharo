import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { normalizeQuotationRecord, compareQuotationNumbersDescending } from '../src/app/(dashboard)/manager/quotation-builder/services/quotationCompatibility.js';
import { buildQuotationList, quotationListComparator } from '../src/lib/quotations/quotationList.js';
import { migrateLegacyQuotationStatus, validateManifest } from '../scripts/migrate-legacy-quotation-status.mjs';

const created = '2026-09-18T10:00:00.000Z';
function migrationHarness({ expectedStatus = 'Draft', storedStatus = expectedStatus } = {}) {
  const path = 'Companies/tenant-a/Quotations/legacy-a';
  const data = { meta: { quotationNo: 'QT-26-0010', clientName: 'Legacy client' }, companyId: 'tenant-a', total: 1000, items: [{ description: 'Retain' }], createdAt: 'original' };
  if (storedStatus !== null) data.status = storedStatus;
  const records = new Map([['Companies/tenant-a', {}], [path, data], ['Companies/tenant-a/Quotations/new-draft', { status: 'Draft', quotationNumber: 'QT-26-0011' }], ['Companies/tenant-b/Quotations/legacy-a', { ...data, companyId: 'tenant-b' }]]);
  const ref = (path) => ({ path, collection: (name) => ref(`${path}/${name}`), doc: (id) => ref(`${path}/${id}`) });
  const writes = [];
  const db = { projectId: 'test-project', collection: ref, runTransaction: async (fn) => {
    const pending = [];
    const result = await fn({ get: async (r) => { assert.equal(pending.length, 0, 'reads must precede writes'); return { exists: records.has(r.path), data: () => records.get(r.path), createTime: { toDate: () => new Date(created) } }; }, update: (r, change) => pending.push({ path: r.path, change }) });
    for (const write of pending) { records.set(write.path, { ...records.get(write.path), ...write.change }); writes.push(write); }
    return result;
  } };
  const manifest = { version: 1, projectId: 'test-project', companyId: 'tenant-a', quotations: [{ id: 'legacy-a', quotationNumber: 'QT-26-0010', expectedStatus, createTime: created }] };
  return { records, db, manifest, path, writes };
}

test('migration preview does not write; apply updates only status, excludes new Drafts and other tenants, and is idempotent', async () => {
  const h = migrationHarness(); const before = structuredClone(h.records);
  const preview = await migrateLegacyQuotationStatus(h.db, h.manifest);
  assert.deepEqual(h.records, before); assert.equal(h.writes.length, 0); assert.equal(preview.changes.length, 1);
  await migrateLegacyQuotationStatus(h.db, h.manifest, { apply: true });
  assert.deepEqual(h.writes, [{ path: h.path, change: { status: 'Sent' } }]);
  assert.deepEqual(h.records.get(h.path), { ...before.get(h.path), status: 'Sent' });
  for (const [path, data] of before) if (path !== h.path) assert.deepEqual(h.records.get(path), data);
  const repeat = await migrateLegacyQuotationStatus(h.db, h.manifest, { apply: true });
  assert.deepEqual(repeat.unchanged, ['legacy-a']); assert.equal(h.writes.length, 1);
});

for (const status of [null, '', 'draft']) {
  test(`migration handles inspected legacy raw status ${JSON.stringify(status)} without changing display defaults`, async () => {
    const h = migrationHarness({ expectedStatus: status });
    await migrateLegacyQuotationStatus(h.db, h.manifest, { apply: true });
    assert.equal(h.records.get(h.path).status, 'Sent');
    assert.equal(normalizeQuotationRecord('future-draft', {}).status, 'Draft');
  });
}

for (const failure of ['project', 'tenant', 'number', 'status', 'recreated', 'missing', 'path']) {
  test(`migration rejects ${failure} mismatch without changing any documents`, async () => {
    const h = migrationHarness();
    if (failure === 'project') h.manifest.projectId = 'wrong-project';
    if (failure === 'tenant') h.records.get(h.path).companyId = 'tenant-b';
    if (failure === 'number') h.records.get(h.path).meta.quotationNo = 'QT-26-0020';
    if (failure === 'status') h.records.get(h.path).status = 'Approved';
    if (failure === 'recreated') h.manifest.quotations[0].createTime = '2026-09-19T10:00:00.000Z';
    if (failure === 'missing') h.records.delete(h.path);
    if (failure === 'path') h.manifest.quotations[0].id = '../other';
    const before = structuredClone(h.records);
    await assert.rejects(migrateLegacyQuotationStatus(h.db, h.manifest, { apply: true }));
    assert.deepEqual(h.records, before); assert.equal(h.writes.length, 0);
  });
}

test('migration refuses an empty or duplicate cohort', () => {
  const h = migrationHarness();
  assert.throws(() => validateManifest({ ...h.manifest, quotations: [] }));
  assert.throws(() => validateManifest({ ...h.manifest, quotations: [...h.manifest.quotations, ...h.manifest.quotations] }));
});

test('quotation numbers sort numerically descending regardless of dates or padding', () => {
  const rows = ['QT-26-0008', 'QT-26-0009', 'QT-26-0010', 'QT-26-100', 'QT-26-11', 'QT-25-9999', 'QT-27-0001'].map((quotationNumber, i) => ({ id: String(i), quotationNumber, createdAt: i, quotationDate: `2026-01-${20 - i}` }));
  assert.deepEqual(rows.sort(compareQuotationNumbersDescending).map((r) => r.quotationNumber), ['QT-27-0001', 'QT-26-100', 'QT-26-11', 'QT-26-0010', 'QT-26-0009', 'QT-26-0008', 'QT-25-9999']);
  assert.ok(compareQuotationNumbersDescending({ quotationNumber: 'QT-26-99999999999999999999' }, { quotationNumber: 'QT-26-100000000000000000000' }) > 0);
});

test('legacy numbers participate in ordering, duplicate numbers have deterministic ties, missing numbers sort last', () => {
  const legacy = normalizeQuotationRecord('legacy', { meta: { quotationNo: 'QT-26-0010' } });
  const rows = [{ id: 'missing' }, { id: 'z', quotationNumber: 'QT-26-9' }, legacy, { id: 'a', quotationNumber: 'QT-26-0009' }].sort(compareQuotationNumbersDescending);
  assert.deepEqual(rows.map((r) => r.id), ['legacy', 'a', 'z', 'missing']);
});

const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const filename = new URL('../src/app/(dashboard)/manager/quotation-builder/services/QuotationService.js', import.meta.url).pathname;
const { code } = await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } });
function serviceHarness() {
  const docs = [
    { id: 'eight', data: () => ({ quotationNumber: 'QT-26-0008', status: 'Sent', quotationDate: '2026-09-30', clientName: 'Client' }) },
    { id: 'nine', data: () => ({ meta: { quotationNo: 'QT-26-0009', clientName: 'Client' }, status: 'Sent', quotationDate: '2026-09-20' }) },
    { id: 'ten', data: () => ({ quotationNumber: 'QT-26-0010', status: 'Sent', quotationDate: '2026-09-01', clientName: 'Client' }) },
    { id: 'old', data: () => ({ quotationNumber: 'QT-25-9999', status: 'Draft', quotationDate: '2025-09-01', clientName: 'Other' }) },
  ];
  const queries = [];
  const mocks = {
    'firebase/firestore': { collection: (_, ...parts) => parts.join('/'), doc: (_, ...parts) => parts.join('/'), where: (field, operator, value) => ({ field, operator, value }), orderBy: (field) => ({ orderBy: field }), query: (path, ...conditions) => ({ path, conditions }), getDoc: async () => ({ exists: () => true, id: 'tenant-a', data: () => ({}) }),
      getDocs: async (q) => { queries.push(q); return { docs: q.path.endsWith('/Clients') ? [] : docs.filter((doc) => q.conditions.every((condition) => !condition.field || (condition.operator === '>=' ? doc.data()[condition.field] >= condition.value : doc.data()[condition.field] < condition.value))) }; },
    }, '@/lib/firebase': { db: {}, auth: { currentUser: { getIdToken: async () => 'test-token' } } }, '@/app/allservice/notification/notificationService': {}, './quotationCompatibility.js': { normalizeQuotationRecord, compareQuotationNumbersDescending },
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)((id) => mocks[id] || require(id), module, module.exports, async (url, options) => {
    assert.ok(url.startsWith('/api/quotations/list?'));
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    const params = Object.fromEntries(new URL(url, 'https://sharo.test').searchParams);
    return { ok: true, json: async () => buildQuotationList(docs.map(doc => ({ ...doc.data(), id: doc.id })), params) };
  });
  const service = module.exports.default; service.getSettings = async () => ({});
  return { service, queries };
}

test('list service orders the complete result before existing search/status filtering and pagination', async () => {
  const h = serviceHarness(); const result = await h.service.getDashboard('tenant-a');
  assert.deepEqual(result.quotations.map((r) => r.id), ['ten', 'nine', 'eight', 'old']);
  const filtered = result.quotations.filter((r) => r.status === 'Sent' && r.clientName.includes('Client'));
  assert.deepEqual(filtered.slice(0, 2).map((r) => r.id), ['ten', 'nine']);
  assert.deepEqual(filtered.slice(2, 4).map((r) => r.id), ['eight']);
  assert.equal(result.summary.draft, 1); assert.equal(result.summary.sent, 3);
  assert.ok(h.queries.filter((q) => q.path.endsWith('/Quotations')).every((q) => !q.conditions.some((c) => c.orderBy)));
});

test('month filter keeps numeric quotation order instead of quotation-date order', async () => {
  const h = serviceHarness(); const result = await h.service.getDashboard('tenant-a', { viewMode: 'month', month: '2026-09' });
  assert.deepEqual(result.quotations.map((r) => r.id), ['ten', 'nine', 'eight']);
});


test('active QT series precedes migrated legacy prefixes and random legacy suffixes', () => {
  const rows = ['QTN-Ak-46', 'QTN-260401-944', 'QT-26-0002', 'QT-26-0010', 'QT-26-0009', 'QTN-26-27-063'].map((quotationNumber, id) => ({ id: String(id), quotationNumber }));
  const result = buildQuotationList(rows, { pageSize: 5 }, 'QT');
  assert.deepEqual(result.quotations.map(row => row.quotationNumber), ['QT-26-0010', 'QT-26-0009', 'QT-26-0002', 'QTN-260401-944', 'QTN-26-27-063']);
  assert.deepEqual([...rows].sort(quotationListComparator('QTN')).map(row => row.quotationNumber).slice(0, 2), ['QTN-260401-944', 'QTN-26-27-063']);
});

test('API-backed service returns filtered page two already in numeric order', async () => {
  const h = serviceHarness();
  const result = await h.service.getDashboard('tenant-a', { search: 'Client', status: 'Sent', page: 2, pageSize: 2 });
  assert.equal(result.total, 3); assert.equal(result.totalPages, 2); assert.equal(result.page, 2);
  assert.deepEqual(result.quotations.map(row => row.id), ['eight']);
  assert.ok(h.queries.every(q => !q.path.endsWith('/Quotations')));
});

test('month selection includes legacy normalized dates and API rejects invalid pagination', () => {
  const rows = [{ id: 'legacy', meta: { quotationNo: 'QT-26-0010' }, date: '2026-09-18' }];
  assert.equal(buildQuotationList(rows, { viewMode: 'month', month: '2026-09' }).total, 1);
  assert.throws(() => buildQuotationList(rows, { page: -1 }), /INVALID_QUOTATION_PAGE/);
  assert.throws(() => buildQuotationList(rows, { pageSize: 1000 }), /INVALID_QUOTATION_PAGE/);
});

const routeFile = new URL('../src/app/api/quotations/list/route.js', import.meta.url).pathname;
const { code: routeCode } = await transform(fs.readFileSync(routeFile, 'utf8'), { filename: routeFile, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } });
for (const denied of [false, true]) {
  test(`list API derives company from authorized context, permission denied=${denied}`, async () => {
    const calls = [];
    const mocks = {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/firebase-admin': { adminDb: {} },
      '@/lib/server/authorizeCompanyRequest': { authorizeCompanyRequest: async () => ({ companyId: 'trusted-company' }), requireCompanyPermission: (_, ...permissions) => { assert.deepEqual(permissions, ['quotation.view', 'quotation.manage']); if (denied) throw new Error('FORBIDDEN'); } },
      '@/lib/server/quotationList': { getCompanyQuotationList: async (_, companyId, options) => { calls.push({ companyId, options }); return { quotations: [], total: 0 }; } },
    };
    const module = { exports: {} };
    new Function('require', 'module', 'exports', routeCode)((id) => mocks[id] || require(id), module, module.exports);
    const result = await module.exports.GET({ url: 'https://sharo.test/api/quotations/list?companyId=forged&page=2&pageSize=5&search=QT-26-' });
    assert.equal(result.status, denied ? 403 : 200);
    if (denied) assert.equal(calls.length, 0);
    else { assert.equal(calls[0].companyId, 'trusted-company'); assert.equal(calls[0].options.page, '2'); assert.equal(calls[0].options.search, 'QT-26-'); }
  });
}

test('quotation page consumes API pagination without re-slicing records', () => {
  const source = fs.readFileSync(new URL('../src/app/(dashboard)/manager/quotation-builder/components/Dashboard.jsx', import.meta.url), 'utf8');
  assert.match(source, /totalQuotations=\{dashboard.total/);
  assert.doesNotMatch(source, /filteredQuotations|\.slice\(/);
  assert.match(source, /viewMode, month, search, status, page, pageSize/);
});
