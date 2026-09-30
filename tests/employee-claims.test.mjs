import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as claims from '../src/lib/server/syncEmployeeClaims.mjs';
import * as employeeAuth from '../src/app/allservice/rbac/employeeAuth.js';
import * as catalog from '../src/app/allservice/rbac/permissionCatalog.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const code = {};
for (const name of ['users', 'session']) {
  const filename = new URL(`../src/app/api/rbac/${name}/route.js`, import.meta.url).pathname;
  code[name] = (await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } })).code;
}
function harness({ linked = false, failClaims = false, inactive = false } = {}) {
  const employee = { employeeId: '00000012', createdBy: 'owner', personalInfo: { fullName: 'Worker' }, employment: { status: 'Active' }, access: { roleId: 'employee', authUid: linked ? 'worker' : null, loginEnabled: !inactive, status: inactive ? 'inactive' : 'active' } };
  const company = { ownerUid: 'owner', corporateId: 'corp', plan: 'enterprise' };
  const records = new Map([['Companies/c', company], ['Companies/c/Usermanagement/e', employee], ['Usermanagement/worker', { uid: 'worker', companyId: 'c', companyEmployeeId: 'e', status: 'active' }]]);
  let customClaims = { unrelated: 'keep' }; const events = []; let token = { uid: 'worker' };
  function ref(path) {
    return { id: path.split('/').at(-1), path, get parent() { return ref(path.split('/').slice(0, -1).join('/')); }, doc: id => ref(`${path}/${id || 'generated'}`), collection: name => ref(`${path}/${name}`),
      get: async () => { if (path.split('/').length % 2 === 0) return { id: path.split('/').at(-1), ref: ref(path), exists: records.has(path), data: () => structuredClone(records.get(path)) };
        const docs = [...records.keys()].filter(key => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1).map(key => ({ id: key.split('/').at(-1), ref: ref(key), exists: true, data: () => structuredClone(records.get(key)) })); return { docs, empty: !docs.length }; },
      update: async (data) => { records.set(path, { ...records.get(path), ...data }); }, add: async () => {},
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }), delete: async () => { events.push('delete-record'); records.delete(path); },
    };
  }
  const db = { collection: ref, batch: () => { const pending = []; return { set: (r, data) => pending.push([r.path, data]), update: (r, data) => pending.push([r.path, data]), commit: async () => { events.push('commit'); for (const [path, data] of pending) records.set(path, { ...records.get(path), ...data }); } }; } };
  const auth = { verifyIdToken: async () => token, getUser: async () => ({ uid: 'worker', disabled: false, customClaims: structuredClone(customClaims) }), getUserByEmail: async () => { throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' }); }, createUser: async () => { events.push('create'); return { uid: 'worker' }; }, setCustomUserClaims: async (uid, value) => { assert.equal(uid, 'worker'); events.push('claims'); if (failClaims) throw new Error('CLAIM_WRITE_FAILED'); customClaims = value; }, deleteUser: async () => events.push('delete-auth'), updateUser: async () => events.push('enable') };
  const mocks = { 'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } }, 'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 1 } }, '@/lib/firebase-admin': { adminAuth: auth, adminDb: db }, '@/lib/server/syncEmployeeClaims.mjs': claims, '@/app/allservice/rbac/employeeAuth': employeeAuth, '@/app/allservice/rbac/permissionCatalog': catalog, '@/lib/server/authorizeCompanyRequest': { authorizeCompanyRequest: async () => ({ token: { uid: 'owner' }, companyId: 'c', company, isOwner: true }) }, '@/lib/server/refreshPerformancePermissions': { refreshPerformancePermissions: async () => {} }, '@/app/allservice/employee/employeeStatutory': { mergeEmployeeStatutory: () => ({}) } };
  function endpoint(name) { const module = { exports: {} }; new Function('require', 'module', 'exports', code[name])(id => mocks[id] || require(id), module, module.exports); return module.exports; }
  return { endpoint, events, records, get claims() { return customClaims; }, setToken: value => { token = value; }, request: input => ({ headers: { get: () => 'Bearer token' }, json: async () => input }) };
}
test('new account receives all claims before employee activation and preserves unrelated claims', async () => {
  const h = harness(); const result = await h.endpoint('users').POST(h.request({ employeeFirestoreId: 'e', password: 'test-only' }));
  assert.equal(result.status, 200); assert.deepEqual(h.events, ['create', 'claims', 'commit']);
  assert.equal(h.claims.companyId, 'c'); assert.equal(h.claims.companyEmployeeId, 'e'); assert.equal(h.claims.roleId, 'employee'); assert.equal(h.claims.accountType, 'employee'); assert.equal(h.claims.unrelated, 'keep'); assert.ok(Number.isSafeInteger(h.claims.permissionsVersion));
});
test('claim provisioning failure rolls back newly created Auth account and does not activate employee', async () => {
  const h = harness({ failClaims: true }); const result = await h.endpoint('users').POST(h.request({ employeeFirestoreId: 'e', password: 'test-only' }));
  assert.notEqual(result.status, 200); assert.deepEqual(h.events, ['create', 'claims', 'delete-auth']);
});
test('creation retry repairs linked employee instead of skipping claims', async () => {
  const h = harness({ linked: true }); const result = await h.endpoint('users').POST(h.request({ employeeFirestoreId: 'e', password: 'test-only', profile: {} }));
  assert.equal(result.status, 200); assert.deepEqual(h.events, ['claims']); assert.equal(h.claims.accountType, 'employee');
});
for (const action of ['enable', 'unlock']) test(`${action} provisions claims before enabling Auth`, async () => {
  const h = harness({ linked: true, inactive: true }); const result = await h.endpoint('users').PATCH(h.request({ action, employeeFirestoreId: 'e', targetUid: 'worker' }));
  assert.equal(result.status, 200); assert.deepEqual(h.events.slice(0, 2), ['claims', 'enable']);
});
test('session repairs missing claims and asks for token refresh without rewriting on a stale token', async () => {
  const h = harness({ linked: true }); const endpoint = h.endpoint('session');
  const first = await endpoint.GET(h.request()); assert.equal(first.status, 200); assert.equal(first.body.claimsRefreshRequired, true);
  const second = await endpoint.GET(h.request()); assert.equal(second.body.claimsRefreshRequired, true); assert.deepEqual(h.events, ['claims']);
  h.setToken({ uid: 'worker', ...h.claims }); const third = await endpoint.GET(h.request()); assert.equal(third.body.claimsRefreshRequired, false);
});
test('inactive employee cannot acquire claims through session bootstrap', async () => {
  const h = harness({ linked: true, inactive: true }); const response = await h.endpoint('session').GET(h.request()); assert.equal(response.status, 403); assert.deepEqual(h.events, []);
});
test('claim helper rejects mismatched UID without writing', async () => {
  let writes = 0; await assert.rejects(claims.syncEmployeeClaims({ setCustomUserClaims: async () => writes++ }, { uid: 'attacker', companyId: 'c', employeeFirestoreId: 'e', employee: { access: { authUid: 'worker' } } }), /UID_MISMATCH/); assert.equal(writes, 0);
});


