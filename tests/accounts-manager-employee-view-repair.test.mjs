import test from 'node:test';
import assert from 'node:assert/strict';
import { planEmployeeView } from '../scripts/repair-accounts-manager-employee-view.mjs';
const roles = new Set(['accounts_manager']);
const employee = () => ({ access: { roleId: 'accounts_manager', authUid: 'staff', effectivePermissions: ['advance.view', 'employee.edit'], permissionOverrides: { grant: ['advance.view'], deny: ['employee.manage'] } } });
test('adds exactly employee.view while preserving arrays and overrides', () => {
  const data = employee(), before = structuredClone(data);
  assert.deepEqual(planEmployeeView(data, { ownerUid: 'owner' }, roles).permissions, ['advance.view', 'employee.edit', 'employee.view']);
  assert.deepEqual(data, before);
});
test('idempotent when employee.view is present', () => {
  const data = employee(); data.access.effectivePermissions.push('employee.view');
  assert.equal(planEmployeeView(data, {}, roles).status, 'already-present');
});
test('explicit current or legacy deny is never overridden', () => {
  for (const legacy of [false, true]) {
    const data = employee();
    if (legacy) data.permissionOverrides = { deny: ['employee.view'] };
    else data.access.permissionOverrides.deny.push('employee.view');
    assert.equal(planEmployeeView(data, {}, roles).status, 'explicit-deny');
  }
});
test('owner, other roles and missing snapshots cannot be changed', () => {
  const data = employee();
  assert.equal(planEmployeeView(data, { ownerUid: 'staff' }, roles).status, 'owner-skipped');
  assert.equal(planEmployeeView({ access: { roleId: 'employee' } }, {}, roles).status, 'not-target');
  delete data.access.effectivePermissions;
  assert.equal(planEmployeeView(data, {}, roles).status, 'missing-snapshot');
});
