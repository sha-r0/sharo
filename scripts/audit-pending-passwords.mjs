// Read-only audit. Never print credential values or other signup details.
import { adminDb } from '../src/lib/firebase-admin.js';
let cursor;
let total = 0;
const plaintextPaths = [];
const hashPaths = [];
try {
  for (;;) {
    let query = adminDb.collection('PendingRegistrations').orderBy('__name__').limit(200)
      .select('admin.password', 'admin.passwordHash');
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const doc of page.docs) {
      total++;
      const admin = doc.data().admin || {};
      if (Object.hasOwn(admin, 'password')) plaintextPaths.push(doc.ref.path);
      if (Object.hasOwn(admin, 'passwordHash')) hashPaths.push(doc.ref.path);
    }
    cursor = page.docs.at(-1);
  }
  console.log(JSON.stringify({ total, plaintextFieldCount: plaintextPaths.length, plaintextPaths, hashFieldCount: hashPaths.length }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ auditFailed: true, code: error.code || 'unknown' }));
  process.exitCode = 1;
} finally {
  await adminDb.terminate();
}
