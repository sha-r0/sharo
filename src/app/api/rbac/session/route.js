import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { refreshPerformancePermissions } from "@/lib/server/refreshPerformancePermissions";

const unauthenticated = () =>
  NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

export async function GET(request) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return unauthenticated();

    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    let ownerCompany = null;

    if (token.companyId) {
      const claimedCompany = await adminDb
        .collection("Companies")
        .doc(String(token.companyId))
        .get();
      if (claimedCompany.exists && claimedCompany.data()?.ownerUid === token.uid) {
        ownerCompany = claimedCompany;
      }
    }

    if (!ownerCompany) {
      const ownedCompanies = await adminDb
        .collection("Companies")
        .where("ownerUid", "==", token.uid)
        .limit(1)
        .get();
      if (!ownedCompanies.empty) ownerCompany = ownedCompanies.docs[0];
    }

    if (ownerCompany) {
      return NextResponse.json({
        rootUserId: null,
        companyId: ownerCompany.id,
        companyEmployeeId: null,
        isOwner: true,
      });
    }

    const rootUsers = adminDb.collection("Usermanagement");

    let rootUser = await rootUsers.doc(token.uid).get();
    if (!rootUser.exists || rootUser.data()?.uid !== token.uid) {
      const legacyUsers = await rootUsers
        .where("uid", "==", token.uid)
        .limit(1)
        .get();
      if (legacyUsers.empty) return unauthenticated();
      rootUser = legacyUsers.docs[0];
    }

    const rootData = rootUser.data() || {};
    const companyId = String(rootData.companyId || token.companyId || "");
    if (!companyId) return unauthenticated();

    const companyRef = adminDb.collection("Companies").doc(companyId);
    const company = await companyRef.get();
    if (!company.exists) return unauthenticated();

    let employeeId = String(
      rootData.companyEmployeeId || token.companyEmployeeId || ""
    );
    let employee = null;

    if (employeeId) {
      employee = await companyRef.collection("Usermanagement").doc(employeeId).get();
      const employeeUid = employee.data()?.access?.authUid || employee.data()?.authUid;
      if (!employee.exists || employeeUid !== token.uid) {
        employee = null;
        employeeId = "";
      }
    }

    if (!employee) {
      const employees = companyRef.collection("Usermanagement");
      let matches = await employees
        .where("access.authUid", "==", token.uid)
        .limit(1)
        .get();
      if (matches.empty) {
        matches = await employees
          .where("authUid", "==", token.uid)
          .limit(1)
          .get();
      }
      if (matches.empty) return unauthenticated();
      employeeId = matches.docs[0].id;
    }

    // AuthContext reads the employee snapshot after this response. Complete
    // the targeted backfill first so sidebar, route guards and APIs agree.
    await refreshPerformancePermissions(companyId, employeeId, token.uid);

    return NextResponse.json({
      rootUserId: rootUser.id,
      companyId,
      companyEmployeeId: employeeId || null,
      isOwner: false,
    });
  } catch (error) {
    console.error("Session identity resolution failed", {
      code: error?.code,
      message: error?.message,
    });
    return unauthenticated();
  }
}
