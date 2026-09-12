import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ALL_PERMISSIONS } from "@/app/allservice/rbac/permissionCatalog";

const error = (code) => { throw new Error(code); };

export async function authorizeCompanyRequest(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) error("UNAUTHENTICATED");

  const token = await adminAuth.verifyIdToken(header.slice(7), true);
  let companySnapshot = null;

  if (token.companyId) {
    const claimed = await adminDb.collection("Companies").doc(String(token.companyId)).get();
    if (claimed.exists && claimed.data()?.ownerUid === token.uid) companySnapshot = claimed;
  }
  if (!companySnapshot) {
    const owned = await adminDb.collection("Companies").where("ownerUid", "==", token.uid).limit(1).get();
    if (!owned.empty) companySnapshot = owned.docs[0];
  }
  if (companySnapshot) {
    if (String(companySnapshot.data()?.serviceStatus || "active").toLowerCase() !== "active") error("COMPANY_INACTIVE");
    return { token, companyId: companySnapshot.id, company: companySnapshot.data(), isOwner: true, employee: null, permissions: ALL_PERMISSIONS };
  }

  const rootUsers = adminDb.collection("Usermanagement");
  let rootUser = await rootUsers.doc(token.uid).get();
  if (!rootUser.exists || rootUser.data()?.uid !== token.uid) {
    const matches = await rootUsers.where("uid", "==", token.uid).limit(1).get();
    if (matches.empty) error("UNAUTHENTICATED");
    rootUser = matches.docs[0];
  }

  const rootData = rootUser.data() || {};
  const companyId = String(rootData.companyId || token.companyId || "");
  if (!companyId) error("UNAUTHENTICATED");
  const companySnapshotForEmployee = await adminDb.collection("Companies").doc(companyId).get();
  if (!companySnapshotForEmployee.exists) error("UNAUTHENTICATED");

  const employees = companySnapshotForEmployee.ref.collection("Usermanagement");
  let employeeSnapshot = null;
  const claimedEmployeeId = String(rootData.companyEmployeeId || token.companyEmployeeId || "");
  if (claimedEmployeeId) {
    const claimed = await employees.doc(claimedEmployeeId).get();
    const uid = claimed.data()?.access?.authUid || claimed.data()?.authUid;
    if (claimed.exists && uid === token.uid) employeeSnapshot = claimed;
  }
  if (!employeeSnapshot) {
    let matches = await employees.where("access.authUid", "==", token.uid).limit(1).get();
    if (matches.empty) matches = await employees.where("authUid", "==", token.uid).limit(1).get();
    if (matches.empty) error("FORBIDDEN");
    employeeSnapshot = matches.docs[0];
  }

  const employee = { id: employeeSnapshot.id, ...employeeSnapshot.data() };
  const status = String(employee.access?.status || employee.employment?.status || employee.status || "active").toLowerCase();
  if (employee.access?.loginEnabled === false || !["active", "enabled"].includes(status)) error("FORBIDDEN");
  if (String(companySnapshotForEmployee.data()?.serviceStatus || "active").toLowerCase() !== "active") error("COMPANY_INACTIVE");

  return {
    token,
    companyId,
    company: companySnapshotForEmployee.data(),
    isOwner: false,
    employee,
    permissions: Array.isArray(employee.access?.effectivePermissions) ? employee.access.effectivePermissions : [],
  };
}

export { requireCompanyPermission } from "./companyPermission.js";
