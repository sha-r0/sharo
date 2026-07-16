import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ALL_PERMISSIONS, PERMISSION_ACTIONS, PERMISSION_MODULES } from "./permissionCatalog";
class PermissionRepository {
  async getCatalog(companyId) { const reference = doc(db, "Companies", companyId, "Permissions", "catalog"); const snapshot = await getDoc(reference); return snapshot.exists() ? snapshot.data() : { modules: PERMISSION_MODULES, actions: PERMISSION_ACTIONS, permissions: ALL_PERMISSIONS, version: 1 }; }
  async ensureCatalog(companyId) { const reference = doc(db, "Companies", companyId, "Permissions", "catalog"); await setDoc(reference, { modules: PERMISSION_MODULES, actions: PERMISSION_ACTIONS, permissions: ALL_PERMISSIONS, version: 1, updatedAt: serverTimestamp() }, { merge: true }); }
}
export default new PermissionRepository();
