"use strict";

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { repairApprovedGpsAttendance } = require("../src/workforce/RepairApprovedGpsAttendance");

async function main() {
  const [projectId, companyId, ...args] = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const gpsPunchIds = args.filter((arg) => arg !== "--apply");
  if (!projectId || !companyId || !gpsPunchIds.length || gpsPunchIds.some((id) => id.startsWith("--"))) {
    throw new Error("Usage: node functions/scripts/repair-approved-gps.js PROJECT_ID COMPANY_ID IN_PUNCH_ID [OUT_PUNCH_ID ...] [--apply] (18 Sep 2026 only; dry run by default; IN before OUT)");
  }
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();
  for (const gpsPunchId of gpsPunchIds) {
    console.log(JSON.stringify(await repairApprovedGpsAttendance(db, { companyId, gpsPunchId, dryRun })));
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