test('stale role claims are corrected from trusted employee record while unrelated claims survive', async () => {
  let stored = { companyId: 'c', companyEmployeeId: 'e', roleId: 'employee', accountType: 'employee', permissionsVersion: 1, unrelated: { retain: true } };
  const auth = { getUser: async () => ({ disabled: false, customClaims: stored }), setCustomUserClaims: async (_, value) => { stored = value; } };
  const refresh = await claims.ensureEmployeeClaims(auth, { uid: 'worker', companyId: 'c', employeeFirestoreId: 'e', employee: { access: { authUid: 'worker', roleId: 'manager' } } }, stored);
  assert.equal(refresh, true); assert.equal(stored.roleId, 'manager'); assert.deepEqual(stored.unrelated, { retain: true }); assert.ok(stored.permissionsVersion > 1);
});

test('creation retry cannot report success for an unprovisioned login', async () => {
  const h = harness(); const response = await h.endpoint('users').POST(h.request({ employeeFirestoreId: 'e', password: 'test-only', profile: {} }));
  assert.notEqual(response.status, 200); assert.equal(response.body.error, 'EMPLOYEE_PROVISIONING_INCOMPLETE'); assert.deepEqual(h.events, []);
});


test('failed claim sync prevents enabling an account', async () => {
  const h = harness({ linked: true, inactive: true, failClaims: true });
  const response = await h.endpoint('users').PATCH(h.request({ action: 'enable', employeeFirestoreId: 'e', targetUid: 'worker' }));
  assert.notEqual(response.status, 200); assert.deepEqual(h.events, ['claims']);
});
