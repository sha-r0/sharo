import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
const { requestPayload } = require('../functions/src/advance/AdvanceService.js');
await loadBindings();
async function compile(file) { return (await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code; }
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => { if (!(id in mocks)) throw new Error(id); return mocks[id]; }, module, module.exports);
  return module.exports;
}
const id = 'LXyltoDkq4oaI5mkM07l';
const form = { employeeFirestoreId: id, advanceType: 'Company', amount: '6000', monthlyDeduction: '', firstDeductionDate: '', requiredDate: '2026-09-05', priority: 'Normal', projectId: 'fixture-project', purpose: 'Fixture work purpose', reason: '', description: '' };
const serviceCode = await compile('src/app/(dashboard)/manager/advance/services/AdvanceService.js');
const modalCode = await compile('src/app/(dashboard)/manager/advance/components/AddAdvanceModal.jsx');
test('modal submits selected document ID, numeric amount, selected project and UTC date; displays exact callable error', async () => {
  let sent, called;
  const messages = [];
  const error = Object.assign(new Error('Advance request contains restricted fields.'), { code: 'functions/permission-denied' });
  const service = evaluate(serviceCode, {
    'firebase/firestore': { serverTimestamp: () => 'timestamp' }, '@/lib/firebase': { db: {}, functions: {} },
    'firebase/functions': { httpsCallable: (_, name) => async (payload) => { called = name; sent = payload; throw error; } },
  }).default;
  let stateIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const modal = evaluate(modalCode, {
    react: { useState: (initial) => {
      const index = stateIndex++;
      const value = index === 0 ? [{ employeeFirestoreId: id, fullName: 'Manish Kumar', employeeId: '00000015' }] : initial?.advanceType ? form : initial;
      return [value, () => {}];
    }, useEffect: () => {}, useMemo: (fn) => fn() },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': { X: 'X' },
    'react-hot-toast': { __esModule: true, default: { error: (text) => messages.push(text), success: () => assert.fail('Unexpected success') } },
    '../services/AdvanceService': { __esModule: true, default: service },
    '@/app/(auth)/context/AuthContext': { useAuth: () => ({ access: { isOwner: true } }) },
    '@/app/allservice/employee/employeeDirectory': { canReadEmployeeDirectory: () => true },
  }).default;
  const tree = modal({ companyId: 'tenant-a', projects: [{ id: 'fixture-project', projectName: 'Fixture project' }], onClose: () => assert.fail('Should remain open') });
  const walk = (node) => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)];
  await walk(tree).find((node) => node.type === 'button' && node.props.children === 'Submit request').props.onClick();
  assert.equal(called, 'createAdvanceRequest');
  assert.equal(sent.employeeFirestoreId, id);
  assert.equal(sent.employeeId, undefined); // Backend derives business ID.
  assert.equal(sent.companyId, undefined); // Backend derives tenant.
  assert.equal(sent.projectId, 'fixture-project');
  assert.equal(sent.amount, 6000);
  assert.equal(sent.advanceType, 'Company');
  assert.equal(sent.requiredDate, '2026-09-05T00:00:00.000Z');
  assert.equal(sent.firstDeductionDate, null);
  assert.deepEqual(messages, ['Advance request contains restricted fields. (functions/permission-denied)']);
});
test('current company-work validator accepts past required date and derives business employee ID', () => {
  const payload = requestPayload({ ...form, amount: 6000, requiredDate: '2026-09-05T00:00:00.000Z' }, { companyId: 'tenant-a', isOwner: true }, { id, data: () => ({ employeeId: '00000015', personalInfo: { fullName: 'Manish Kumar' } }) });
  assert.equal(payload.employeeFirestoreId, id);
  assert.equal(payload.employeeId, '00000015');
  assert.equal(payload.requiredDate.toDate().toISOString(), '2026-09-05T00:00:00.000Z');
  assert.equal(payload.status, 'Pending');
  assert.equal(payload.payoutStatus, 'NOT_INITIATED');
});
test('company work requires project and work purpose', () => {
  for (const missing of ['projectId', 'purpose']) assert.throws(() => requestPayload({ ...form, [missing]: '' }, { companyId: 'tenant-a' }, { id, data: () => ({}) }), /INVALID_COMPANY_ADVANCE/);
});
