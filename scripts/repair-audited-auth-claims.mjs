import assert from 'node:assert/strict';
import { adminAuth, adminDb } from '../src/lib/firebase-admin.js';
import { syncEmployeeClaims } from '../src/lib/server/syncEmployeeClaims.mjs';
import { isActiveEmployee, resolveEmployeeAuthUid, resolveEmployeeRoleId } from '../src/app/allservice/rbac/employeeAuth.js';
const targets = new Map([
  ['00000012', ['4mZhXsROpZ7qoaqqBIJ8', 'PhxddHeQLQXXEcuBcUKKy23nHCG2', 'employee']],
  ['00000015', ['LXyltoDkq4oaI5mkM07l', 'I1QIxvutHFWqMgAvJAiJQpCLCx72', 'employee']],
  ['00000018', ['MWhGZ9SQBHCiQMIxeJFO', 'Pe7ZgjAe1PZGdu0k8RSbARzeCkB2', 'manager']],
  ['00000006', ['PFkfZWXo1n861A7sEvZU', 'O6EsbVdPdZQzHL8uC6wEcPOrtJL2', 'employee']],
  ['00000022', ['aguQLvNfVtdZ99ACwFqx', 'MW7Urj78FRgRuRIDy8FN3kJW3XI3', 'employee']],
  ['00000026', ['kdtSKEaKuNKzwwvA6m2m', 'ERnjBuPy2pSfp4bBBS7UZwDeFa53', 'employee']],
  ['00000009', ['mdgiK9a5sFSvwJbosXD6', 'ZPx4052OZTUIWtrDLUW3jUvmZ9I2', 'employee']],
]);
assert.equal(process.env.FIREBASE_PROJECT_ID, 'sharo-ad80a');
assert.ok(!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST);
assert.ok(process.argv.slice(2).every(arg => arg === '--apply'));
const company = await adminDb.collection('Companies').doc('agcqb5F8KKZCXjRkotut').get();
assert.ok(company.exists);
const plan = [];
for (const [employeeId, [id, expectedUid, role]] of targets) {
  const snapshot = await company.ref.collection('Usermanagement').doc(id).get();
  assert.ok(snapshot.exists);
  const employee = snapshot.data();
  assert.equal(String(employee.employeeId || employee.login?.employeeId), employeeId);
  assert.ok(isActiveEmployee(employee));
  const uid = resolveEmployeeAuthUid(employee);
  assert.equal(uid, expectedUid);
  assert.equal(resolveEmployeeRoleId(employee), role);
  const user = await adminAuth.getUser(uid);
  assert.equal(user.disabled, false);
  const expected = { companyId: company.id, companyEmployeeId: snapshot.id, roleId: resolveEmployeeRoleId(employee), accountType: 'employee' };
  const claims = user.customClaims || {};
  for (const [key, value] of Object.entries(expected)) if (Object.hasOwn(claims, key)) assert.equal(claims[key], value, `${employeeId}: conflicting ${key}`);
  const missing = Object.keys(expected).some(key => !Object.hasOwn(claims, key)) || !Object.hasOwn(claims, 'permissionsVersion');
  plan.push({ snapshot, employee, uid, employeeId, missing, claims });
}
for (const item of plan) {
  const { snapshot, employee, uid, employeeId, missing } = item;
  let repaired = false;
  if (missing && process.argv.includes('--apply')) {
    const live = await snapshot.ref.get();
    assert.deepEqual(live.data(), employee, 'Employee changed during preflight');
    const { claims } = await syncEmployeeClaims(adminAuth, { uid, companyId: live.ref.parent.parent.id, employeeFirestoreId: live.id, employee: live.data() });
    assert.deepEqual((await adminAuth.getUser(uid)).customClaims, claims);
    const managed = new Set(['companyId', 'companyEmployeeId', 'roleId', 'accountType', 'permissionsVersion']);
    for (const [key, value] of Object.entries(item.claims)) if (!managed.has(key)) assert.deepEqual(claims[key], value);
    assert.deepEqual((await snapshot.ref.get()).data(), employee, 'Employee business data changed');
    repaired = true;
  }
  console.log(JSON.stringify({ employeeId, name: employee.personalInfo?.fullName, uid, repaired, missingBefore: missing, claims: (await adminAuth.getUser(uid)).customClaims || {} }));
}
