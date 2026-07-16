import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ROLE_TEMPLATES, normalizeRoleId } from "./permissionCatalog";
import notificationService from "@/app/allservice/notification/notificationService";

const rolesRef = (companyId) => collection(db, "Companies", companyId, "Roles");
class RoleRepository {
  async list(companyId) {
    const snapshot = await getDocs(rolesRef(companyId));
    const custom = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const customIds = new Set(custom.map((item) => item.id));
    return [...Object.entries(ROLE_TEMPLATES).filter(([id]) => !customIds.has(id)).map(([id, role]) => ({ id, ...role })), ...custom];
  }
  async save(companyId, role, actorId) {
    const id = role.id ? normalizeRoleId(role.id) : normalizeRoleId(role.name);
    if (id === "owner") throw new Error("The Owner role is immutable.");
    await setDoc(doc(db, "Companies", companyId, "Roles", id), { name: role.name.trim(), description: role.description || "", permissions: [...new Set(role.permissions || [])], system: Boolean(ROLE_TEMPLATES[id]), updatedBy: actorId || null, updatedAt: serverTimestamp(), createdAt: role.createdAt || serverTimestamp() }, { merge: true });
    const users = await getDocs(query(collection(db, "Companies", companyId, "Usermanagement"), where("access.roleId", "==", id)));
    const batch = writeBatch(db);
    users.docs.forEach((user) => batch.update(user.ref, { "access.effectivePermissions": [...new Set(role.permissions || [])], "access.permissionsUpdatedAt": serverTimestamp() }));
    await batch.commit();
    if (users.size) await notificationService.create({ companyId, type: "permissions.updated", module: "user-management", title: "Permissions updated", message: `Your ${role.name} role permissions were updated.`, priority: "high", targetUsers: users.docs.map((user) => user.id), actionRoute: "/manager", actionId: id, metadata: { roleId: id, permissionCount: role.permissions?.length || 0 } }).catch((error) => console.warn("Permission notification unavailable:", error));
    return id;
  }
  async remove(companyId, roleId) { if (ROLE_TEMPLATES[roleId]?.system) throw new Error("System roles cannot be deleted."); return deleteDoc(doc(db, "Companies", companyId, "Roles", roleId)); }
}
export default new RoleRepository();
