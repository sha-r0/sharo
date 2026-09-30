import { isDeepStrictEqual } from 'node:util';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../src/lib/firebase-admin.js';
import { hashPendingPassword, decodePendingPassword, verifyPendingPassword } from '../src/lib/server/pendingPassword.mjs';

const ids = [
  'SHARO_b5f7ef8d6d45428b86de83e7cf76106f',
  'SHARO_ecc7b42cd882424b8bd9dca78879926d',
];
const check = (condition) => { if (!condition) throw new Error('Migration verification failed.'); };
const withoutCredentials = (data) => {
  const result = { ...data, admin: { ...data.admin } };
  delete result.admin.password;
  delete result.admin.passwordHash;
  return result;
};
let stage = 'preflight';
try {
  check(process.argv.length === 3 && ['--dry-run', '--apply'].includes(process.argv[2]));
  check(process.env.FIREBASE_PROJECT_ID === 'sharo-ad80a');
  check(!process.env.FIRESTORE_EMULATOR_HOST);
  const apply = process.argv[2] === '--apply';
  const refs = ids.map((id) => adminDb.collection('PendingRegistrations').doc(id));
  const snapshots = await adminDb.getAll(...refs);
  const plan = [];
  for (const snapshot of snapshots) {
    check(snapshot.exists);
    const data = snapshot.data();
    check(data.admin && String(data.paymentStatus).toUpperCase() === 'PENDING');
    const plaintext = Object.hasOwn(data.admin, 'password');
    const credential = data.admin.passwordHash || (plaintext ? await hashPendingPassword(data.admin.password) : null);
    decodePendingPassword(credential);
    if (plaintext) check(await verifyPendingPassword(data.admin.password, credential));
    plan.push({ snapshot, data, credential, plaintext });
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', recordsFound: plan.length,
    recordsToMigrate: plan.filter((item) => item.plaintext).length,
    alreadyCanonical: plan.filter((item) => !item.plaintext).length,
    canonicalHashVerification: 'passed', paths: refs.map((ref) => ref.path) }));
  if (apply) {
    stage = 'atomic-write';
    const batch = adminDb.batch();
    const changes = plan.filter((item) => item.plaintext);
    for (const item of changes) {
      // One atomic commit for both records. Stale snapshots abort the whole batch.
      batch.update(item.snapshot.ref, {
        'admin.passwordHash': item.credential,
        'admin.password': FieldValue.delete(),
      }, { lastUpdateTime: item.snapshot.updateTime });
    }
    if (changes.length) await batch.commit();
    stage = 'verification';
    const after = await adminDb.getAll(...refs);
    for (let i = 0; i < after.length; i++) {
      check(after[i].exists);
      const data = after[i].data();
      check(!Object.hasOwn(data.admin, 'password'));
      decodePendingPassword(data.admin.passwordHash);
      check(isDeepStrictEqual(data.admin.passwordHash, plan[i].credential));
      check(isDeepStrictEqual(withoutCredentials(data), withoutCredentials(plan[i].data)));
      if (plan[i].plaintext) check(await verifyPendingPassword(plan[i].data.admin.password, data.admin.passwordHash));
    }
    console.log(JSON.stringify({ recordsMigrated: changes.length, verifiedRecords: after.length,
      plaintextRemainingInTargets: 0, nonPasswordFieldsUnchanged: true, passwordVerification: 'passed' }));
  }
} catch {
  // Never log exceptions or assertion diffs that could contain credential values.
  console.error(JSON.stringify({ migrationFailed: true, stage }));
  process.exitCode = 1;
} finally {
  await adminDb.terminate();
}
