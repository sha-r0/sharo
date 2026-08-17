import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) throw new Error("UNAUTHENTICATED");
    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    const root = await adminDb.collection("Usermanagement").where("uid", "==", token.uid).limit(1).get();
    if (root.empty) throw new Error("UNAUTHENTICATED");
    const { companyId, companyEmployeeId } = root.docs[0].data();
    if (!companyId || !companyEmployeeId) throw new Error("FORBIDDEN");
    const employeeRef = adminDb.collection("Companies").doc(companyId).collection("Usermanagement").doc(companyEmployeeId);
    const snap = await employeeRef.get();
    if (!snap.exists || (snap.data().access?.authUid || snap.data().authUid) !== token.uid) throw new Error("FORBIDDEN");
    await employeeRef.update({ "access.requirePasswordChange": false, "access.policyAccepted": true, "access.passwordChangedAt": FieldValue.serverTimestamp(), "access.lastLogin": FieldValue.serverTimestamp(), "login.temporaryPasswordSet": false, "login.lastLogin": FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await adminDb.collection("Companies").doc(companyId).collection("ActivityLogs").add({ type: "employee.password-changed", actorId: token.uid, actorEmployeeId: companyEmployeeId, targetUserId: companyEmployeeId, targetAuthUid: token.uid, companyId, metadata: {}, createdAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message || "PASSWORD_UPDATE_FAILED" }, { status: error.message === "UNAUTHENTICATED" ? 401 : 403 });
  }
}
