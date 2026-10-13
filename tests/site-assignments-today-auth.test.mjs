import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) {
  return (await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript' } }, module: { type: 'commonjs' } })).code;
}
const authorizeCode = await compile('src/lib/server/authorizeCompanyRequest.js');
const routeCode = await compile('src/app/api/site-assignments/today/route.js');
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => { if (!(id in mocks)) throw new Error(id); return mocks[id]; }, module, module.exports);
  return module.exports;
}
function harness({ owner = false, role = 'accounts_manager', permissions = ['employee.view'], tokenCompany = 'tenant-a', rootField = 'employeeFirestoreId', tokenEmployee = 'staff-doc', mutate = () => {}, verifyError } = {}) {
  const uid = owner ? 'owner-uid' : 'staff-uid';
  const reads = [];
  const records = {
    'Companies/tenant-a': { ownerUid: 'owner-uid', serviceStatus: 'active' },
    'Companies/tenant-b': { ownerUid: 'another-owner', serviceStatus: 'active' },
    'Usermanagement/staff-uid': { companyId: 'tenant-a', [rootField]: 'staff-doc', role },
    'Companies/tenant-a/Usermanagement/staff-doc': { employeeId: '000012', access: { authUid: uid, roleId: role, status: 'active', effectivePermissions: permissions }, personalInfo: { fullName: 'Staff' } },
    'Companies/tenant-a/Usermanagement/target-doc': { employeeId: '000019', personalInfo: { fullName: 'Target' }, employment: { status: 'Active' }, access: { loginEnabled: false }, password: 'must-not-return' },
    'Companies/tenant-a/Usermanagement/inactive-doc': { employeeId: '000099', employment: { status: 'Inactive' }, access: { status: 'active' } },
    'Companies/tenant-b/Usermanagement/other-doc': { employeeId: 'OTHER' },
  };
  mutate(records);
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
    '@/lib/firebase-admin': { adminDb: db, adminAuth: { verifyIdToken: async (token, revoked) => { assert.equal(token, 'valid'); assert.equal(revoked, true); if (verifyError) throw verifyError; return { uid, companyId: tokenCompany, companyEmployeeId: owner ? undefined : tokenEmployee, roleId: 'employee' }; } } },
    '@/app/allservice/rbac/permissionCatalog': { ALL_PERMISSIONS: [] },
    './companyPermission.js': {},
  });
  const route = evaluate(routeCode, {
    '@/lib/firebase-admin': { adminDb: db },
    '@/lib/server/authorizeCompanyRequest': authorization,
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
  });
  return { records, reads, get: (companyId = 'tenant-a', authenticated = true) => route.GET(new Request(`http://localhost/api/employees/active?companyId=${companyId}`, { headers: authenticated ? { Authorization: 'Bearer valid' } : {} })) };
}

test('UID-keyed root without uid field authorizes using employeeFirestoreId', async () => {
  const h = harness({ tokenEmployee: null });
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).assignment, null);
  assert.ok(h.reads.includes('Companies/tenant-a/Usermanagement/staff-doc'));
  assert.ok(!h.reads.includes('Usermanagement'));
  assert.ok(!h.reads.includes('Companies/tenant-a/Usermanagement'));
});
test('legacy root companyEmployeeId and token companyEmployeeId remain supported', async () => {
  for (const rootField of ['companyEmployeeId', 'unused']) {
    assert.equal((await harness({ rootField }).get()).status, 200);
  }
});
test('legacy root uid field query remains supported', async () => {
  const h = harness({ mutate(records) {
    records['Usermanagement/legacy'] = { ...records['Usermanagement/staff-uid'], uid: 'staff-uid' };
    delete records['Usermanagement/staff-uid'];
  } });
  assert.equal((await h.get()).status, 200);
});
test('owner with stale company claim needs no employee or membership', async () => {
  const h = harness({ owner: true, tokenCompany: 'tenant-b' });
  const response = await h.get();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).assignment, null);
});
test('every explicit UNAUTHENTICATED branch returns 401', async () => {
  assert.equal((await harness().get('tenant-a', false)).status, 401);
  for (const options of [
    { mutate: r => { delete r['Usermanagement/staff-uid']; } },
    { tokenCompany: '', mutate: r => { delete r['Usermanagement/staff-uid'].companyId; } },
    { mutate: r => { delete r['Companies/tenant-a']; } },
  ]) {
    const response = await harness(options).get();
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'UNAUTHENTICATED' });
  }
});
test('foreign claims cannot bypass root tenant or employee UID binding', async () => {
  const h = harness({ tokenCompany: 'tenant-b', mutate(r) {
    r['Companies/tenant-a/Usermanagement/staff-doc'].access.authUid = 'someone-else';
  } });
  assert.equal((await h.get()).status, 403);
  assert.ok(!h.reads.some(p => p.startsWith('Companies/tenant-b/Usermanagement')));
});
test('disabled employee, inactive root and inactive company stay denied', async () => {
  for (const mutate of [
    r => { r['Companies/tenant-a/Usermanagement/staff-doc'].access.loginEnabled = false; },
    r => { r['Usermanagement/staff-uid'].status = 'inactive'; },
    r => { r['Companies/tenant-a'].serviceStatus = 'inactive'; },
  ]) {
    assert.notEqual((await harness({ mutate }).get()).status, 200);
  }
});
test('diagnostics expose the failure stage without token or SDK message', async () => {
  const previous = process.env.COMPANY_AUTH_DIAGNOSTICS;
  process.env.COMPANY_AUTH_DIAGNOSTICS = '1';
  const logs = [];
  const original = { info: console.info, warn: console.warn, error: console.error };
  for (const key of Object.keys(original)) console[key] = (...args) => logs.push(args);
  try {
    await harness({ verifyError: Object.assign(new Error('secret-token-value'), { code: 'auth/id-token-revoked' }) }).get();
    const output = JSON.stringify(logs);
    assert.match(output, /verifyIdToken/);
    assert.match(output, /auth\/id-token-revoked/);
    assert.doesNotMatch(output, /secret-token-value|Bearer valid/);
  } finally {
    Object.assign(console, original);
    if (previous === undefined) delete process.env.COMPANY_AUTH_DIAGNOSTICS;
    else process.env.COMPANY_AUTH_DIAGNOSTICS = previous;
  }
});

test('today returns only the resolved employee assignment', async () => {
  const h = harness({ mutate(r) {
    r['Companies/tenant-a/SiteAssignments/own'] = {
      employeeFirestoreId: 'staff-doc', status: 'active', startDate: '2000-01-01', endDate: '2099-12-31', projectName: 'Own project',
    };
    r['Companies/tenant-a/SiteAssignments/other'] = {
      employeeFirestoreId: 'other-doc', status: 'active', startDate: '2000-01-01', endDate: '2099-12-31', projectName: 'Other project',
    };
  } });
  const response = await h.get();
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.assignment.assignmentId, 'own');
  assert.equal(result.assignment.projectName, 'Own project');
});
