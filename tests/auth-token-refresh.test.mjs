import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import * as authorization from '../src/app/allservice/rbac/AuthorizationService.js';
const require = createRequire(import.meta.url);
const { transform, loadBindings } = require('next/dist/build/swc');
await loadBindings();
async function compile(file) {
  const filename = new URL(`../${file}`, import.meta.url).pathname;
  return (await transform(fs.readFileSync(filename, 'utf8'), { filename, jsc: { parser: { syntax: 'ecmascript', jsx: true }, transform: { react: { runtime: 'automatic' } } }, module: { type: 'commonjs' } })).code;
}
function evaluate(code, mocks, fetch) {
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'fetch', code)((id) => mocks[id] || require(id), module, module.exports, fetch);
  return module.exports;
}
const providerCode = await compile('src/app/(auth)/context/AuthContext.jsx');
const guardCode = await compile('src/components/auth/ProtectedRoute.jsx');
const endpointCode = await compile('src/app/api/rbac/session/route.js');
function hookRunner() {
  const slots = []; let cursor = 0;
  const slot = () => cursor++;
  const changed = (old, next) => !old || next.some((value, index) => !Object.is(value, old[index]));
  const useMemo = (fn, deps) => { const i = slot(); if (!slots[i] || changed(slots[i].deps, deps)) slots[i] = { value: fn(), deps }; return slots[i].value; };
  return { reset: () => { cursor = 0; }, hooks: {
    createContext: () => ({ Provider: 'provider' }),
    useState: (initial) => { const i = slot(); if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], (value) => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: (initial) => { const i = slot(); if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback: (fn, deps) => useMemo(() => fn, deps), useMemo,
    useEffect: (fn, deps) => { const i = slot(); if (!slots[i] || changed(slots[i].deps, deps)) { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() }; } },
  } };
}
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
function harness({ employee = false } = {}) {
  const providerHooks = hookRunner(), guardHooks = hookRunner();
  const auth = { currentUser: null };
  let listener, fetchHandler, docHandler;
  const calls = { logout: 0, routes: [], fetches: 0 };
  const uid = employee ? 'employee-auth' : 'owner';
  const user = { uid, email: 'user@example.com', getIdToken: async () => 'token' };
  const identity = { companyId: 'company-a', rootUserId: employee ? 'root-employee' : null, companyEmployeeId: employee ? 'employee-a' : null, isOwner: !employee };
  const records = new Map([
    ['Companies/company-a', { ownerUid: 'owner', workspaceCompleted: true, companyName: 'Company A' }],
    ['Usermanagement/root-employee', { uid, role: 'employee', companyId: 'company-a' }],
    ['Companies/company-a/Usermanagement/employee-a', { personalInfo: { fullName: 'Alex' }, access: { authUid: uid, status: 'active', loginEnabled: true, effectivePermissions: ['dashboard.view', 'attendance.view'] } }],
  ]);
  const response = (status = 200) => ({ status, ok: status >= 200 && status < 300, json: async () => ({ ...identity }) });
  const common = { '@/app/allservice/rbac/AuthorizationService': authorization };
  const Provider = evaluate(providerCode, {
    ...common, react: providerHooks.hooks,
    'firebase/auth': { onIdTokenChanged: (_, fn) => { listener = fn; return () => {}; }, signOut: async () => { calls.logout++; auth.currentUser = null; await listener(null); } },
    'firebase/firestore': { doc: (_, ...path) => path.join('/'), getDoc: async (path) => { if (docHandler) await docHandler(path); return { id: path.split('/').at(-1), exists: () => records.has(path), data: () => structuredClone(records.get(path)) }; } },
    '@/lib/firebase': { auth, db: {} },
  }, async (...args) => { calls.fetches++; return fetchHandler ? fetchHandler(...args) : response(); }).AuthProvider;
  const context = () => { providerHooks.reset(); return Provider({ children: 'app' }).props.value; };
  const router = { replace: (path) => calls.routes.push(path) };
  const Guard = evaluate(guardCode, {
    ...common, react: guardHooks.hooks,
    'next/navigation': { useRouter: () => router, usePathname: () => '/manager/Workforce/attendance' },
    '@/app/(auth)/context/AuthContext': { useAuth: context },
    './AccessDenied': { __esModule: true, default: 'access-denied' },
  }).default;
  const children = { type: 'manager-page', props: { unsavedText: 'keep this draft' } };
  const renderGuard = () => { guardHooks.reset(); return Guard({ children }); };
  context();
  return { context, renderGuard, children, calls, records, user, identity, response,
    emit: (next = user) => { auth.currentUser = next; return listener(next); },
    setFetch: (fn) => { fetchHandler = fn; }, setDoc: (fn) => { docHandler = fn; },
  };
}

