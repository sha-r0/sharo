import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const validId = (value) => typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/") && ![".", ".."].includes(value);
const effectiveStatus = (data) => String(data.status || "Draft").trim().toLowerCase();
const quotationNumber = (id, data) => data.quotationNumber || data.meta?.quotationNo || id;

export function validateManifest(manifest) {
  if (manifest?.version !== 1 || !validId(manifest.projectId) || !validId(manifest.companyId)) throw new Error("Explicit projectId and companyId are required.");
  if (!Array.isArray(manifest.quotations) || !manifest.quotations.length || manifest.quotations.length > 400) throw new Error("Provide 1–400 individually reviewed migrated quotation records.");
  const ids = new Set();
  for (const record of manifest.quotations) {
    if (!validId(record.id) || ids.has(record.id) || typeof record.quotationNumber !== "string" || !record.quotationNumber.trim()) throw new Error("Each migrated quotation needs a unique document ID and its stored quotation number.");
    if (!Object.hasOwn(record, "expectedStatus") || ![null, ""].includes(record.expectedStatus) && String(record.expectedStatus).trim().toLowerCase() !== "draft") throw new Error("expectedStatus must match the inspected raw Draft status, or null for an absent status.");
    if (typeof record.createTime !== "string" || !Number.isFinite(Date.parse(record.createTime))) throw new Error("Capture each document's Firestore createTime during schema inspection.");
    ids.add(record.id);
  }
}

// A fixed, reviewed allowlist identifies the migrated cohort. Never scan all Drafts.
// No changes to normal quotation creation, counters, dates, totals or metadata.
export async function migrateLegacyQuotationStatus(db, manifest, { apply = false } = {}) {
  validateManifest(manifest);
  if (db.projectId !== manifest.projectId) throw new Error("Migration project does not match the connected Firestore project.");
  const companyRef = db.collection("Companies").doc(manifest.companyId);
  return db.runTransaction(async (transaction) => {
    const company = await transaction.get(companyRef);
    if (!company.exists) throw new Error("Target company not found.");
    const pending = [], unchanged = [];
    for (const record of manifest.quotations) {
      const ref = companyRef.collection("Quotations").doc(record.id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error(`Quotation ${record.id} no longer exists.`);
      const data = snapshot.data();
      if (data.companyId && data.companyId !== manifest.companyId) throw new Error(`Tenant mismatch for ${record.id}.`);
      if (quotationNumber(record.id, data) !== record.quotationNumber) throw new Error(`Quotation number changed for ${record.id}.`);
      if (snapshot.createTime?.toDate().getTime() !== Date.parse(record.createTime)) throw new Error(`Document ${record.id} was recreated or its manifest is incorrect.`);
      if (effectiveStatus(data) === "sent") { unchanged.push(record.id); continue; }
      if (effectiveStatus(data) !== "draft" || (data.status ?? null) !== record.expectedStatus) throw new Error(`Status changed for ${record.id}; inspect again before migrating.`);
      pending.push({ ref, id: record.id, before: data.status ?? null });
    }
    // All reads precede writes. A concurrent status change retries/rechecks the transaction.
    if (apply) for (const { ref } of pending) transaction.update(ref, { status: "Sent" });
    return { projectId: manifest.projectId, companyId: manifest.companyId, mode: apply ? "apply" : "dry-run", changes: pending.map(({ id, before }) => ({ id, before, after: "Sent" })), unchanged };
  });
}

async function main() {
  const [manifestPath, mode, ...extra] = process.argv.slice(2);
  if (!manifestPath || extra.length || mode && !["--dry-run", "--apply"].includes(mode)) throw new Error("Usage: node --env-file=.env.local scripts/migrate-legacy-quotation-status.mjs MANIFEST.json [--dry-run|--apply]");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  validateManifest(manifest);
  for (const key of ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) if (!process.env[key]) throw new Error(`${key} is required.`);
  if (process.env.FIREBASE_PROJECT_ID !== manifest.projectId) throw new Error("Credential project does not match the migration manifest.");
  const app = getApps()[0] || initializeApp({ projectId: manifest.projectId, credential: cert({ projectId: manifest.projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
  console.log(JSON.stringify(await migrateLegacyQuotationStatus(getFirestore(app), manifest, { apply: mode === "--apply" }), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
