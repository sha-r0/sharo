import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { createExpenseCreationService } from "@/lib/server/expenseCreationService";

export const expenseCreation = createExpenseCreationService(adminDb, () => FieldValue.serverTimestamp());
export function creationError(error) {
  const code = error?.message || "";
  const invalid = code.startsWith("INVALID_EXPENSE:");
  const status = code === "UNAUTHENTICATED" || error?.code?.startsWith("auth/") ? 401
    : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(code) ? 403
      : ["EMPLOYEE_PROFILE_REQUIRED", "SUBMISSION_CONFLICT", "EXPENSE_PERIOD_LOCKED"].includes(code) ? 409
        : invalid || error instanceof SyntaxError ? 400 : 500;
  const message = invalid ? code.slice("INVALID_EXPENSE: ".length)
    : code === "EMPLOYEE_PROFILE_REQUIRED" ? "An active employee profile linked to your login, with an employee ID and name, is required to submit expenses."
      : code === "SUBMISSION_CONFLICT" ? "This submission was already saved with different details. Check the expense list before starting a new expense."
        : code === "EXPENSE_PERIOD_LOCKED" ? error.message
        : ({ 401: "Please sign in again.", 403: "You do not have permission to create expenses.", 400: "Invalid request.", 500: "Unable to submit or load expenses. Please retry." })[status];
  return Response.json({ error: message }, { status });
}
