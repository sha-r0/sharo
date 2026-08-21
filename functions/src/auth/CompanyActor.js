"use strict";

const ACTIVE = new Set(["active", "enabled"]);
const clean = (value, fallback = "") => String(value ?? fallback).trim();

function isActiveEmployee(employee) {
  if (employee.access?.loginEnabled === false || employee.loginEnabled === false) return false;
  const status = clean(employee.access?.status || employee.status || employee.employment?.status || "active").toLowerCase();
  return ACTIVE.has(status);
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

  return {
    uid: auth.uid,
    companyId,
    employeeId: employeeSnapshot.id,
    employee,
    isOwner: false,
    permissions: employee.access?.effectivePermissions || employee.effectivePermissions || [],
  };
}

module.exports = { clean, isActiveEmployee, resolveCompanyActor };
