import * as pendingPassword from "../src/lib/server/pendingPassword.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) {
  return (await transform(fs.readFileSync(file, 'utf8'), { filename: file, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
const serviceCode = await compile('src/lib/server/signupResumeService.js');
const routeCode = await compile('src/app/api/cashfree/create-order/route.js');
const validateCode = await compile('src/app/api/signup/validate/route.js');
const completionCode = await compile('src/lib/server/registrationService.js');
const oldId = 'SHARO_' + 'a'.repeat(32), newId = 'SHARO_' + 'b'.repeat(32);
const storedCredential = await pendingPassword.hashPendingPassword('original-password');
const record = () => ({ orderId: oldId, paymentStatus: 'PENDING', company: { companyName: 'Saved company', companyAddress: 'Saved address', companyEmail: 'company@example.com', phone: '9876543210', gstNumber: '' }, admin: { fullName: 'Saved owner', adminEmail: 'owner@example.com', adminPhone: '9876543210', corporateId: 'saved-id', passwordHash: structuredClone(storedCredential), secret: 'hidden', role: 'owner' }, subscription: { plan: 'business', billingType: 'yearly', employeeCount: 25, amount: 25245, secret: 'hidden' }, secret: 'hidden' });
function evaluate(code, mocks, fetch) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)((id) => (id === './pendingPassword.mjs' ? pendingPassword : mocks[id]) || (id === 'node:crypto' ? require(id) : (() => { throw new Error(id); })()), module, module.exports, fetch);
  return module.exports;
}
function harness({ authExists = false, companyExists = false, paymentStatus = 'PENDING', orderStatus = 'ACTIVE', status = 200, failUpdate = false } = {}) {
  let data = record(); data.paymentStatus = paymentStatus;
  const calls = [];
  const ref = { id: oldId };
  const doc = () => ({ exists: true, ref, data: () => structuredClone(data) });
  const adminDb = {
    collection: (name) => ({ where: (field, op, value) => {
      if (name === 'PendingRegistrations') assert.deepEqual([field, op, value], ['admin.adminEmail', '==', 'owner@example.com']);
      return { limit: () => ({ get: async () => name === 'PendingRegistrations' ? { empty: false, docs: [doc()] } : { empty: !companyExists } }) };
    } }),
    runTransaction: async (fn) => fn({ get: async () => doc(), update: (target, fields) => {
      assert.equal(target, ref);
      if (failUpdate) throw new Error('persistence failed');
      calls.push(['update', fields]); data = { ...data, ...fields };
    } }),
  };
  const adminAuth = { getUserByEmail: async () => { if (!authExists) throw Object.assign(new Error(), { code: 'auth/user-not-found' }); return {}; } };
  const service = evaluate(serviceCode, { '@/lib/firebase-admin': { adminDb, adminAuth } });
  const mocks = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200, headers: options?.headers }) } },
    uuid: { v4: () => 'b'.repeat(32) },
    '@/lib/server/signupResumeService': service,
    '@/lib/server/pendingRegistrationService': { validatePendingRegistration: () => null, savePendingRegistration: async () => { throw new Error('Must not create a second pending registration'); } },
    '@/lib/firebase-admin': { adminDb, adminAuth },
  };
  const route = evaluate(routeCode, mocks, async (url, options) => {
    calls.push([options.method || 'GET', url, options]);
    const creating = options.method === 'POST';
    return { status: creating ? 200 : status, ok: creating || status === 200, json: async () => ({ order_id: creating ? JSON.parse(options.body).order_id : oldId, order_status: orderStatus, payment_session_id: 'safe-session', secret: 'must-not-return' }) };
  });
  const validate = evaluate(validateCode, mocks);
  const input = { adminEmail: 'owner@example.com', password: 'original-password', companyEmail: 'changed@example.com', corporateId: 'changed-id', companyId: 'victim' };
  return { service, calls, input, ref, data: () => data, post: (body = input) => route.POST({ json: async () => body }), validate: (body = input) => validate.POST({ json: async () => body }) };
}
test('duplicate validation restores only allowlisted company/admin/plan fields', async () => {
  const h = harness();
  const result = await h.validate();
  assert.equal(result.body.state, 'pending');
  assert.equal(result.body.signup.companyName, 'Saved company');
  assert.equal(result.body.signup.fullName, 'Saved owner');
  assert.deepEqual(result.body.signup.subscription, { plan: 'business', planName: 'Business', billingType: 'yearly', employeeCount: 25 });
  assert.doesNotMatch(JSON.stringify(result.body), /password|secret|role|companyId|original-password|hidden/);
  assert.equal(result.headers['Cache-Control'], 'no-store');
});
test('wrong or missing password never discloses details or touches payments', async () => {
  for (const password of [undefined, '', 'wrong-password']) {
    const h = harness();
    const validation = await h.validate({ ...h.input, password });
    assert.equal(validation.body.success, false);
    assert.equal(validation.body.signup, undefined);
    assert.equal((await h.post({ ...h.input, password })).status, 403);
    assert.deepEqual(h.calls, []);
  }
});
test('active order resumes existing checkout without a write or new order', async () => {
  const h = harness();
  assert.deepEqual((await h.post()).body, { success: true, state: 'pending', orderId: oldId, paymentSessionId: 'safe-session' });
  assert.deepEqual(h.calls.map(([name]) => name), ['GET']);
});
test('paid order returns completion state without creating another order', async () => {
  const h = harness({ orderStatus: 'PAID' });
  const result = await h.post();
  assert.equal(result.body.state, 'paid');
  assert.equal(result.body.orderId, oldId);
  assert.equal(result.body.paymentSessionId, undefined);
  assert.deepEqual(h.calls.map(([name]) => name), ['GET']);
});
test('completed auth/company or stored paid signup does not create an order', async () => {
  for (const options of [{ authExists: true }, { companyExists: true }, { paymentStatus: 'PAID' }, { paymentStatus: 'COMPLETED' }]) {
    const h = harness(options);
    assert.equal((await h.post()).body.state, 'completed');
    assert.deepEqual(h.calls, []);
  }
});
test('expired/terminated order rotates on the same pending document before Cashfree creation', async () => {
  for (const orderStatus of ['EXPIRED', 'TERMINATED']) {
    const h = harness({ orderStatus });
    const result = await h.post();
    assert.equal(result.body.orderId, newId);
    assert.deepEqual(h.calls.map(([name]) => name), ['GET', 'update', 'POST']);
    assert.equal(h.data().orderId, newId);
    assert.equal(h.data().admin.password, undefined);
    assert.deepEqual(h.data().admin.passwordHash, storedCredential);
    const payload = JSON.parse(h.calls[2][2].body);
    assert.equal(payload.customer_details.customer_email, 'company@example.com');
    assert.equal(payload.order_amount, 1);
    assert.match(h.calls[2][2].headers['x-idempotency-key'], /^[a-f0-9-]{36}$/);
    assert.doesNotMatch(JSON.stringify(result.body), /secret|original-password|hidden/);
  }
});
test('missing Cashfree order retries saved ID without another pending document', async () => {
  const h = harness({ status: 404 });
  assert.equal((await h.post()).body.orderId, oldId);
  assert.deepEqual(h.calls.map(([name]) => name), ['GET', 'POST']);
});
test('ambiguous status or failed persistence never creates another order', async () => {
  for (const options of [{ status: 500 }, { orderStatus: 'TERMINATION_REQUESTED' }, { orderStatus: 'EXPIRED', failUpdate: true }]) {
    const h = harness(options);
    assert.equal((await h.post()).status, 500);
    assert.equal(h.calls.some(([name]) => name === 'POST'), false);
  }
});
test('payment completion resolves a rotated order to the original pending document', async () => {
  const paths = [];
  const pendingRef = { delete: async () => paths.push('delete-original') };
  const service = evaluate(completionCode, {
    '@/lib/firebase-admin': { adminAuth: {}, adminDb: { collection: (name) => ({
      doc: (id) => { paths.push(id); return { get: async () => ({ exists: false }) }; },
      where: (field, op, id) => {
        paths.push([name, field, id]);
        return { limit: () => ({ get: async () => name === 'PendingRegistrations' ? { empty: false, docs: [{ exists: true, ref: pendingRef, data: record }] } : { empty: false } }) };
      },
    }) } },
    'firebase-admin/firestore': { Timestamp: {} },
  });
  assert.equal((await service.completeRegistration(newId)).success, true);
  assert.ok(paths.some((p) => Array.isArray(p) && p[0] === 'PendingRegistrations' && p[1] === 'orderId' && p[2] === newId));
  assert.ok(paths.includes('delete-original'));
});
test('signup pages compile after prefill and completion handling changes', async () => {
  for (const file of ['page.jsx', 'components/SignupStep1.jsx', 'components/SignupStep2.jsx', 'components/SignupStep3.jsx']) {
    await compile(`src/app/(auth)/signup/${file}`);
  }
});
test('restored company, administrator and plan values initialize the wizard', async () => {
  const saved = { ...record().company, fullName: 'Saved owner', adminEmail: 'owner@example.com', adminPhone: '9876543210', corporateId: 'saved-id', subscription: { plan: 'business', billingType: 'yearly', employeeCount: 25 } };
  const jsx = (type, props) => ({ type, props });
  for (const [file, props, expected] of [
    ['SignupStep1', { data: saved }, (states) => assert.equal(states[0].companyName, 'Saved company')],
    ['SignupStep2', { data: saved }, (states) => { assert.equal(states[2].fullName, 'Saved owner'); assert.equal(states[2].corporateId, 'saved-id'); assert.equal(states[2].password, ''); }],
    ['SignupStep3', { data: saved }, (states) => { assert.equal(states[0], 'yearly'); assert.equal(states[1], 'business'); assert.equal(states[2], 25); }],
  ]) {
    const states = [];
    const Component = evaluate(await compile(`src/app/(auth)/signup/components/${file}.jsx`), {
      react: { useState: (initial) => { states.push(initial); return [initial, () => {}]; }, useEffect: () => {} },
      'react/jsx-runtime': { jsx, jsxs: jsx }, 'next/link': {}, 'lucide-react': {},
      '@/app/api/signup/services/validationService': {}, '../services/paymentService': {},
    }).default;
    Component(props);
    expected(states);
  }
});
test('completed signup imports the hash into Auth but never copies credentials to company or owner records', async () => {
  const writes = [];
  const user = { uid: 'fresh-uid', email: 'owner@example.com', displayName: 'Saved owner' };
  const adminAuth = {
    createUser: async (input) => { assert.equal(input.password, undefined); return user; },
    importUsers: async (users) => { assert.equal(users[0].uid, user.uid); assert.ok(Buffer.isBuffer(users[0].passwordHash)); assert.equal(users[0].password, undefined); return { successCount: 1, failureCount: 0 }; },
    setCustomUserClaims: async () => {}, createCustomToken: async () => 'token',
  };
  const pendingRef = { get: async () => ({ exists: true, data: record }), delete: async () => {} };
  const adminDb = { collection: (name) => ({
    doc: () => pendingRef,
    where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) }),
    add: async (data) => { writes.push([name, data]); return { id: name + '-id' }; },
  }) };
  const service = evaluate(completionCode, {
    '@/lib/firebase-admin': { adminAuth, adminDb },
    'firebase-admin/firestore': { Timestamp: { now: () => 1, fromDate: () => 2 } },
  });
  const result = await service.completeRegistration(oldId);
  assert.equal(result.success, true);
  assert.deepEqual(writes.map(([name]) => name), ['Companies', 'Usermanagement']);
  for (const [, data] of writes) assert.doesNotMatch(JSON.stringify(data), /password|hash|salt|original-password/i);
  assert.doesNotMatch(JSON.stringify(result), /password|hash|salt|original-password/i);
});
