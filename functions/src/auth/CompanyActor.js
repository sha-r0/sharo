"use strict";

const ACTIVE = new Set(["active", "enabled"]);
const clean = (value, fallback = "") => String(value ?? fallback).trim();

function isActiveEmployee(employee) {
  if (employee.access?.loginEnabled === false || employee.loginEnabled === false) return false;
  const status = clean(employee.access?.status || employee.status || employee.employment?.status || "active").toLowerCase();
  return ACTIVE.has(status);
}

function hasCompanyPermission(actor, ...permissions) {
  return Boolean(actor?.isOwner || permissions.some((permission) => actor?.permissions?.includes(permission)));
}

function requireCompanyPermission(actor, ...permissions) {
  if (!hasCompanyPermission(actor, ...permissions)) throw new Error("FORBIDDEN");
}

async function resolveCompanyActor(db, auth) {
  if (!auth?.uid) throw new Error("UNAUTHENTICATED");
  let companyId = clean(auth.token?.companyId);
  let companySnapshot = companyId ? await db.collection("Companies").doc(companyId).get() : null;

  if (!companySnapshot?.exists || companySnapshot.data()?.ownerUid !== auth.uid) {
    if (!companyId) {
      const owned = await db.collection("Companies").where("ownerUid", "==", auth.uid).limit(1).get();
      if (!owned.empty) {
        companySnapshot = owned.docs[0];
        companyId = companySnapshot.id;
      }
    }
  }

  if (companySnapshot?.exists && companySnapshot.data()?.ownerUid === auth.uid) {
    return { uid: auth.uid, companyId, isOwner: true, employeeId: null, permissions: [] };
  }
  if (!companyId || !companySnapshot?.exists) throw new Error("FORBIDDEN");

  const employeeId = clean(auth.token?.companyEmployeeId);
  if (!employeeId) throw new Error("FORBIDDEN");
  const employeeSnapshot = await companySnapshot.ref.collection("Usermanagement").doc(employeeId).get();
  const employee = employeeSnapshot.data() || {};
  const employeeUid = employee.access?.authUid || employee.authUid;
  if (!employeeSnapshot.exists || employeeUid !== auth.uid || !isActiveEmployee(employee)) throw new Error("FORBIDDEN");

  const roleId = clean(employee.access?.roleId || employee.roleId || employee.employment?.role || "employee").toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const storedPermissions = employee.access?.effectivePermissions || employee.access?.permissions || employee.effectivePermissions || employee.permissions;
  const permissions = Array.isArray(storedPermissions)
    ? [...storedPermissions]
    : [];
  const denied = Array.isArray(employee.access?.deniedPermissions)
    ? employee.access.deniedPermissions
    : Array.isArray(employee.deniedPermissions) ? employee.deniedPermissions : [];
  if (roleId === "accounts_manager" && !denied.includes("advance.delete") && !permissions.includes("advance.delete")) permissions.push("advance.delete");
  return {
    uid: auth.uid,
    companyId,
    employeeId: employeeSnapshot.id,
    employee,
    isOwner: false,
    permissions,
  };
}

module.exports = { clean, hasCompanyPermission, isActiveEmployee, requireCompanyPermission, resolveCompanyActor };
