import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { assertExpenseMutationAuthorized, validateExpenseMutationInput } from "./expenseMutationPolicy";

function responseError(error) {
  const code = error?.message || "INTERNAL_ERROR";
  const status = code === "UNAUTHENTICATED" ? 401
    : code === "FORBIDDEN" ? 403
      : code === "EXPENSE_NOT_FOUND" ? 404
        : code === "INVALID_AMOUNT" || code === "INVALID_REQUEST" ? 400
          : 500;
  const publicCode = status === 500 ? "INTERNAL_ERROR" : code;
  return NextResponse.json({ error: publicCode }, { status });
}

async function employeeMirror(expensesRef, expense) {
  if (expense.employeeFirestoreId) return expensesRef.parent.collection("Usermanagement").doc(String(expense.employeeFirestoreId));
  if (!expense.employeeId) return null;
  const matches = await expensesRef.parent.collection("Usermanagement").where("employeeId", "==", expense.employeeId).limit(2).get();
  return matches.size === 1 ? matches.docs[0].ref : null;
}

export async function PATCH(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    const { expenseId } = await params;
    if (!expenseId || typeof expenseId !== "string") throw new Error("INVALID_REQUEST");
    const input = validateExpenseMutationInput(await request.json());
    const expensesRef = adminDb.collection("Companies").doc(context.companyId).collection("Expenses");
    const expenseRef = expensesRef.doc(expenseId);
    const expenseSnapshot = await expenseRef.get();
    if (!expenseSnapshot.exists) throw new Error("EXPENSE_NOT_FOUND");
    const expense = expenseSnapshot.data() || {};
    if (expense.companyId && expense.companyId !== context.companyId) throw new Error("FORBIDDEN");
    assertExpenseMutationAuthorized(context, input.action, expense);

    const actor = {
      uid: context.token.uid,
      employeeFirestoreId: context.employee?.id || null,
      role: context.isOwner ? "owner" : context.employee?.access?.roleId || "employee",
    };
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (input.action === "approve") {
      updates.status = "approved";
      updates.approvedAt = FieldValue.serverTimestamp();
      updates.approvedBy = actor;
    } else {
      updates.status = "rejected";
      updates.rejectedAt = FieldValue.serverTimestamp();
      updates.rejectedBy = actor;
    }

    const mirrorParent = await employeeMirror(expensesRef, expense);
    const mirrorRef = mirrorParent?.collection("Expenses").doc(expenseId) || null;
    const mirrorSnapshot = mirrorRef ? await mirrorRef.get() : null;
    const logRef = expensesRef.parent.collection("ActivityLogs").doc();
    const batch = adminDb.batch();
    batch.update(expenseRef, updates);
    if (mirrorSnapshot?.exists) batch.update(mirrorRef, updates);
    batch.set(logRef, {
      type: `expense.${input.action}`,
      actorId: context.token.uid,
      actorEmployeeId: context.employee?.id || null,
      targetExpenseId: expenseId,
      companyId: context.companyId,
      metadata: {},
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({ success: true, expenseId, action: input.action });
  } catch (error) {
    console.error("Expense mutation failed", { code: error?.message || "INTERNAL_ERROR" });
    return responseError(error);
  }
}
