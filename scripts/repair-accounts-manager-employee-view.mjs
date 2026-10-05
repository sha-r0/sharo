import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { normalizeRoleId } from '../src/app/allservice/rbac/permissionCatalog.js';
import { resolveEmployeeAuthUid, resolveEmployeeRoleId } from '../src/app/allservice/rbac/employeeAuth.js';

export function planEmployeeView(employee, company, roleIds) {
  const role = normalizeRoleId(resolveEmployeeRoleId(employee));
  if (!roleIds.has(role)) return { status: 'not-target' };
  if (role === 'owner' || (company.ownerUid && resolveEmployeeAuthUid(employee) === company.ownerUid)) return { status: 'owner-skipped' };
  const permissions = employee.access?.effectivePermissions;
  // Preserve all override locations, including legacy denials.
  const denies = [employee.access?.permissionOverrides?.deny, employee.permissionOverrides?.deny].flatMap((value) => Array.isArray(value) ? value : []);
  if (Array.isArray(permissions) && permissions.includes('employee.view')) return { status: 'already-present' };
  if (denies.includes('employee.view')) return { status: 'explicit-deny', missing: true };
  if (!Array.isArray(permissions)) return { status: 'missing-snapshot', missing: true };
  return { status: 'update', missing: true, permissions: [...permissions, 'employee.view'] };
}

async function run() {
  const { adminDb } = await import('../src/lib/firebase-admin.js');
  let stage = 'audit';
  try {
    if (process.argv.length !== 3 || !['--dry-run', '--apply'].includes(process.argv[2]) || process.env.FIREBASE_PROJECT_ID !== 'sharo-ad80a' || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Invalid invocation');
    const apply = process.argv[2] === '--apply';
    const companies = await adminDb.collection('Companies').get();
    const summary = { tenantsAudited: companies.size, accountsManagersFound: 0, missingEmployeeView: 0, eligibleUpdates: 0, explicitDenies: 0, missingSnapshots: 0, ownersSkipped: 0, usersUpdated: 0, claimsUpdated: 0, tenants: [] };
    for (const company of companies.docs) {
      const [roles, employees] = await Promise.all([company.ref.collection('Roles').get(), company.ref.collection('Usermanagement').get()]);
      const roleIds = new Set(['accounts_manager']);
      for (const role of roles.docs) if (normalizeRoleId(role.data().name) === 'accounts_manager') roleIds.add(normalizeRoleId(role.id));
      const report = { companyId: company.id, accountsManagers: [] };
      for (const employee of employees.docs) {
        const plan = planEmployeeView(employee.data(), company.data(), roleIds);
        if (plan.status === 'not-target') continue;
        if (plan.status === 'owner-skipped') { summary.ownersSkipped++; continue; }
        summary.accountsManagersFound++;
        if (plan.missing) summary.missingEmployeeView++;
        if (plan.status === 'explicit-deny') summary.explicitDenies++;
        if (plan.status === 'missing-snapshot') summary.missingSnapshots++;
        if (plan.status === 'update') summary.eligibleUpdates++;
        report.accountsManagers.push({ employeeFirestoreId: employee.id, status: plan.status });
        if (apply && plan.status === 'update') {
          stage = 'update';
          const changed = await adminDb.runTransaction(async (tx) => {
            const liveCompany = await tx.get(company.ref);
            const liveEmployee = await tx.get(employee.ref);
            if (!liveCompany.exists || !liveEmployee.exists || !isDeepStrictEqual(liveCompany.data(), company.data()) || !isDeepStrictEqual(liveEmployee.data(), employee.data())) throw new Error('Concurrent change');
            const livePlan = planEmployeeView(liveEmployee.data(), liveCompany.data(), roleIds);
            if (livePlan.status !== 'update') throw new Error('Plan changed');
            tx.update(employee.ref, { 'access.effectivePermissions': livePlan.permissions });
            return livePlan.permissions;
          });
          stage = 'verify';
          const after = (await employee.ref.get()).data();
          const expected = { ...employee.data(), access: { ...employee.data().access, effectivePermissions: changed } };
          if (!isDeepStrictEqual(after, expected)) throw new Error('Post-write mismatch');
          summary.usersUpdated++;
        }
      }
      summary.tenants.push(report);
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...summary }, null, 2));
  } catch {
    console.error(JSON.stringify({ repairFailed: true, stage }));
    process.exitCode = 1;
  } finally { await adminDb.terminate(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await run();
