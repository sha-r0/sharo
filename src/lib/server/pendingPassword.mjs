import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { FieldValue } from 'firebase-admin/firestore';

const derive = promisify(scrypt);
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export const firebasePasswordOptions = Object.freeze({
  algorithm: 'STANDARD_SCRYPT', memoryCost: options.N,
  blockSize: options.r, parallelization: options.p, derivedKeyLength: 64,
});

export async function hashPendingPassword(password) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new Error('Invalid pending password.');
  }
  const salt = randomBytes(32);
  const hash = await derive(password, salt, 64, options);
  return { version: 1, algorithm: 'scrypt', salt: salt.toString('hex'), hash: hash.toString('hex') };
}

export function decodePendingPassword(credential) {
  if (credential?.version !== 1 || credential.algorithm !== 'scrypt' ||
      !/^[a-f0-9]{64}$/.test(credential.salt) || !/^[a-f0-9]{128}$/.test(credential.hash)) {
    throw new Error('Invalid pending password hash.');
  }
  return { passwordHash: Buffer.from(credential.hash, 'hex'), passwordSalt: Buffer.from(credential.salt, 'hex') };
}

export async function verifyPendingPassword(password, credential) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) return false;
  try {
    const { passwordHash, passwordSalt } = decodePendingPassword(credential);
    const candidate = await derive(password, passwordSalt, 64, options);
    return timingSafeEqual(candidate, passwordHash);
  } catch { return false; }
}

// Upgrade legacy records before use. The precondition prevents overwriting a
// concurrently changed registration. Credential values must never be logged.
export async function securePendingPassword(snapshot) {
  const data = snapshot.data();
  if (Object.hasOwn(data.admin, 'password')) {
    const credential = data.admin.passwordHash || await hashPendingPassword(data.admin.password);
    decodePendingPassword(credential);
    await snapshot.ref.update({
      'admin.passwordHash': credential,
      'admin.password': FieldValue.delete(),
    }, { lastUpdateTime: snapshot.updateTime });
    data.admin.passwordHash = credential;
    delete data.admin.password;
  }
  decodePendingPassword(data.admin.passwordHash);
  return data;
}

// createUser reserves the unique email first; import only into that freshly
// created UID, never a client-supplied or existing account.
export async function importPendingPassword(adminAuth, user, credential) {
  const result = await adminAuth.importUsers([{
    uid: user.uid, email: user.email, displayName: user.displayName,
    ...decodePendingPassword(credential),
  }], { hash: firebasePasswordOptions });
  if (result.failureCount || result.successCount !== 1) throw new Error('Unable to initialize signup credentials.');
}
