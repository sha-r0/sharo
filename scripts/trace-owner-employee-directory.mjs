// Read-only directory request as the trusted tenant owner. Tokens stay in memory.
import fs from 'node:fs';
import { adminAuth, adminDb } from '../src/lib/firebase-admin.js';
try {
  if (process.env.FIREBASE_PROJECT_ID !== 'sharo-ad80a') throw new Error('Unexpected project');
  const company = await adminDb.collection('Companies').doc('agcqb5F8KKZCXjRkotut').get();
  const uid = company.data()?.ownerUid;
  if (!uid) throw new Error('Owner missing');
  const user = await adminAuth.getUser(uid);
  if (user.disabled) throw new Error('Owner disabled');
  const apiKey = fs.readFileSync('src/lib/firebase.js', 'utf8').match(/apiKey:\s*"([^"]+)"/)?.[1];
  const customToken = await adminAuth.createCustomToken(uid);
  const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  const session = await signIn.json();
  if (!signIn.ok || !session.idToken) throw new Error('Owner authentication failed');
  const url = 'https://asia-south1-sharo-ad80a.cloudfunctions.net/getAdvanceReferenceData';
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.idToken}` }, body: JSON.stringify({ data: {} }) });
  const body = await response.json();
  console.log(JSON.stringify({ request: `POST ${url}`, httpStatus: response.status,
    serverError: body.error ? { status: body.error.status, message: body.error.message } : null,
    responseKeys: Object.keys(body.result || {}), companyIdPresent: Boolean(body.result?.companyId),
    employeesCount: body.result?.employees?.length ?? null,
    clientTenantCheckPasses: body.result?.companyId === company.id }, null, 2));
} catch { console.error('Owner trace failed; no credentials logged.'); process.exitCode = 1; }
finally { await adminDb.terminate(); }
