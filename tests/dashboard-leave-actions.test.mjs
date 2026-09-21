import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
const file = new URL('../src/app/(dashboard)/manager/dashboard/PendingLeaveCard.jsx', import.meta.url);
const { code } = await transform(fs.readFileSync(file, 'utf8'), {
  filename: file.pathname,
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } },
  module: { type: 'commonjs' },
});
function harness({ owner = false, permissions = [], call = async () => {} } = {}) {
  const state = [], calls = [];
  let cursor = 0;
  const slot = (initial) => {
    const index = cursor++;
    if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
    return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
  };
  const module = { exports: {} };
  const mocks = {
    react: { useState: slot, useRef: (value) => slot(() => ({ current: value }))[0] },
    'next/link': { default: 'a' },
    '@/lib/firebase': { functions: {} },
    '@/app/(auth)/context/AuthContext': { useAuth: () => ({ isOwner: owner, hasAnyPermission: (wanted) => wanted.some((p) => permissions.includes(p)) }) },
    './DashboardWidgets': { SectionCard: 'section', EmptyState: 'empty' },
    'firebase/functions': { httpsCallable: (_, name) => async (payload) => { calls.push({ name, payload }); return call(payload); } },
  };
  new Function('require', 'module', 'exports', code)((id) => mocks[id] || require(id), module, module.exports);
  const render = () => { cursor = 0; return module.exports.default({ items: [{ id: 'leave-1' }, { id: 'leave-2' }], renderRecord: (item) => item.id }); };
  return { render, calls };
}
function nodes(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.props?.children, type)];
}
for (const permissions of [[], ['leave.view'], ['leave.approve'], ['leave.manage']]) {
  test(`actions respect permissions: ${permissions.join(',') || 'none'}`, () => {
    const h = harness({ permissions });
    assert.equal(nodes(h.render(), 'button').length, permissions.some((p) => ['leave.approve', 'leave.manage'].includes(p)) ? 2 : 0);
  });
}
for (const [index, decision, loading] of [[0, 'approved', 'Approving…'], [1, 'rejected', 'Rejecting…']]) {
  test(`${decision} uses trusted callable, locks both actions and removes only the successful request`, async () => {
    let resolve;
    const h = harness({ owner: true, call: () => new Promise((done) => { resolve = done; }) });
    nodes(h.render(), 'button')[0].props.onClick();
    const buttons = nodes(h.render(), 'button').slice(1, 3);
    const result = buttons[index].props.onClick();
    await buttons[1 - index].props.onClick();
    assert.equal(h.calls.length, 1);
    assert.deepEqual(h.calls[0], { name: 'decideLeaveRequest', payload: { leaveRequestId: 'leave-1', decision } });
    const busy = nodes(h.render(), 'button');
    assert.equal(busy[0].props['aria-label'], loading);
    assert.equal(busy[0].props['aria-expanded'], false);
    assert.equal(busy.length, 2);
    assert.ok(busy[0].props.disabled);
    assert.equal(busy[1].props.disabled, false);
    resolve();
    await result;
    assert.equal(nodes(h.render(), 'button').length, 1);
    assert.equal(h.calls.length, 1);
  });
}
test('failure keeps request, shows friendly error and allows retry', async () => {
  let attempt = 0;
  const h = harness({ permissions: ['leave.approve'], call: async () => { if (!attempt++) throw new Error('network failure'); } });
  nodes(h.render(), 'button')[0].props.onClick();
  await nodes(h.render(), 'button')[1].props.onClick();
  const failed = h.render();
  assert.equal(nodes(failed, 'button').length, 2);
  assert.equal(nodes(failed, 'button')[0].props.disabled, false);
  assert.match(nodes(failed, 'p')[0].props.children, /Please try again/);
  assert.equal(nodes(failed, 'p')[0].props.role, 'alert');
  nodes(failed, 'button')[0].props.onClick();
  await nodes(h.render(), 'button')[1].props.onClick();
  assert.equal(nodes(h.render(), 'button').length, 1);
});
test('already reviewed failure has a specific friendly message', async () => {
  const h = harness({ owner: true, call: async () => { throw new Error('LEAVE_ALREADY_DECIDED'); } });
  nodes(h.render(), 'button')[0].props.onClick();
  await nodes(h.render(), 'button')[2].props.onClick();
  assert.match(nodes(h.render(), 'p')[0].props.children, /already been reviewed/);
});
