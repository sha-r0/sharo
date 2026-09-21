import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as helpers from '../src/app/(dashboard)/manager/Workforce/components/approvals/reviewHelpers.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const base = new URL('../src/app/(dashboard)/manager/Workforce/', import.meta.url);
async function compile(file) {
  const filename = new URL(file, base).pathname;
  return (await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), module, module.exports);
  return module.exports;
}
const hookCode = await compile('components/approvals/useReviews.js');
function harness({ gps = true, canDecide = true, call = async () => ({ data: { ok: true } }) } = {}) {
  const state = [], subscriptions = [], calls = [], cleanups = [];
  let cursor = 0, mounted = false;
  const slot = (initial) => { const index = cursor++; if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial; return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }]; };
  const mocks = {
    react: { useState: slot, useRef: (value) => slot(() => ({ current: value }))[0], useEffect: (fn) => { if (!mounted) { mounted = true; cleanups.push(fn()); } } },
    'firebase/firestore': { collection: (_, ...parts) => parts.join('/'), onSnapshot: (path, next, fail) => { subscriptions.push({ path, next, fail }); return () => {}; } },
    'firebase/functions': { httpsCallable: (_, name) => async (payload) => { calls.push({ name, payload }); return call(); } },
    '@/lib/firebase': { db: {}, functions: {} },
    '../../gps-approval/gpsapprovalservice/GPSReportService': { __esModule: true, default: { decide: async (gpsPunchId, decision) => { calls.push({ name: 'decideGpsPunch', payload: { gpsPunchId, decision } }); return call(); } } },
    './reviewHelpers': helpers,
  };
  const useReviews = evaluate(hookCode, mocks).default;
  const render = () => { cursor = 0; return useReviews('tenant-a', gps, canDecide); };
  render();
  const emit = (index, rows) => subscriptions[index].next({ docs: rows.map(({ id, ...data }) => ({ id, data: () => data })) });
  return { render, emit, calls, subscriptions, cleanups };
}
for (const gps of [true, false]) {
  test(`${gps ? 'GPS' : 'leave'} approval scopes reads, guards double clicks and immediately updates status`, async () => {
    let resolve;
    const h = harness({ gps, call: () => new Promise((done) => { resolve = done; }) });
    assert.equal(h.subscriptions[0].path, `Companies/tenant-a/${gps ? 'GPSPunches' : 'LeaveRequests'}`);
    assert.equal(h.subscriptions[1].path, 'Companies/tenant-a/Usermanagement');
    h.emit(1, []);
    assert.equal(h.render().loading, true);
    h.emit(0, [{ id: 'record-a', status: 'Pending', type: 'OUT' }]);
    assert.equal(h.render().loading, false);
    const item = h.render().items[0];
    const first = h.render().decide(item, 'approved');
    await h.render().decide(item, 'rejected');
    assert.equal(h.calls.length, 1);
    assert.equal(h.render().busy['record-a'], true);
    assert.equal(h.calls[0].name, gps ? 'decideGpsPunch' : 'decideLeaveRequest');
    assert.deepEqual(h.calls[0].payload, gps ? { gpsPunchId: 'record-a', decision: 'approved' } : { leaveRequestId: 'record-a', decision: 'approved' });
    resolve({ data: { ok: true } }); await first;
    assert.equal(h.render().items[0].displayStatus, 'Approved');
    await h.render().decide(item, 'rejected');
    assert.equal(h.calls.length, 1);
    h.emit(0, [{ id: 'record-a', status: 'Pending' }]);
    assert.equal(h.render().items[0].displayStatus, 'Approved');
  });
  test(`${gps ? 'GPS' : 'leave'} failed action retains pending state and allows retry`, async () => {
    const h = harness({ gps, call: async () => { throw new Error('offline'); } });
    h.emit(0, [{ id: 'r', status: 'Pending' }]); h.emit(1, []);
    await h.render().decide(h.render().items[0], 'rejected');
    assert.equal(h.render().items[0].displayStatus, 'Pending');
    assert.match(h.render().error, /Unable to save/);
    assert.equal(h.render().busy.r, false);
    await h.render().decide(h.render().items[0], 'rejected');
    assert.equal(h.calls.length, 2);
  });
  test(`${gps ? 'GPS' : 'leave'} permissions and reviewed records block decisions`, async () => {
    const h = harness({ gps, canDecide: false });
    await h.render().decide({ id: 'r', status: 'Pending' }, 'approved');
    assert.equal(h.calls.length, 0);
    const reviewed = harness({ gps });
    await reviewed.render().decide({ id: 'r', status: 'Rejected' }, 'approved');
    assert.equal(reviewed.calls.length, 0);
  });
}
test('GPS keeps distinct IN/OUT records, stored addresses, zero distance, timestamp and photo', () => {
  const h = harness();
  h.emit(0, [{ id: 'in', type: 'IN' }, { id: 'out', type: 'OUT' }]); h.emit(1, []);
  assert.equal(h.render().items.length, 2);
  const details = helpers.gpsDetails({ type: 'OUT', time: { toDate: () => new Date('2026-09-18T12:00:00Z') }, officeDistance: 0, photoUrl: 'selfie.jpg', address: { fullAddress: '12 Main Road, Chennai, Tamil Nadu, India' }, location: { latitude: 13, longitude: 80 } });
  assert.equal(details.address, '12 Main Road, Chennai, Tamil Nadu, India');
  assert.equal(details.distance, '0 m');
  assert.equal(details.photo, 'selfie.jpg');
  assert.deepEqual(details.coordinates, [13, 80]);
  assert.equal(helpers.readableAddress('7J4V+Q9 Chennai'), '');
  assert.equal(helpers.readableAddress({ street: 'N/A', city: 'Chennai', state: 'Tamil Nadu' }), 'Chennai, Tamil Nadu');
  assert.equal(helpers.gpsDetails({ location: { latitude: 'bad', longitude: 80 } }).coordinates, null);
});
test('leave duration respects half days, inclusive ranges and invalid values', () => {
  assert.equal(helpers.leaveDuration({ totalDays: 0.5 }), '0.5 days');
  assert.equal(helpers.leaveDuration({ fromDate: '2026-09-18', toDate: '2026-09-20' }), '3 days');
  assert.equal(helpers.leaveDuration({ fromDate: 'bad' }), '—');
  assert.equal(helpers.employeeDetails({ employeeFirestoreId: 'e' }, [{ id: 'e', employeeId: '001', personalInfo: { fullName: 'Alex' } }]).name, 'Alex');
});
test('both pages compile and policy keeps all five original sections beneath approval-first tabs', async () => {
  for (const file of ['gps-approval/page.jsx', 'gps-approval/components/PunchAddress.jsx', 'leave-policy/page.jsx', 'leave-policy/components/LeaveApproval.jsx', 'components/approvals/ReviewPanel.jsx']) assert.ok(await compile(file));
  const source = fs.readFileSync(new URL('leave-policy/page.jsx', base), 'utf8');
  assert.match(source, /useState\("approval"\)/);
  for (const name of ['CreateLeaveType', 'HolidayManager', 'LeaveTypeTable', 'AssignLeavePolicy', 'LeaveBalanceManager']) assert.match(source, new RegExp(`<${name}`));
  const hook = fs.readFileSync(new URL('components/approvals/useReviews.js', base), 'utf8');
  assert.doesNotMatch(hook, /\b(setDoc|updateDoc|addDoc|deleteDoc|writeBatch)\b/);
});
