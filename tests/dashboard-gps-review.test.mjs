import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as metrics from '../src/app/(dashboard)/manager/dashboard/dashboardMetrics.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) {
  const filename = new URL(`../src/app/(dashboard)/manager/dashboard/${file}`, import.meta.url).pathname;
  return (await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
function evaluate(code, mocks) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), module, module.exports);
  return module.exports;
}
const helpers = evaluate(await compile('gpsReview.js'), { './dashboardMetrics': metrics });
const code = await compile('GpsPunchesCard.jsx');
const punch = { id: 'gps-document', punchId: 'not-document-id', employeeName: 'Alex', type: 'OUT', time: new Date('2026-09-18T10:00:00Z'), insideGeofence: false, reviewStatus: 'pending', officeDistance: 11158.8, configuredRadius: 50, address: 'Office road', photoUrl: 'https://example.com/photo.jpg' };
function nodes(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((item) => nodes(item, type));
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
function harness({ permissions = ['gps.view', 'gps.approve'], owner = false, records = [punch], normalItems = [], call = async () => ({ ok: true }) } = {}) {
  const state = [], calls = [], subscriptions = [];
  let cursor = 0, subscribed = false;
  const slot = (initial) => { const i = cursor++; if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial; return [state[i], (value) => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; };
  const mocks = {
    react: { useState: slot, useRef: (value) => slot(() => ({ current: value }))[0], useEffect: (fn) => { if (!subscribed) { subscribed = true; fn(); } } },
    '@/lib/firebase': { db: {} },
    '@/app/(auth)/context/AuthContext': { useAuth: () => ({ can: (p) => owner || permissions.includes(p), isOwner: owner, hasAnyPermission: (ps) => ps.some((p) => permissions.includes(p)) }) },
    './DashboardWidgets': { SectionCard: 'section', EmptyState: 'empty' },
    './dashboardMetrics': metrics,
    './gpsReview': helpers,
    '../Workforce/gps-approval/gpsapprovalservice/GPSReportService': { __esModule: true, default: { decide: async (...args) => { calls.push(args); return call(...args); } } },
    'firebase/firestore': {
      collection: (_, ...path) => path.join('/'), where: (...args) => args, query: (...args) => args,
      onSnapshot: (query, next) => { subscriptions.push(query); next({ docs: records.map(({ id, ...data }) => ({ id, data: () => data })) }); return () => {}; },
    },
  };
  const Component = evaluate(code, mocks).default;
  const render = () => { cursor = 0; return Component({ companyId: 'tenant-a', normalItems, renderNormal: (items) => ({ type: 'normal', props: { items } }) }); };
  render();
  return { render, calls, subscriptions };
}
const buttons = (h) => nodes(h.render(), 'button');
const open = (h) => buttons(h).find((b) => b.props['aria-label'] === 'GPS punch actions').props.onClick();
const action = (h, label) => buttons(h).find((b) => b.props.children === label);

test('stored OUT fields render actual outside distance, location, photo and time', () => {
  const details = helpers.gpsReviewDetails(punch);
  assert.equal(details.type, 'OUT');
  assert.equal(details.distance, '11,109 m outside radius');
  assert.equal(details.photo, punch.photoUrl);
  assert.equal(details.address, punch.address);
  assert.notEqual(details.time, '--');
  assert.equal(helpers.gpsReviewDetails({ type: 'IN', distance: 70, configuredRadius: 50 }).distance, '20 m outside radius');
  assert.equal(helpers.gpsReviewDetails({}).distance, 'Distance unavailable');
});
test('only explicitly outside and pending records qualify', () => {
  assert.ok(helpers.isPendingOutsidePunch(punch));
  assert.equal(helpers.isPendingOutsidePunch({ ...punch, reviewStatus: 'Approved' }), false);
  assert.equal(helpers.isPendingOutsidePunch({ ...punch, insideGeofence: true }), false);
  assert.equal(helpers.isPendingOutsidePunch({ reviewStatus: 'pending' }), false);
});
test('valid existing rows are passed unchanged and GPS reads stay tenant scoped', () => {
  const normalItems = [{ id: 'attendance', gpsValid: true }];
  const h = harness({ normalItems });
  assert.equal(nodes(h.render(), 'normal')[0].props.items, normalItems);
  assert.equal(h.subscriptions[0][0], 'Companies/tenant-a/GPSPunches');
  assert.deepEqual(h.subscriptions[0][1], ['date', '==', metrics.dateKey(new Date())]);
});
for (const permissions of [['gps.view'], ['gps.view', 'gps.approve'], ['gps.view', 'gps.manage']]) {
  test(`review menu permissions: ${permissions.join(',')}`, () => {
    const h = harness({ permissions });
    assert.equal(buttons(h).some((b) => b.props['aria-label'] === 'GPS punch actions'), permissions.length > 1);
  });
}
test('no GPS read without view permission', () => assert.equal(harness({ permissions: [] }).subscriptions.length, 0));
for (const [label, decision] of [['Approve', 'approved'], ['Reject', 'rejected']]) {
  test(`${label} uses existing service, prevents duplicate calls and removes successful request`, async () => {
    let resolve;
    const h = harness({ owner: true, call: () => new Promise((done) => { resolve = done; }) });
    open(h);
    const clicked = action(h, label);
    const other = action(h, label === 'Approve' ? 'Reject' : 'Approve');
    const result = clicked.props.onClick();
    await other.props.onClick();
    assert.deepEqual(h.calls, [['gps-document', decision]]);
    assert.equal(action(h, label), undefined);
    assert.ok(buttons(h).some((b) => b.props.disabled));
    resolve({ ok: true }); await result;
    assert.equal(buttons(h).length, 0);
    assert.equal(nodes(h.render(), 'empty').length, 1);
  });
}
test('failed review retains request, reports friendly error and permits retry', async () => {
  const h = harness({ call: async () => { throw new Error('network'); } });
  open(h); await action(h, 'Approve').props.onClick();
  const alert = nodes(h.render(), 'p').find((p) => p.props.role === 'alert');
  assert.match(alert.props.children, /Please try again/);
  open(h); assert.ok(action(h, 'Reject'));
});
test('thumbnail opens photo preview with the exact photo and can close it', () => {
  const h = harness();
  buttons(h).find((b) => b.props['aria-label']?.startsWith('Preview')).props.onClick();
  const children = h.render().props.children;
  const preview = children.find((node) => typeof node?.type === 'function');
  assert.equal(preview.props.photo.photo, punch.photoUrl);
  preview.props.onClose();
  assert.equal(h.render().props.children.some((node) => typeof node?.type === 'function'), false);
});
