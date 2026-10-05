import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { ROLE_TEMPLATES } from '../src/app/allservice/rbac/permissionCatalog.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) { return (await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code; }
const directoryCode = await compile('src/app/allservice/employee/employeeDirectory.js');
function directory(companyId = 'a') {
  const module = { exports: {} };
  const mocks = { '@/lib/firebase': { auth: { currentUser: { getIdToken: async () => 'test-token' } } } };
  new Function('require', 'module', 'exports', 'fetch', directoryCode)((id) => mocks[id], module, module.exports,
    async () => ({ ok: true, json: async () => ({ companyId, employees: [{ id: 'doc-id' }] }) }));
  return module.exports;
}
test('Accountant template gains read only and retains no employee mutations', () => {
  const permissions = ROLE_TEMPLATES.accounts_manager.permissions;
  assert.ok(permissions.includes('employee.view'));
  assert.deepEqual(permissions.filter((p) => p.startsWith('employee.')), ['employee.view']);
});
test('client directory gate requires employee.view for staff and keeps employees self-only', () => {
  const { canReadEmployeeDirectory: can } = directory();
  assert.equal(can({ isOwner: true }), true);
  for (const roleId of ['accountant', 'accounts_manager', 'manager']) {
    assert.equal(can({ roleId, permissions: ['employee.view'] }), true);
    assert.equal(can({ roleId, permissions: ['employee.manage'] }), false);
  }
  assert.equal(can({ roleId: 'employee', permissions: ['employee.view'] }), false);
});
test('client rejects an employee list from a different tenant', async () => {
  await assert.rejects(directory('other').getActiveEmployeeDirectory('a'), /tenant mismatch/);
  assert.deepEqual(await directory().getActiveEmployeeDirectory('a'), [{ id: 'doc-id' }]);
});
test('modified UI and loader compile', async () => {
  for (const file of ['advance/components/AddAdvanceModal.jsx', 'dashboard/ManagerDashboard.jsx', 'dashboard/useDashboardData.js']) await compile(`src/app/(dashboard)/manager/${file}`);
});
