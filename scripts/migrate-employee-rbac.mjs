import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { buildEmployeeLoginEmail, resolveEmployeeAuthUid, resolveEmployeeLoginEnabled, resolveEmployeeRoleId, resolveEmployeeStatus, resolvePermissionOverrides } from "../src/app/allservice/rbac/employeeAuth.js";
import { DEFAULT_ROLE_LEVELS, ROLE_TEMPLATES, calculateEffectivePermissions, normalizeRoleId, permissionsForRole } from "../src/app/allservice/rbac/permissionCatalog.js";

const apply = process.argv.includes("--apply");
for (const key of ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]) if (!process.env[key]) throw new Error(`${key} is required.`);
const app = getApps()[0] || initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n") }) });
const db = getFirestore(app);
const companies = await db.collection("Companies").get();
let employeeCount = 0;

for (const companyDoc of companies.docs) {
  const company = companyDoc.data() || {};
  const roles = new Map();
  const storedRoles = await companyDoc.ref.collection("Roles").get();
  storedRoles.docs.forEach((role) => roles.set(role.id, role.data()));
  const employees = await companyDoc.ref.collection("Usermanagement").get();
  const pending = [];
  for (const employeeDoc of employees.docs) {
    const employee = employeeDoc.data() || {};
    const employeeId = String(employee.employeeId || employee.login?.employeeId || "").trim();
    if (!employeeId) continue;
    const roleId = normalizeRoleId(resolveEmployeeRoleId(employee));
    const role = roles.get(roleId) || ROLE_TEMPLATES[roleId] || {};
    const overrides = resolvePermissionOverrides(employee);
    const effectivePermissions = calculateEffectivePermissions({ rolePermissions: role.permissions || permissionsForRole(roleId) || employee.access?.effectivePermissions || employee.effectivePermissions || [], grantedPermissions: overrides.grant, deniedPermissions: overrides.deny });
    const corporateId = company.corporateId || company.companyCode;
    if (!corporateId && !employee.login?.loginEmail) { console.warn(`Skipping ${companyDoc.id}/${employeeDoc.id}: company has no corporateId/companyCode.`); continue; }
    const loginEmail = employee.login?.loginEmail || buildEmployeeLoginEmail(corporateId, employeeId);
    pending.push({ ref: employeeDoc.ref, data: { "access.authUid": resolveEmployeeAuthUid(employee), "access.roleId": roleId, "access.roleLevel": Number(role.level ?? DEFAULT_ROLE_LEVELS[roleId] ?? 10), "access.loginEnabled": resolveEmployeeLoginEnabled(employee), "access.status": resolveEmployeeStatus(employee), "access.permissionOverrides": overrides, "access.effectivePermissions": effectivePermissions, "login.corporateId": corporateId, "login.employeeId": employeeId, "login.loginEmail": loginEmail, "reporting.teamId": employee.reporting?.teamId || employee.employment?.teamId || null, "reporting.teamLeadId": employee.reporting?.teamLeadId || employee.employment?.teamLeadId || null, "reporting.reportsTo": employee.reporting?.reportsTo || employee.employment?.reportsTo || null, updatedAt: FieldValue.serverTimestamp() } });
  }
  employeeCount += pending.length;
  if (apply) for (let offset = 0; offset < pending.length; offset += 400) { const batch = db.batch(); pending.slice(offset, offset + 400).forEach(({ ref, data }) => batch.update(ref, data)); await batch.commit(); }
}

console.log(`${apply ? "Updated" : "Would update"} ${employeeCount} employee records across ${companies.size} companies.`);
if (!apply) console.log("Dry run only. Re-run with --apply after reviewing the count and taking a Firestore backup.");