for (const employee of [false, true]) {
  test(`normal ${employee ? 'employee' : 'owner'} login blocks bootstrap then renders the manager page`, async () => {
    const h = harness({ employee }); const pending = h.emit();
    assert.equal(h.context().loading, true); assert.notEqual(h.renderGuard(), h.children);
    await pending;
    assert.equal(h.context().loading, false); assert.equal(h.context().validating, false);
    assert.equal(h.renderGuard(), h.children); assert.equal(h.calls.logout, 0); assert.deepEqual(h.calls.routes, []);
  });
}

test('same-user Firebase token renewal keeps page mounted and preserves unchanged context references', async () => {
  const h = harness({ employee: true }); await h.emit();
  const before = h.context(); const gate = deferred(); h.setFetch(() => gate.promise);
  const pending = h.emit({ ...h.user });
  assert.equal(h.context().loading, false); assert.equal(h.context().validating, true);
  assert.equal(h.renderGuard(), h.children);
  gate.resolve(h.response()); await pending;
  const after = h.context();
  assert.equal(h.renderGuard(), h.children);
  for (const key of ['firebaseUser', 'currentUser', 'company', 'companyEmployee', 'access', 'can', 'hasAnyPermission', 'hasAllPermissions', 'logout', 'refreshUser']) assert.equal(after[key], before[key], key);
  assert.equal(h.calls.logout, 0); assert.deepEqual(h.calls.routes, []);
});

for (const failure of ['network', 'server', 'firestore']) {
  test(`background ${failure} failure retains the page and validated identity`, async () => {
    const h = harness(); await h.emit(); const before = h.context();
    if (failure === 'network') h.setFetch(async () => { throw new TypeError('Failed to fetch'); });
    if (failure === 'server') h.setFetch(async () => h.response(503));
    if (failure === 'firestore') h.setDoc(async () => { throw Object.assign(new Error('unavailable'), { code: 'unavailable' }); });
    await h.emit();
    assert.equal(h.context().loading, false); assert.equal(h.context().validating, false);
    assert.equal(h.context().company, before.company); assert.equal(h.context().access, before.access);
    assert.equal(h.renderGuard(), h.children); assert.equal(h.calls.logout, 0); assert.deepEqual(h.calls.routes, []);
    h.setFetch(null); h.setDoc(null); await h.emit();
    assert.equal(h.context().authError, null); assert.equal(h.renderGuard(), h.children);
  });
}

test('initial transient validation failure shows retry without logging out or granting workspace access', async () => {
  const h = harness(); h.setFetch(async () => h.response(503)); await h.emit();
  assert.equal(h.context().loading, false); assert.equal(h.context().currentUser, null);
  assert.equal(h.renderGuard().props.role, 'alert'); assert.equal(h.calls.logout, 0); assert.deepEqual(h.calls.routes, []);
  h.setFetch(null); await h.context().refreshUser(); assert.equal(h.renderGuard(), h.children);
});

