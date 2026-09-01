import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

const unauthenticated = () =>
  NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

async function resolveAuditTarget(token) {
  const owned = await adminDb
    .collection("Companies")
    .where("ownerUid", "==", token.uid)
    .limit(1)
    .get();
  if (!owned.empty) return { company: owned.docs[0], employee: null };

  const rootUsers = adminDb.collection("Usermanagement");
  let root = await rootUsers.doc(token.uid).get();
  if (!root.exists || root.data()?.uid !== token.uid) {
    const matches = await rootUsers.where("uid", "==", token.uid).limit(1).get();
    if (matches.empty) return null;
    root = matches.docs[0];
  }

  const companyId = String(root.data()?.companyId || token.companyId || "");
  if (!companyId) return null;
  const company = await adminDb.collection("Companies").doc(companyId).get();
  if (!company.exists) return null;

  const employees = company.ref.collection("Usermanagement");
  let employeeId = String(root.data()?.companyEmployeeId || token.companyEmployeeId || "");
  let employee = employeeId ? await employees.doc(employeeId).get() : null;
  const linkedUid = employee?.data()?.access?.authUid || employee?.data()?.authUid;
  if (!employee?.exists || linkedUid !== token.uid) {
    let matches = await employees.where("access.authUid", "==", token.uid).limit(1).get();
    if (matches.empty) matches = await employees.where("authUid", "==", token.uid).limit(1).get();
    if (matches.empty) return null;
    employee = matches.docs[0];
  }
  return { company, employee };
}

export async function POST(request) {
  try {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) return unauthenticated();
    const token = await adminAuth.verifyIdToken(header.slice(7), true);
    const target = await resolveAuditTarget(token);
    if (!target) return unauthenticated();

    const userAgent = request.headers.get("user-agent") || "Unknown";
    const browser = userAgent.includes("Chrome")
      ? "Chrome"
      : userAgent.includes("Firefox")
        ? "Firefox"
        : userAgent.includes("Safari")
          ? "Safari"
          : "Other";
    const body = await request.json().catch(() => ({}));
    const location = String(body?.timeZone || "Unknown").slice(0, 100);
    const device = /Mobi|Android/i.test(userAgent) ? "Mobile" : "Desktop";
    const batch = adminDb.batch();
    batch.set(target.company.ref.collection("ActivityLogs").doc(), {
      type: "user.login",
      actorId: token.uid,
      targetUserId: token.uid,
      targetEmployeeId: target.employee?.id || null,
      companyId: target.company.id,
      metadata: { device, browser, location },
      createdAt: FieldValue.serverTimestamp(),
    });
    if (target.employee) {
      batch.update(target.employee.ref, {
        "access.lastLoginAt": FieldValue.serverTimestamp(),
        "access.lastDevice": device,
        "access.lastBrowser": browser,
        "access.lastLocation": location,
      });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Session audit failed", { code: error?.code, message: error?.message });
    return NextResponse.json({ error: "AUDIT_UNAVAILABLE" }, { status: 500 });
  }
}
