import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPendingPassword, verifyPendingPassword, securePendingPassword, importPendingPassword, firebasePasswordOptions } from '../src/lib/server/pendingPassword.mjs';
import { scryptSync } from 'node:crypto';
const password = 'test-password-only';
const credential = await hashPendingPassword(password);

test('salted scrypt hashes differ and verify only the correct password', async () => {
  const second = await hashPendingPassword(password);
  assert.notEqual(credential.salt, second.salt);
  assert.notEqual(credential.hash, second.hash);
  assert.equal(await verifyPendingPassword(password, credential), true);
  assert.equal(await verifyPendingPassword('wrong-password', credential), false);
  assert.equal(await verifyPendingPassword(password, { ...credential, version: 2 }), false);
  assert.equal(await verifyPendingPassword(password, { ...credential, hash: 'invalid' }), false);
  assert.equal(await verifyPendingPassword(undefined, credential), false);
  assert.doesNotMatch(JSON.stringify(credential), /test-password-only/);
});

test('legacy plaintext is replaced with a hash using a concurrency precondition', async () => {
  const writes = [];
  const data = await securePendingPassword({
    updateTime: 'snapshot-version', data: () => ({ admin: { password, adminEmail: 'test@example.com' } }),
    ref: { update: async (...args) => writes.push(args) },
  });
  assert.equal(data.admin.password, undefined);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0][1], { lastUpdateTime: 'snapshot-version' });
  assert.equal(writes[0][0]['admin.password'].constructor.name, 'DeleteTransform');
  assert.equal(await verifyPendingPassword(password, data.admin.passwordHash), true);
});

test('failed migration blocks use of plaintext rather than falling back', async () => {
  await assert.rejects(securePendingPassword({ updateTime: 'old', data: () => ({ admin: { password } }), ref: { update: async () => { throw new Error('conflict'); } } }), /conflict/);
});

test('completion imports a compatible scrypt hash, never plaintext', async () => {
  let args;
  await importPendingPassword({ importUsers: async (...input) => { args = input; return { successCount: 1, failureCount: 0 }; } }, { uid: 'new-only', email: 'test@example.com', displayName: 'Test' }, credential);
  const [users, { hash }] = args;
  assert.equal(users[0].password, undefined);
  assert.equal(users[0].uid, 'new-only');
  assert.deepEqual(hash, firebasePasswordOptions);
  assert.deepEqual(scryptSync(password, users[0].passwordSalt, hash.derivedKeyLength, { N: hash.memoryCost, r: hash.blockSize, p: hash.parallelization, maxmem: 256 * 1024 * 1024 }), users[0].passwordHash);
  await assert.rejects(importPendingPassword({ importUsers: async () => ({ successCount: 0, failureCount: 1 }) }, { uid: 'new-only' }, credential), /Unable to initialize/);
});
