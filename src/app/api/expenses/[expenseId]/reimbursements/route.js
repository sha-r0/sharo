import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { recordReimbursement } from "@/lib/server/expenseReimbursementService";

export async function POST(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    const { expenseId } = await params;
    return Response.json(await recordReimbursement(adminDb, context, expenseId, await request.json(), FieldValue));
  } catch (error) {
    const code = error.message || "INTERNAL_ERROR";
    const status = code === "UNAUTHENTICATED" || String(error.code || "").startsWith("auth/") ? 401
      : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(code) ? 403
      : code === "EXPENSE_NOT_FOUND" ? 404
      : ["NOT_REIMBURSABLE", "LEGACY_PAID", "OVERPAYMENT", "RECONCILIATION_REQUIRED", "EMPLOYEE_MAPPING_REQUIRED", "SUBMISSION_CONFLICT"].includes(code) ? 409
      : code.startsWith("INVALID") || error instanceof SyntaxError ? 400 : 500;
    return Response.json({ error: status === 500 ? "Unable to record reimbursement." : code }, { status });
  }
}
