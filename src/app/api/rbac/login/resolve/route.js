import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { buildEmployeeLoginEmail, employeeMatchesIdentifier, isActiveEmployee, normalizeCorporateId, normalizeEmployeeId, resolveEmployeeAuthUid } from "@/app/allservice/rbac/employeeAuth";

const invalid = () => NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
async function log(companyId, type, targetUserId, metadata = {}) {
  if (!companyId) return;
  await adminDb.collection("Companies").doc(companyId).collection("ActivityLogs").add({ type, actorId: null, targetUserId: targetUserId || null, companyId, metadata, createdAt: FieldValue.serverTimestamp() }).catch(() => {});
}

export async function POST(request) {
  try {
    const body = await request.json();
    const corporateId = normalizeCorporateId(body.corporateId);
    const employeeId = normalizeEmployeeId(body.employeeId);
    if (!corporateId || !employeeId) return invalid();

    let companies = await adminDb.collection("Companies").where("corporateId", "==", corporateId).limit(1).get();
    if (companies.empty) companies = await adminDb.collection("Companies").where("companyCode", "==", corporateId).limit(1).get();
    if (companies.empty) return invalid();
    const companyDoc = companies.docs[0];
    const company = companyDoc.data() || {};
    if (String(company.serviceStatus || "active").trim().toLowerCase() !== "active") {
      await log(companyDoc.id, "employee.login-failed", null, { reason: "company-inactive" });
      return NextResponse.json({ error: "COMPANY_INACTIVE" }, { status: 403 });
    }

    const employeesRef = companyDoc.ref.collection("Usermanagement");
    const employees = await employeesRef.get();
    const matches = employees.docs.filter((document) => employeeMatchesIdentifier(document.data(), employeeId));
    if (!matches.length) { await log(companyDoc.id, "employee.login-failed", null, { reason: "invalid-identifier" }); return invalid(); }
    if (matches.length > 1) {
      await log(companyDoc.id, "employee.login-failed", null, { reason: "ambiguous-employee-id", candidateCount: matches.length });
      return NextResponse.json({ error: "EMPLOYEE_ID_AMBIGUOUS" }, { status: 409 });
    }
    const employeeDoc = matches[0];
    const employee = employeeDoc.data() || {};
    if (!isActiveEmployee(employee)) {
      await log(companyDoc.id, "employee.login-disabled", employeeDoc.id, { reason: "account-disabled" });
      return NextResponse.json({ error: "LOGIN_DISABLED" }, { status: 403 });
    }

    const storedEmployeeId = normalizeEmployeeId(employee.employeeId || employee.login?.employeeId);
    const loginEmail = employee.login?.loginEmail || buildEmployeeLoginEmail(company.corporateId || company.companyCode, storedEmployeeId);
    return NextResponse.json({ loginEmail, expectedAuthUid: resolveEmployeeAuthUid(employee), companyId: companyDoc.id, employeeFirestoreId: employeeDoc.id });
  } catch (error) {
    console.error("Employee login resolution failed:", error);
    return invalid();
  }
}
