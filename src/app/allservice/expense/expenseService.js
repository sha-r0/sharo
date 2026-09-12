import { auth, usCentralFunctions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

const updateExpenseCallable = httpsCallable(usCentralFunctions, "updateExpense");

async function reviewExpense(expenseId, payload, method = "PATCH") {
  if (!expenseId) throw new Error("Expense information is unavailable.");
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  if (response.ok) return response.json();
  const result = await response.json().catch(() => ({}));
  const errors = { REIMBURSEMENT_LOCKED: "Recorded reimbursements prevent amount changes or deletion. A controlled correction workflow is required.", EXPENSE_FINAL: "This expense has already been decided. Refresh the list.", REASON_REQUIRED: "Enter a rejection reason.", EMPLOYEE_MAPPING_REQUIRED: "The expense needs a valid employee mapping before it can be changed.", NO_CHANGES: "No changes were made." };
  if (errors[result.error]) throw new Error(errors[result.error]);
  if (response.status === 403) throw new Error("You don't have permission to edit this expense.");
  if (result.error === "INVALID_AMOUNT") throw new Error("Please enter a valid amount.");
  if (response.status === 404) throw new Error("This expense no longer exists.");
  throw new Error("Unable to update expense. Please try again.");
}

async function updateExpenseContent(expenseId, editableFields) {
  if (!expenseId) throw new Error("Expense information is unavailable.");
  if (!auth.currentUser) throw new Error("Please sign in again.");
  if (process.env.NODE_ENV === "development") console.info("[ManagerExpenseWeb]", {
    firebaseUid: auth.currentUser.uid,
    firebaseEmail: auth.currentUser.email || null,
    callable: "updateExpense",
    region: "us-central1",
    projectId: auth.app.options.projectId,
  });
  try {
    const response = await updateExpenseCallable({ expenseId, ...editableFields });
    if (process.env.NODE_ENV === "development") console.info("[ManagerExpenseWeb] callableResponse=success");
    return response.data;
  } catch (error) {
    if (process.env.NODE_ENV === "development") console.error("[ManagerExpenseWeb] updateExpense failed", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      name: error?.name,
    });
    if (error?.code === "functions/permission-denied") throw new Error("You don't have permission to edit this expense.");
    if (error?.code === "functions/unauthenticated") throw new Error("Please sign in again.");
    if (error?.code === "functions/invalid-argument") throw new Error(error.message?.startsWith("INVALID_POLICY:") ? error.message.slice(16) : "Invalid expense fields or amount.");
    if (error?.message === "REIMBURSEMENT_LOCKED") throw new Error("Recorded reimbursements prevent amount changes. A controlled correction workflow is required.");
    if (error?.code === "functions/failed-precondition") throw new Error(error.message === "NO_CHANGES" ? "No changes were made." : "Expense cannot be edited. Check its status and employee mapping.");
    throw new Error("Unable to update expense. Please try again.");
  }
}

const expenseService = {
  /* ==========================================
      Get All Expenses
  ========================================== */

  async getExpenses() {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Please sign in again.");
    const response = await fetch("/api/expenses", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || "Unable to load expenses."), { code: result.code || `http-${response.status}`, path: result.path || "/api/expenses", operation: result.operation || "GET", query: result.query || "" });
    return result.expenses;
  },

  /* ==========================================
      Approve Expense
  ========================================== */

  async approveExpense(expenseId) {
    return reviewExpense(expenseId, { action: "approve" });
  },

  /* ==========================================
      Reject Expense
  ========================================== */

  async rejectExpense(expenseId, managerRemarks) {
    return reviewExpense(expenseId, { action: "reject", managerRemarks });
  },

  /* ==========================================
      Update Expense Amount
  ========================================== */

  async deleteExpense(expenseId) {
    return reviewExpense(expenseId, null, "DELETE");
  },

  async updateContent(expenseId, fields) {
    return updateExpenseContent(expenseId, fields);
  },

  async updateAmount(expenseId, amount) {
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount < 0
    ) {
      throw new Error(
        "Enter a valid expense amount.",
      );
    }

    return updateExpenseContent(expenseId, { amount: numericAmount });
  },
};

export default expenseService;
