import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { ALL_PERMISSIONS } from "@/app/allservice/rbac/permissionCatalog";

const error = (code) => { throw new Error(code); };

// Temporary diagnostics: enable on the server with COMPANY_AUTH_DIAGNOSTICS=1.
// Never pass tokens, headers, document contents, or exception messages to this logger.
export async function authorizeCompanyRequest(request) {
  let stage = "bearer";
  const enabled = process.env.COMPANY_AUTH_DIAGNOSTICS === "1";
  const requestId = enabled ? globalThis.crypto.randomUUID() : undefined;
  const diagnose = (nextStage, details = {}) => {
    stage = nextStage;
    if (enabled) console.info("[company-auth]", { requestId, stage, ...details });
  };
  try {
    return await resolveCompanyRequest(request, diagnose);
  } catch (failure) {
    if (enabled) {
      // SDK codes are identifiers; arbitrary SDK messages can contain credentials.
      const sdkCode = typeof failure?.code === "string" && /^(?:auth\/)?[a-z][a-z0-9/-]{0,80}$/.test(failure.code)
        ? failure.code : undefined;
      const reason = ["UNAUTHENTICATED", "FORBIDDEN", "COMPANY_INACTIVE"].includes(failure?.message)
        ? failure.message : "DEPENDENCY_ERROR";
      console.warn("[company-auth]", { requestId, stage, outcome: "failed", reason, sdkCode });
    }
    throw failure;
  }
}

async function resolveCompanyRequest(request, diagnose) {
  const header = request.headers.get("authorization") || "";
  diagnose("bearer", { present: Boolean(header), bearerPrefix: header.startsWith("Bearer "), credentialPresent: header.startsWith("Bearer ") && header.length > 7 });
  if (!header.startsWith("Bearer ")) error("UNAUTHENTICATED");

  diagnose("verifyIdToken", { checkRevoked: true });
  const token = await adminAuth.verifyIdToken(header.slice(7), true);
  diagnose("verifyIdToken", { outcome: "verified", companyClaimPresent: Boolean(token.companyId), employeeClaimPresent: Boolean(token.companyEmployeeId) });
  let companySnapshot = null;

  if (token.companyId) {
    diagnose("owner.claimedCompany");
    const claimed = await adminDb.collection("Companies").doc(String(token.companyId)).get();
    diagnose("owner.claimedCompany", { exists: claimed.exists, ownerMatches: claimed.data()?.ownerUid === token.uid });
    if (claimed.exists && claimed.data()?.ownerUid === token.uid) companySnapshot = claimed;
  }
  if (!companySnapshot) {
    diagnose("owner.uidQuery");
    const owned = await adminDb.collection("Companies").where("ownerUid", "==", token.uid).limit(1).get();
    diagnose("owner.uidQuery", { found: !owned.empty });
    if (!owned.empty) companySnapshot = owned.docs[0];
  }
  if (companySnapshot) {
    diagnose("owner.status");
    if (String(companySnapshot.data()?.serviceStatus || "active").toLowerCase() !== "active") error("COMPANY_INACTIVE");
    const company = companySnapshot.data();
    return { token, uid: token.uid, companyId: companySnapshot.id, company, isOwner: true, employee: null,
      employeeFirestoreId: null, employeeId: null, employeeName: String(company?.ownerName || company?.contactPerson || company?.companyName || "Owner"),
      roleId: "owner", permissions: ALL_PERMISSIONS, active: true };
  }

  const rootUsers = adminDb.collection("Usermanagement");

  diagnose("root.uidDocument");
  let rootUser = await rootUsers
    .doc(token.uid)
    .get();
  
  /*
   * Preferred/current mapping:
   * Usermanagement/{firebaseAuthUid}
   *
   * If an older record is not stored by UID document ID,
   * fall back to searching its uid field.
   */
  diagnose("root.uidDocument", { exists: rootUser.exists });
  if (!rootUser.exists) {
    diagnose("root.uidFieldQuery");
    const matches = await rootUsers
      .where("uid", "==", token.uid)
      .limit(1)
      .get();
  
    diagnose("root.uidFieldQuery", { found: !matches.empty });
    if (matches.empty) {
      error("UNAUTHENTICATED");
    }
  
    rootUser = matches.docs[0];
  }

  const rootData = rootUser.data() || {};
  const companyId = String(rootData.companyId || token.companyId || "");
  diagnose("employee.companyId", { present: Boolean(companyId), source: rootData.companyId ? "root" : "token", claimMatchesRoot: !rootData.companyId || !token.companyId || rootData.companyId === token.companyId });
  if (!companyId) error("UNAUTHENTICATED");
  diagnose("employee.companyLookup");
  const companySnapshotForEmployee = await adminDb.collection("Companies").doc(companyId).get();
  diagnose("employee.companyLookup", { exists: companySnapshotForEmployee.exists });
  if (!companySnapshotForEmployee.exists) error("UNAUTHENTICATED");

  const employees = companySnapshotForEmployee.ref.collection("Usermanagement");
  let employeeSnapshot = null;
  const claimedEmployeeId = String(rootData.employeeFirestoreId || rootData.companyEmployeeId || token.companyEmployeeId || "");
  diagnose("employee.reference", { present: Boolean(claimedEmployeeId), source: rootData.employeeFirestoreId ? "root.employeeFirestoreId" : rootData.companyEmployeeId ? "root.companyEmployeeId" : "token.companyEmployeeId" });
  if (claimedEmployeeId) {
    const claimed = await employees.doc(claimedEmployeeId).get();
    const uid = claimed.data()?.access?.authUid || claimed.data()?.authUid;
    diagnose("employee.reference", { exists: claimed.exists, uidMatches: uid === token.uid });
    if (claimed.exists && uid === token.uid) employeeSnapshot = claimed;
  }
  if (!employeeSnapshot) {
    diagnose("employee.accessAuthUidQuery");
    let matches = await employees.where("access.authUid", "==", token.uid).limit(1).get();
    diagnose("employee.accessAuthUidQuery", { found: !matches.empty });
    if (matches.empty) {
      diagnose("employee.authUidQuery");
      matches = await employees.where("authUid", "==", token.uid).limit(1).get();
      diagnose("employee.authUidQuery", { found: !matches.empty });
    }
    if (matches.empty) error("FORBIDDEN");
    employeeSnapshot = matches.docs[0];
  }

  diagnose("employee.status");
  const employee = { id: employeeSnapshot.id, ...employeeSnapshot.data() };
  if (!["active", "enabled"].includes(String(rootData.status || "active").toLowerCase())) error("FORBIDDEN");
  const status = String(employee.access?.status || employee.employment?.status || employee.status || "active").toLowerCase();
  if (employee.access?.loginEnabled === false || !["active", "enabled"].includes(status)) error("FORBIDDEN");
  if (String(companySnapshotForEmployee.data()?.serviceStatus || "active").toLowerCase() !== "active") error("COMPANY_INACTIVE");

  diagnose("employee.authorized");
  return {
    token, uid: token.uid,
    companyId,
    company: companySnapshotForEmployee.data(),
    isOwner: false,
    employee,
    permissions: Array.isArray(employee.access?.effectivePermissions) ? employee.access.effectivePermissions : [],
    employeeFirestoreId: employeeSnapshot.id,
    employeeId: String(employee.employeeId || employee.login?.employeeId || ""),
    employeeName: String(employee.personalInfo?.fullName || employee.employeeName || employee.name || "Employee"),
    roleId: String(employee.access?.roleId || employee.employment?.role || rootData.role || "employee").toLowerCase(),
    active: true,
  };
}

export { requireCompanyPermission } from "./companyPermission.js";