for (const failure of ['revoked', 'deactivated', 'firestore-denied']) {
  test(`${failure} session removes protected content and redirects to login`, async () => {
    const h = harness({ employee: true }); await h.emit();
    if (failure === 'revoked') h.setFetch(async () => h.response(401));
    if (failure === 'deactivated') h.records.get('Companies/company-a/Usermanagement/employee-a').access.loginEnabled = false;
    if (failure === 'firestore-denied') h.setDoc(async () => { throw Object.assign(new Error('denied'), { code: 'permission-denied' }); });
    await h.emit(); assert.notEqual(h.renderGuard(), h.children);
    assert.equal(h.calls.logout, 1); assert.ok(h.calls.routes.includes('/login')); assert.equal(h.context().access, null);
  });
}

test('updated RBAC permissions still deny a route after background validation', async () => {
  const h = harness({ employee: true }); await h.emit();
  h.records.get('Companies/company-a/Usermanagement/employee-a').access.effectivePermissions = [];
  await h.emit(); assert.equal(h.renderGuard().type, 'access-denied'); assert.equal(h.context().can('attendance.view'), false);
});

test('identity change blocks, clears old tenant state, and ignores the old in-flight validation result', async () => {
  const h = harness(); await h.emit();
  const old = deferred(); h.setFetch(() => old.promise);
  const pendingOld = h.emit(); await Promise.resolve();
  const next = deferred(); h.setFetch(() => next.promise);
  h.records.set('Companies/company-b', { ownerUid: 'owner-b', workspaceCompleted: true });
  h.identity.companyId = 'company-b';
  const pendingNew = h.emit({ ...h.user, uid: 'owner-b' });
  assert.equal(h.context().loading, true); assert.equal(h.context().company, null); assert.notEqual(h.renderGuard(), h.children);
  old.resolve(h.response(401)); await pendingOld;
  assert.equal(h.calls.logout, 0); assert.equal(h.context().loading, true);
  next.resolve(h.response()); await pendingNew;
  assert.equal(h.context().company.id, 'company-b'); assert.equal(h.renderGuard(), h.children);
});

test('same UID changing tenant identity blocks until the new workspace is validated', async () => {
  const h = harness(); await h.emit(); h.identity.companyId = 'company-b';
  h.records.set('Companies/company-b', { ownerUid: 'owner', workspaceCompleted: true });
  const gate = deferred(); h.setDoc(() => gate.promise);
  const pending = h.emit();
  for (let i = 0; i < 5; i++) await Promise.resolve();
  assert.equal(h.context().loading, true); assert.equal(h.context().company, null);
  gate.resolve(); await pending; assert.equal(h.context().company.id, 'company-b');
});

test('late successful validation cannot restore a signed-out session', async () => {
  const h = harness(); await h.emit(); const gate = deferred(); h.setFetch(() => gate.promise);
  const pending = h.emit(); await Promise.resolve(); await h.emit(null);
  gate.resolve(h.response()); await pending;
  assert.equal(h.context().firebaseUser, null); assert.equal(h.context().company, null); assert.notEqual(h.renderGuard(), h.children);
});

for (const code of ['auth/id-token-revoked', 'auth/user-disabled', 'auth/id-token-expired', 'auth/argument-error', 'auth/internal-error', 'unavailable']) {
  test(`session endpoint classifies ${code} without weakening token verification`, async () => {
    let verifyArgs;
    const { GET } = evaluate(endpointCode, {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/firebase-admin': { adminAuth: { verifyIdToken: async (...args) => { verifyArgs = args; throw Object.assign(new Error(code), { code }); } }, adminDb: {} },
      '@/lib/server/refreshPerformancePermissions': { refreshPerformancePermissions: async () => {} },
    });
    const result = await GET({ headers: { get: () => 'Bearer token' } });
    assert.deepEqual(verifyArgs, ['token', true]);
    assert.equal(result.status, ['auth/internal-error', 'unavailable'].includes(code) ? 503 : 401);
  });
}
