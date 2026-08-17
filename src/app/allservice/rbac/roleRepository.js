import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { ROLE_TEMPLATES, normalizeRoleId } from "./permissionCatalog";

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
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch("/api/rbac/roles", { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...role, id }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to save role.");
    return id;
  }
  async remove(companyId, roleId) { if (ROLE_TEMPLATES[roleId]?.system) throw new Error("System roles cannot be deleted."); return deleteDoc(doc(db, "Companies", companyId, "Roles", roleId)); }
}
export default new RoleRepository();
