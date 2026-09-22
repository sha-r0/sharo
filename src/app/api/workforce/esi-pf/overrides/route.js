import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import { validateMonth } from "@/lib/esi-pf/compliance";
import { validateOverrideFields } from "@/lib/esi-pf/overrides";
import { PAYROLL_COLLECTION } from "@/lib/esi-pf/server";

export const runtime = "nodejs";
const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Authorization" } });

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "payroll.manage", "payroll.export");
    const body = await request.json();
    const month = validateMonth(body?.month);
    const payrollId = typeof body?.payrollId === "string" && body.payrollId && !body.payrollId.includes("/") ? body.payrollId : null;
    const scheme = body?.scheme === "esi" ? "esi" : body?.scheme === "pf" ? "pf" : null;
    if (!payrollId || !scheme) throw new Error("INVALID_OVERRIDE");
    const payrollRef = adminDb.collection("Companies").doc(context.companyId).collection(PAYROLL_COLLECTION).doc(payrollId);
    const logRef = adminDb.collection("Companies").doc(context.companyId).collection("ActivityLogs").doc();
    let saved;
    await adminDb.runTransaction(async (tx) => {
      const snapshot = await tx.get(payrollRef);
      if (!snapshot.exists) throw new Error("PAYROLL_NOT_FOUND");
      const payroll = snapshot.data() || {};
      if (payroll.companyId != null && payroll.companyId !== context.companyId) throw new Error("FORBIDDEN");
      if (payroll.month !== month || !["processed", "paid", "finalized"].includes(String(payroll.status || "").toLowerCase())) throw new Error("PAYROLL_NOT_FINALIZED");
      const stored = payroll.compliance?.[scheme] || {};
      const existing = payroll.statutoryOverrides?.fields?.[scheme] || {};
      const fields = validateOverrideFields(scheme, body.fields, stored, existing);
      const overrides = {
        version: 1, approved: true, month, companyId: context.companyId,
        fields: { ...(payroll.statutoryOverrides?.fields || {}), [scheme]: fields },
        updatedAt: FieldValue.serverTimestamp(), updatedByUid: context.uid,
        updatedByName: context.employeeName || context.company?.companyName || "Manager",
        updatedByRole: context.roleId || null,
      };
      tx.update(payrollRef, { statutoryOverrides: overrides });
      tx.set(logRef, {
        type: "payroll.statutory-override", action: "payroll.statutory-override",
        companyId: context.companyId, actorId: context.uid, actorName: overrides.updatedByName,
        targetPayrollId: payrollId, month, scheme, fields: Object.keys(body.fields || {}), createdAt: FieldValue.serverTimestamp(),
      });
      saved = { month, payrollId, scheme, fields };
    });
    return json({ ok: true, ...saved });
  } catch (error) {
    const code = String(error?.code || "").startsWith("auth/") ? "UNAUTHENTICATED" : error?.message;
    const statuses = { UNAUTHENTICATED: 401, FORBIDDEN: 403, COMPANY_INACTIVE: 403, INVALID_MONTH: 400, INVALID_OVERRIDE: 400, INVALID_OVERRIDE_FIELD: 400, INVALID_OVERRIDE_VALUE: 400, FROZEN_FIELD: 409, PAYROLL_NOT_FOUND: 404, PAYROLL_NOT_FINALIZED: 409 };
    return json({ error: statuses[code] ? code : "COMPLIANCE_OVERRIDE_FAILED" }, statuses[code] || 500);
  }
}
