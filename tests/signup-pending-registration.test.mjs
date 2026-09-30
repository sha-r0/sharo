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
const serviceCode = await compile('src/lib/server/pendingRegistrationService.js');
const routeCode = await compile('src/app/api/cashfree/create-order/route.js');
function evaluate(code, mocks, fetch) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)((id) => {
    if (!(id in mocks)) throw new Error(`Unexpected import ${id}`);
    return mocks[id];
  }, module, module.exports, fetch);
  return module.exports;
}
const valid = () => ({ companyName: 'Test', companyAddress: 'Address', companyEmail: 'company@example.com', phone: '9876543210', fullName: 'Owner', adminEmail: 'owner@example.com', adminPhone: '9876543210', password: 'password123', corporateId: 'TEST01', subscription: { plan: 'business', billingType: 'monthly', employeeCount: 10, amount: 990 } });
function harness({ persistenceFails = false, status = 200, networkFails = false } = {}) {
  const calls = [];
  const ref = { create: async (data) => { calls.push(['create', data]); if (persistenceFails) throw new Error('permission denied'); }, delete: async () => calls.push(['delete']) };
  const service = evaluate(serviceCode, {
    '@/lib/firebase-admin': { adminDb: { collection: (name) => { assert.equal(name, 'PendingRegistrations'); return { doc: (id) => { assert.match(id, /^SHARO_[a-f0-9]{32}$/); return ref; } }; } } },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } },
  });
  const route = evaluate(routeCode, {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
    uuid: { v4: () => '12345678-1234-1234-1234-123456789abc' },
    '@/lib/server/pendingRegistrationService': service,
  }, async (url, options) => {
    calls.push(['cashfree', JSON.parse(options.body)]);
    if (networkFails) throw new Error('network interrupted');
    return { ok: status === 200, status, json: async () => ({ payment_session_id: 'session', cf_order_id: 'cf-order' }) };
  });
  return { calls, service, post: (data) => route.POST({ json: async () => data }), route };
}
test('unauthenticated signup persists before Cashfree and returns the existing checkout contract', async () => {
  const h = harness();
  const data = { ...valid(), orderId: 'victim', companyId: 'victim', role: 'admin', paymentStatus: 'PAID' };
  const result = await h.post(data);
  assert.equal(result.status, 200);
  assert.equal(result.body.paymentSessionId, 'session');
  assert.deepEqual(h.calls.map(([name]) => name), ['create', 'cashfree']);
  const record = h.calls[0][1];
  assert.equal(record.orderId, result.body.orderId);
  assert.equal(record.admin.role, 'owner');
  assert.equal(record.paymentStatus, 'PENDING');
  assert.equal(record.companyId, undefined);
  assert.equal(h.calls[1][1].order_amount, 1); // Preserve existing Cashfree pricing.
});
test('persistence failure never creates a Cashfree order', async () => {
  const h = harness({ persistenceFails: true });
  assert.equal((await h.post(valid())).status, 500);
  assert.deepEqual(h.calls.map(([name]) => name), ['create']);
});
test('invalid required fields and subscription are rejected before side effects', async () => {
  for (const data of [null, {}, { ...valid(), password: '' }, { ...valid(), adminEmail: 'invalid' }, { ...valid(), phone: {} }, { ...valid(), subscription: { ...valid().subscription, employeeCount: -1 } }, { ...valid(), subscription: { ...valid().subscription, billingType: 'invalid' } }]) {
    const h = harness();
    assert.equal((await h.post(data)).status, 400);
    assert.deepEqual(h.calls, []);
  }
});
test('definite rejection removes pending record; ambiguous failures retain it', async () => {
  for (const options of [{ status: 400 }, { status: 500 }, { networkFails: true }]) {
    const h = harness(options);
    assert.ok((await h.post(valid())).status >= 400);
    assert.equal(h.calls.some(([name]) => name === 'delete'), options.status === 400);
  }
});
test('malformed JSON is a client error', async () => {
  const h = harness();
  assert.equal((await h.route.POST({ json: async () => { throw new SyntaxError(); } })).status, 400);
  assert.deepEqual(h.calls, []);
});
test('invalid document IDs cannot write and yearly subscriptions retain completion fields', async () => {
  const h = harness();
  await assert.rejects(h.service.savePendingRegistration('other/path', valid()), /Invalid order ID/);
  const data = valid(); data.subscription.billingType = 'yearly'; data.subscription.amount = 10098;
  await h.post(data);
  assert.equal(h.calls[0][1].subscription.yearlyDiscount, 15);
  assert.equal(h.calls[0][1].subscription.employeeRange, '10 Employees');
});
