import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ALL_PERMISSIONS, DEFAULT_ROLE_LEVELS, calculateEffectivePermissions, normalizeRoleId } from "@/app/allservice/rbac/permissionCatalog";
import { resolvePermissionOverrides } from "@/app/allservice/rbac/employeeAuth";

export async function PUT(request) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    const root = await adminDb.collection("Usermanagement").where("uid", "==", token.uid).limit(1).get();
    if (root.empty) throw new Error("UNAUTHENTICATED");
    const companyId = root.docs[0].data().companyId;
    const companyRef = adminDb.collection("Companies").doc(companyId);
    const companySnap = await companyRef.get();
    if (!companySnap.exists || companySnap.data().ownerUid !== token.uid) throw new Error("FORBIDDEN");
    if (String(companySnap.data().serviceStatus || "active").toLowerCase() !== "active") throw new Error("COMPANY_INACTIVE");
    const input = await request.json();
    const id = normalizeRoleId(input.id || input.name);
    if (id === "owner") throw new Error("OWNER_PROTECTED");
    const permissions = [...new Set((input.permissions || []).filter((key) => ALL_PERMISSIONS.includes(key)))];
    const level = Number(input.level ?? DEFAULT_ROLE_LEVELS[id] ?? 10);
    if (!Number.isFinite(level) || level < 1 || level >= 100) throw new Error("INVALID_ROLE_LEVEL");
    const roleRef = companyRef.collection("Roles").doc(id);
    const before = await roleRef.get();
    await roleRef.set({ name: String(input.name || id).trim(), description: input.description || "", level, system: Boolean(DEFAULT_ROLE_LEVELS[id]), isActive: input.isActive !== false, permissions, canAssignRoles: (input.canAssignRoles || []).map(normalizeRoleId).filter((role) => (DEFAULT_ROLE_LEVELS[role] || 0) < level), canManagePermissions: Boolean(input.canManagePermissions), updatedBy: token.uid, updatedAt: FieldValue.serverTimestamp(), createdAt: before.data()?.createdAt || FieldValue.serverTimestamp() }, { merge: true });
    const users = await companyRef.collection("Usermanagement").where("access.roleId", "==", id).get();
    for (let offset = 0; offset < users.docs.length; offset += 400) {
      const batch = adminDb.batch();
      users.docs.slice(offset, offset + 400).forEach((user) => { const overrides = resolvePermissionOverrides(user.data()); batch.update(user.ref, { "access.effectivePermissions": calculateEffectivePermissions({ rolePermissions: permissions, grantedPermissions: overrides.grant, deniedPermissions: overrides.deny }), "access.permissionsUpdatedAt": FieldValue.serverTimestamp() }); });
      await batch.commit();
    }
    await companyRef.collection("ActivityLogs").add({ type: "employee.permissions-changed", actorId: token.uid, companyId, before: before.exists ? { permissions: before.data().permissions || [], level: before.data().level } : null, after: { roleId: id, permissions, level }, metadata: { affectedUsers: users.size }, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    const status = error.message === "UNAUTHENTICATED" ? 401 : error.message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: error.message || "ROLE_UPDATE_FAILED" }, { status });
  }
}
