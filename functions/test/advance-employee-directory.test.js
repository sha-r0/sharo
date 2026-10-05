const test = require('node:test');
const assert = require('node:assert/strict');
const { getAdvanceReferenceData, createAdvanceRequest } = require('../src/advance/AdvanceService');
function harness(role = 'accountant', permissions = ['employee.view'], target = {}) {
  const writes = [], paths = [];
  const records = {
    caller: { employeeId: 'EMP-SELF', access: { authUid: 'caller-uid', roleId: role, status: 'active', effectivePermissions: permissions } },
    target: { employeeId: 'EMP-007', personalInfo: { fullName: 'Target' }, employment: { status: 'Active' }, access: { loginEnabled: false }, ...target },
    inactive: { employeeId: 'EMP-008', employment: { status: 'Inactive' }, access: { status: 'active' } },
  };
  const snap = (id) => ({ id, exists: Boolean(records[id]), data: () => records[id] });
  const companyRef = { collection: (name) => {
    paths.push(`Companies/tenant-a/${name}`);
    return {
      get: async () => ({ docs: name === 'Usermanagement' ? Object.keys(records).map(snap) : [] }),
      doc: (id = 'generated') => ({ id, name, get: async () => snap(id) }),
    };
  } };
  const db = { collection: (name) => { assert.equal(name, 'Companies'); return { doc: (id) => { assert.equal(id, 'tenant-a'); return { ...companyRef, get: async () => ({ exists: true, ref: companyRef, data: () => ({ ownerUid: 'owner-uid' }) }) }; } }; }, runTransaction: async (fn) => fn({ create: (ref, data) => writes.push({ ref, data }) }) };
  const auth = { uid: role === 'owner' ? 'owner-uid' : 'caller-uid', token: { companyId: 'tenant-a', companyEmployeeId: 'caller' } };
  const input = { amount: 1000, monthlyDeduction: 500, firstDeductionDate: '2026-10-10', employeeFirestoreId: 'target', employeeId: 'FORGED', companyId: 'tenant-b' };
  return { db, auth, input, writes, paths };
}
test('owner, manager and accountant readers get only tenant active employees', async () => {
  for (const role of ['owner', 'manager', 'accountant', 'accounts_manager']) {
    const h = harness(role);
    const result = await getAdvanceReferenceData(h.db, { auth: h.auth, data: {} });
    assert.equal(result.companyId, 'tenant-a');
    assert.deepEqual(result.employees.map((x) => x.id).sort(), ['caller', 'target']);
    assert.equal(result.employees.find((x) => x.id === 'target').employeeId, 'EMP-007');
    assert.ok(h.paths.every((path) => path.startsWith('Companies/tenant-a/')));
    assert.equal(result.employees[0].access, undefined);
  }
});
test('employee stays self-only even with read permission; nonreader has no directory', async () => {
  for (const [role, permissions] of [['employee', ['employee.view']], ['accountant', []]]) {
    const h = harness(role, permissions);
    assert.deepEqual((await getAdvanceReferenceData(h.db, { auth: h.auth, data: {} })).employees, []);
    await assert.rejects(createAdvanceRequest(h.db, { auth: h.auth, data: h.input }), /FORBIDDEN/);
    assert.equal(h.writes.length, 0);
  }
});
test('selected Firestore ID resolves trusted business ID and unchanged Pending workflow', async () => {
  const h = harness();
  await createAdvanceRequest(h.db, { auth: h.auth, data: h.input });
  const result = h.writes.find((x) => x.ref.name === 'advance_requests').data;
  assert.equal(result.employeeFirestoreId, 'target');
  assert.equal(result.employeeId, 'EMP-007');
  assert.equal(result.companyId, 'tenant-a');
  assert.equal(result.status, 'Pending');
  assert.equal(result.payoutStatus, 'NOT_INITIATED');
});
test('inactive, missing, and path-injected employees cannot be selected', async () => {
  for (const id of ['inactive', 'foreign-only-id', 'tenant-b/target']) {
    const h = harness();
    await assert.rejects(createAdvanceRequest(h.db, { auth: h.auth, data: { ...h.input, employeeFirestoreId: id } }), /EMPLOYEE_NOT_FOUND|INVALID_EMPLOYEE_ID/);
    assert.equal(h.writes.length, 0);
  }
});
test('normal employee can still request only for self', async () => {
  const h = harness('employee', ['advance.create']);
  delete h.input.employeeFirestoreId;
  await createAdvanceRequest(h.db, { auth: h.auth, data: h.input });
  assert.equal(h.writes[0].data.employeeFirestoreId, 'caller');
  assert.equal(h.writes[0].data.employeeId, 'EMP-SELF');
});
test('reference API rejects client supplied tenant', async () => {
  const h = harness();
  await assert.rejects(getAdvanceReferenceData(h.db, { auth: h.auth, data: { companyId: 'tenant-b' } }), /INVALID_REFERENCE_INPUT/);
});
