import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { readActiveEmployeeDirectory } from '../src/lib/server/activeEmployeeDirectory.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) {
  return (await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } })).code;
}
const authorizeCode = await compile('src/lib/server/authorizeCompanyRequest.js');
const routeCode = await compile('src/app/api/employees/active/route.js');
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => { if (!(id in mocks)) throw new Error(id); return mocks[id]; }, module, module.exports);
  return module.exports;
}
function harness({ owner = false, role = 'accounts_manager', permissions = ['employee.view'], tokenCompany = 'tenant-a' } = {}) {
  const uid = owner ? 'owner-uid' : 'staff-uid';
  const reads = [];
  const records = {
    'Companies/tenant-a': { ownerUid: 'owner-uid', serviceStatus: 'active' },
    'Companies/tenant-b': { ownerUid: 'another-owner', serviceStatus: 'active' },
    'Usermanagement/staff-uid': { uid, companyId: 'tenant-a', companyEmployeeId: 'staff-doc', role },
    'Companies/tenant-a/Usermanagement/staff-doc': { employeeId: '000012', access: { authUid: uid, roleId: role, status: 'active', effectivePermissions: permissions }, personalInfo: { fullName: 'Staff' } },
    'Companies/tenant-a/Usermanagement/target-doc': { employeeId: '000019', personalInfo: { fullName: 'Target' }, employment: { status: 'Active' }, access: { loginEnabled: false }, password: 'must-not-return' },
    'Companies/tenant-a/Usermanagement/inactive-doc': { employeeId: '000099', employment: { status: 'Inactive' }, access: { status: 'active' } },
    'Companies/tenant-b/Usermanagement/other-doc': { employeeId: 'OTHER' },
  };
  const snapshot = (path) => ({ id: path.split('/').at(-1), exists: Boolean(records[path]), data: () => records[path], ref: reference(path) });
  function reference(path) {
    return { collection: (name) => collection(`${path}/${name}`), get: async () => { reads.push(path); return snapshot(path); } };
  }
  function collection(path, conditions = []) {
    return { doc: (id) => reference(`${path}/${id}`), where: (field, op, value) => collection(path, [...conditions, [field, value]]), limit() { return this; },
      get: async () => {
        reads.push(path);
        const docs = Object.keys(records).filter((key) => key.startsWith(path + '/') && key.split('/').length === path.split('/').length + 1)
          .filter((key) => conditions.every(([field, value]) => field.split('.').reduce((current, part) => current?.[part], records[key]) === value)).map(snapshot);
        return { docs, empty: docs.length === 0 };
      },
    };
  }
  const db = { collection };
  const authorization = evaluate(authorizeCode, {
    '@/lib/firebase-admin': { adminDb: db, adminAuth: { verifyIdToken: async (token, revoked) => { assert.equal(token, 'valid'); assert.equal(revoked, true); return { uid, companyId: tokenCompany, companyEmployeeId: owner ? undefined : 'staff-doc', roleId: 'owner' }; } } },
    '@/app/allservice/rbac/permissionCatalog': { ALL_PERMISSIONS: [] },
    './companyPermission.js': {},
  });
  const route = evaluate(routeCode, {
    '@/lib/firebase-admin': { adminDb: db },
    '@/lib/server/authorizeCompanyRequest': authorization,
    '@/lib/server/activeEmployeeDirectory': { readActiveEmployeeDirectory },
  });
  return { reads, get: (companyId = 'tenant-a', authenticated = true) => route.GET(new Request(`http://localhost/api/employees/active?companyId=${companyId}`, { headers: authenticated ? { Authorization: 'Bearer valid' } : {} })) };
}
test('trusted owner without employee.view or employee profile is allowed', async () => {
  const h = harness({ owner: true, permissions: [] });
  const response = await h.get();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result.employees.map((x) => x.employeeFirestoreId), ['staff-doc', 'target-doc']);
  assert.equal(result.employees[1].employeeId, '000019');
  assert.equal(result.companyId, 'tenant-a');
  assert.doesNotMatch(JSON.stringify(result), /must-not-return|effectivePermissions|authUid/);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});
test('owner with stale foreign claim is resolved via trusted company.ownerUid', async () => {
  assert.equal((await harness({ owner: true, tokenCompany: 'tenant-b' }).get()).status, 200);
});
test('accounts manager requires stored employee.view despite a spoofed owner role claim', async () => {
  assert.equal((await harness().get()).status, 200);
  assert.equal((await harness({ permissions: [] }).get()).status, 403);
  assert.equal((await harness({ permissions: ['employee.manage'] }).get()).status, 403);
});
test('normal employee receives only self even if employee.view is present', async () => {
  const h = harness({ role: 'employee' });
  const result = await (await h.get()).json();
  assert.deepEqual(result.employees.map((x) => x.employeeFirestoreId), ['staff-doc']);
  assert.equal(h.reads.includes('Companies/tenant-a/Usermanagement'), false);
});
test('other tenant denied for owner and staff before foreign employee read', async () => {
  for (const owner of [true, false]) {
    const h = harness({ owner });
    const response = await h.get('tenant-b');
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error, 'COMPANY_MISMATCH');
    assert.equal(h.reads.some((path) => path.startsWith('Companies/tenant-b/Usermanagement')), false);
  }
});
test('missing authentication returns HTTP 401', async () => {
  assert.equal((await harness().get('tenant-a', false)).status, 401);
});
