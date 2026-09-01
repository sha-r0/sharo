import { auth, db, usCentralFunctions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

const updateExpenseCallable = httpsCallable(usCentralFunctions, "updateExpense");

async function reviewExpense(expenseId, payload) {
  if (!expenseId) throw new Error("Expense information is unavailable.");
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`/api/expenses/${encodeURIComponent(expenseId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (response.ok) return response.json();
  const result = await response.json().catch(() => ({}));
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
    if (error?.code === "functions/invalid-argument") throw new Error("Please enter a valid amount.");
    throw new Error("Unable to update expense. Please try again.");
  }
}

const expenseService = {
  /* ==========================================
      Get All Expenses
  ========================================== */

  async getExpenses(companyId, employeeId = null) {
    if (!companyId) {
      throw new Error("Company ID is required.");
    }

    const expenses = collection(
        db,
        "Companies",
        companyId,
        "Expenses",
      );
    const source = employeeId
      ? query(expenses, where("employeeId", "==", employeeId))
      : expenses;
    const snap = await getDocs(source);

    return snap.docs.map((expenseDoc) => ({
      id: expenseDoc.id,
      ...expenseDoc.data(),
    }));
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

  async rejectExpense(expenseId) {
    return reviewExpense(expenseId, { action: "reject" });
  },

  /* ==========================================
      Update Expense Amount
  ========================================== */

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
