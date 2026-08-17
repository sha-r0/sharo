import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    const input = await request.json();
    const companyId = String(input.companyId || "");
    const employeeId = String(input.employeeFirestoreId || "");
    const employeeRef = adminDb.collection("Companies").doc(companyId).collection("Usermanagement").doc(employeeId);
    const snap = await employeeRef.get();
    if (!snap.exists) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const expectedUid = snap.data()?.access?.authUid || snap.data()?.authUid;
    const matched = expectedUid === token.uid;
    await adminDb.collection("Companies").doc(companyId).collection("ActivityLogs").add({ type: matched ? "employee.login-success" : "employee.unauthorised-attempt", actorId: token.uid, actorEmployeeId: matched ? employeeId : null, targetUserId: employeeId, targetAuthUid: expectedUid || null, companyId, metadata: { reason: matched ? "authenticated" : "uid-mismatch" }, createdAt: FieldValue.serverTimestamp() });
    if (!matched) return NextResponse.json({ error: "UID_MISMATCH" }, { status: 403 });
    const employee = snap.data() || {};
    const roleId = employee.access?.roleId || employee.roleId || employee.employment?.role || "employee";
    const authUser = await adminAuth.getUser(token.uid);
    await adminAuth.setCustomUserClaims(token.uid, { ...(authUser.customClaims || {}), companyId, companyEmployeeId: employeeId, roleId, accountType: "employee", permissionsVersion: Date.now() });
    const rootUserRef = adminDb.collection("Usermanagement").doc(token.uid);
    const batch = adminDb.batch();
    batch.set(rootUserRef, { uid: token.uid, companyId, companyEmployeeId: employeeId, corporateId: employee.login?.corporateId || null, employeeId: employee.employeeId || employee.login?.employeeId || null, loginEmail: employee.login?.loginEmail || authUser.email || null, email: employee.personalInfo?.email || null, role: roleId, status: "active", accountType: "employee", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    batch.update(employeeRef, { "login.lastLogin": FieldValue.serverTimestamp(), "access.lastLogin": FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Employee login audit failed:", error);
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
}
