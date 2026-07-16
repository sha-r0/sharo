import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { permissionsForRole, normalizeRoleId } from "@/app/allservice/rbac/permissionCatalog";

const PLAN_LIMITS = { starter: 5, basic: 5, professional: 25, pro: 25, enterprise: Infinity };
async function authorize(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
  const token = await adminAuth.verifyIdToken(header.slice(7), true);
  const users = await adminDb.collection("Usermanagement").where("uid", "==", token.uid).limit(1).get();
  if (users.empty) throw new Error("UNAUTHENTICATED");
  const caller = { id: users.docs[0].id, ...users.docs[0].data(), uid: token.uid };
  const companyId = caller.companyId || token.companyId;
  const companyDoc = await adminDb.collection("Companies").doc(companyId).get();
  if (!companyDoc.exists) throw new Error("COMPANY_NOT_FOUND");
  const company = { id: companyDoc.id, ...companyDoc.data() };
  const owner = company.ownerUid === token.uid || String(caller.role).toLowerCase() === "owner" || caller.email === company.ownerEmail;
  if (!owner) {
    const employees = await adminDb.collection("Companies").doc(companyId).collection("Usermanagement").where("access.authUid", "==", token.uid).limit(1).get();
    const permissions = employees.empty ? [] : employees.docs[0].data().access?.effectivePermissions || [];
    if (!permissions.includes("employee.manage")) throw new Error("FORBIDDEN");
  }
  return { token, caller, company, companyId, owner };
}
const responseError = (error) => { const code = error.message; const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : code === "LIMIT_REACHED" ? 409 : 400; return NextResponse.json({ error: code }, { status }); };

export async function POST(request) {
  let createdUid = null;
  try {
    const context = await authorize(request), input = await request.json();
    const employeeRef = adminDb.collection("Companies").doc(context.companyId).collection("Usermanagement").doc(input.employeeFirestoreId);
    const employeeDoc = await employeeRef.get();
    if (!employeeDoc.exists) throw new Error("EMPLOYEE_NOT_FOUND");
    const employees = await adminDb.collection("Companies").doc(context.companyId).collection("Usermanagement").get();
    const activeEmployeeCount = employees.docs.filter((item) => String(item.data().employment?.status || "active").toLowerCase() !== "inactive").length;
    const planLimit = PLAN_LIMITS[String(context.company.plan || "").toLowerCase()] ?? (Number(context.company.employeeCount || 0) || Infinity);
    const configuredLimit = Number(context.company.employeeLimit || context.company.employeeCount || planLimit);
    const limit = String(context.company.plan).toLowerCase() === "enterprise" ? Infinity : Math.min(configuredLimit || planLimit, planLimit || configuredLimit);
    if (activeEmployeeCount > limit) throw new Error("LIMIT_REACHED");
    const roleId = normalizeRoleId(input.roleId), permissions = input.permissions?.length ? input.permissions : permissionsForRole(roleId);
    const phoneNumber = /^\+[1-9]\d{7,14}$/.test(input.phoneNumber || "") ? input.phoneNumber : /^\d{10}$/.test(input.phoneNumber || "") ? `+91${input.phoneNumber}` : undefined;
    const authUser = await adminAuth.createUser({ email: input.email, password: input.password, displayName: input.displayName, phoneNumber, disabled: false });
    createdUid = authUser.uid;
    await adminAuth.setCustomUserClaims(authUser.uid, { companyId: context.companyId, companyEmployeeId: input.employeeFirestoreId, roleId, permissionsVersion: Date.now() });
    const batch = adminDb.batch();
    batch.set(adminDb.collection("Usermanagement").doc(authUser.uid), { uid: authUser.uid, companyId: context.companyId, companyEmployeeId: input.employeeFirestoreId, email: input.email.toLowerCase(), role: roleId, status: "active", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(employeeRef, { access: { authUid: authUser.uid, loginEnabled: true, roleId, status: "active", requirePasswordChange: input.requirePasswordChange !== false, policyAccepted: false, effectivePermissions: permissions, permissionOverrides: input.permissionOverrides || { grant: [], deny: [] } }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.set(adminDb.collection("Companies").doc(context.companyId).collection("ActivityLogs").doc(), { type: "user.created", actorId: context.token.uid, targetUserId: authUser.uid, targetEmployeeId: input.employeeFirestoreId, metadata: { roleId }, createdAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ uid: authUser.uid });
  } catch (error) { if (createdUid) await adminAuth.deleteUser(createdUid).catch(() => {}); console.error("RBAC user creation failed:", error); return responseError(error); }
}

export async function PATCH(request) {
  try {
    const context = await authorize(request), input = await request.json();
    if (input.targetUid === context.company.ownerUid && ["disable", "lock", "delete", "revoke"].includes(input.action)) throw new Error("OWNER_PROTECTED");
    if (input.targetUid === context.token.uid && ["disable", "lock", "delete"].includes(input.action)) throw new Error("SELF_PROTECTED");
    if (input.action === "revoke") await adminAuth.revokeRefreshTokens(input.targetUid);
    if (["disable", "lock"].includes(input.action)) await adminAuth.updateUser(input.targetUid, { disabled: true });
    if (input.action === "unlock") await adminAuth.updateUser(input.targetUid, { disabled: false });
    if (input.action === "delete") await adminAuth.deleteUser(input.targetUid);
    if (input.action === "reset-password") return NextResponse.json({ resetLink: await adminAuth.generatePasswordResetLink(input.email) });
    if (input.action === "role") await adminAuth.setCustomUserClaims(input.targetUid, { companyId: context.companyId, companyEmployeeId: input.employeeFirestoreId, roleId: normalizeRoleId(input.roleId), permissionsVersion: Date.now() });
    if (input.employeeFirestoreId) {
      const updates = { "access.updatedAt": FieldValue.serverTimestamp() };
      if (["disable", "lock"].includes(input.action)) updates["access.status"] = input.action === "lock" ? "locked" : "inactive";
      if (input.action === "unlock") updates["access.status"] = "active";
      if (input.action === "delete") { updates["access.status"] = "inactive"; updates["access.loginEnabled"] = false; updates["access.authUid"] = null; }
      if (input.action === "role") { updates["access.roleId"] = normalizeRoleId(input.roleId); updates["access.effectivePermissions"] = input.permissions || permissionsForRole(input.roleId); updates["access.permissionOverrides"] = input.permissionOverrides || { grant: [], deny: [] }; }
      if (input.action === "expire-password") updates["access.requirePasswordChange"] = true;
      await adminDb.collection("Companies").doc(context.companyId).collection("Usermanagement").doc(input.employeeFirestoreId).update(updates);
    }
    await adminDb.collection("Companies").doc(context.companyId).collection("ActivityLogs").add({ type: `user.${input.action}`, actorId: context.token.uid, targetUserId: input.targetUid, metadata: input.metadata || {}, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) { console.error("RBAC user action failed:", error); return responseError(error); }
}
