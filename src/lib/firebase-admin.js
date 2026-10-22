import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  throw new Error(
    "Firebase Admin environment variables are missing."
  );
}

// Log only configuration presence and the non-secret project identifier.
if (process.env.COMPANY_AUTH_DIAGNOSTICS === "1") {
  console.info("[company-auth]", {
    stage: "admin.configuration",
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmailPresent: Boolean(process.env.FIREBASE_CLIENT_EMAIL),
    privateKeyPresent: Boolean(process.env.FIREBASE_PRIVATE_KEY),
    existingApp: getApps().length > 0,
  });
}

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
            /\\n/g,
            "\n"
          ),
        }),
      });

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
if (process.env.COMPANY_AUTH_DIAGNOSTICS === "1") {
  console.info("[company-auth]", {
    stage: "admin.ready",
    projectId: app.options.projectId || app.options.credential?.projectId,
    authEmulatorEnabled: Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
    firestoreEmulatorEnabled: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
  });
}
