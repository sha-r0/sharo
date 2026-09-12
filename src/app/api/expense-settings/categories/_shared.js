import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { createExpenseCategoryService } from "@/lib/server/expenseCategoryService";

export const categories = createExpenseCategoryService(adminDb, () => FieldValue.serverTimestamp());
export function categoryError(error) {
  const code = error?.message || "";
  const invalid = code.startsWith("INVALID_CATEGORY:");
  const status = code === "UNAUTHENTICATED" || error?.code?.startsWith("auth/") ? 401
    : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(code) ? 403
      : code === "CATEGORY_NOT_FOUND" ? 404 : code === "CATEGORY_NAME_EXISTS" ? 409
        : invalid || error instanceof SyntaxError ? 400 : 500;
  const message = invalid ? code.slice("INVALID_CATEGORY: ".length)
    : ({ 401: "Please sign in again.", 403: "You do not have permission to access Expense Setup.", 404: "Category not found.", 409: "A category with this name already exists.", 400: "Invalid request.", 500: "Unable to save or load categories. Please try again." })[status];
  return Response.json({ error: message }, { status });
}
