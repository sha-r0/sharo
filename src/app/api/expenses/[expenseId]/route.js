import { getExpense } from "@/lib/server/expensePageService";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import lifecycle from "../../../../../functions/src/expense/lifecycle.js";
import { validateExpenseMutationInput } from "./expenseMutationPolicy";

function responseError(error) {
  const code = error?.message || "INTERNAL_ERROR";
  const status = code === "UNAUTHENTICATED" || String(error?.code || "").startsWith("auth/") ? 401
    : code === "FORBIDDEN" || code === "COMPANY_INACTIVE" ? 403
      : code === "EXPENSE_NOT_FOUND" ? 404
        : ["EXPENSE_FINAL", "EMPLOYEE_MAPPING_REQUIRED", "NO_CHANGES", "REIMBURSEMENT_LOCKED", "EXPENSE_PERIOD_LOCKED"].includes(code) ? 409
          : code.startsWith("INVALID") || code === "REASON_REQUIRED" || error instanceof SyntaxError ? 400 : 500;
  const message = code === "EXPENSE_PERIOD_LOCKED" ? "This expense belongs to a locked period and cannot be edited or deleted." : status === 500 ? "INTERNAL_ERROR" : code;
  return Response.json({ error: message, code }, { status });
}
async function mutation(request, params, action) {
  try {
    const context = await authorizeCompanyRequest(request);
    const { expenseId } = await params;
    const input = action === "delete" ? {} : validateExpenseMutationInput(await request.json());
    const actor = { ...context, uid: context.token.uid, name: context.isOwner ? context.company?.ownerName || context.token.name || "Owner" : context.employee?.personalInfo?.fullName || "" };
    return Response.json(await lifecycle.mutateExpense(adminDb, actor, expenseId, action || input.action, input, FieldValue));
  } catch (error) { return responseError(error); }
}
export async function PATCH(request, { params }) { return mutation(request, params); }
export async function DELETE(request, { params }) { return mutation(request, params, "delete"); }

export async function GET(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    const { expenseId } = await params;
    return Response.json({ expense: await getExpense(adminDb, context, expenseId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return responseError(error); }
}
