import assert from "node:assert/strict";
import { adminAuth, adminDb } from "../src/lib/firebase-admin.js";
import { syncEmployeeClaims } from "../src/lib/server/syncEmployeeClaims.mjs";
import { isActiveEmployee, resolveEmployeeAuthUid, resolveEmployeeRoleId } from "../src/app/allservice/rbac/employeeAuth.js";

const companyId = "agcqb5F8KKZCXjRkotut";
const employeeFirestoreId = "jdvf4IZ6glXhibMY4wx7";
const uid = "rhF0iHPipjMlX2TRpobXOlr73DD2";
assert.equal(process.env.FIREBASE_PROJECT_ID, "sharo-ad80a");
assert.ok(!process.env.FIREBASE_AUTH_EMULATOR_HOST && !process.env.FIRESTORE_EMULATOR_HOST);
assert.ok(process.argv.slice(2).every((arg) => arg === "--repair-monish"));
const employees = adminDb.collection("Companies").doc(companyId).collection("Usermanagement");
const snapshot = await employees.doc(employeeFirestoreId).get();
assert.ok(snapshot.exists);
const employee = snapshot.data();
assert.equal(String(employee.employeeId || employee.login?.employeeId), "16042006");
assert.equal(resolveEmployeeAuthUid(employee), uid);
assert.equal(resolveEmployeeRoleId(employee), "employee");
assert.ok(isActiveEmployee(employee));
const before = await adminAuth.getUser(uid);
assert.equal(before.disabled, false);
if (process.argv.includes("--repair-monish")) {
  const { claims } = await syncEmployeeClaims(adminAuth, { uid, companyId, employeeFirestoreId, employee });
  const after = await adminAuth.getUser(uid);
  assert.deepEqual(after.customClaims, claims);
  for (const [key, value] of Object.entries(before.customClaims || {})) {
    if (!Object.hasOwn({ companyId, companyEmployeeId: true, roleId: true, accountType: true, permissionsVersion: true }, key)) {
      assert.deepEqual(after.customClaims[key], value);
    }
  }
  console.log(JSON.stringify({ repaired: uid, claimsAfter: after.customClaims }));
} else {
  console.log(JSON.stringify({ repairApplied: false, monishClaims: before.customClaims || {} }));
}

const all = await employees.get();
let activeCount = 0;
const repairList = [];
for (const doc of all.docs) {
  const data = doc.data();
  if (!isActiveEmployee(data)) continue;
  activeCount++;
  const authUid = resolveEmployeeAuthUid(data);
  const expected = { companyId, companyEmployeeId: doc.id, roleId: resolveEmployeeRoleId(data) };
  const row = { name: data.personalInfo?.fullName || data.personalInfo?.name || data.name || null, employeeId: data.employeeId || data.login?.employeeId, authUid, employeeFirestoreId: doc.id, expected };
  if (!authUid) { repairList.push({ ...row, issues: ["missing authUid"] }); continue; }
  let user;
  try { user = await adminAuth.getUser(authUid); }
  catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    repairList.push({ ...row, issues: ["Auth user missing"] });
    continue;
  }
  const claims = user.customClaims || {};
  const issues = Object.entries(expected).filter(([key, value]) => claims[key] !== value).map(([key]) => `${key}: ${Object.hasOwn(claims, key) ? "stale" : "missing"}`);
  if (!Number.isSafeInteger(claims.permissionsVersion) || claims.permissionsVersion <= 0 || claims.permissionsVersion > Date.now()) issues.push("permissionsVersion: missing/invalid");
  if (user.disabled) issues.push("Auth user disabled");
  if (issues.length) repairList.push({ ...row, claims, issues });
}
console.log(JSON.stringify({ companyId, activeCount, repairList, versionPolicy: "Bootstrap uses Date.now(); no persisted canonical permissionsVersion exists to compare age against." }, null, 2));
