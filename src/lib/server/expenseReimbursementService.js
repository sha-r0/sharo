import { validateReimbursement } from "../expenses/reimbursementInput.js";
import { deriveReimbursement } from "./expenseReimbursement.js";
import { requireCompanyPermission } from "./companyPermission.js";

export async function recordReimbursement(db, context, expenseId, body, fields) {
  requireCompanyPermission(context, "expense.manage");
  const role = context.isOwner ? "owner" : String(context.employee?.access?.roleId || context.employee?.employment?.role || "employee").toLowerCase();
  if (role === "employee") throw new Error("FORBIDDEN");
  if (typeof expenseId !== "string" || !expenseId || expenseId.includes("/")) throw new Error("INVALID_REQUEST");
  const input = validateReimbursement(body);
  const { requestId, ...payment } = input;
  const company = db.collection("Companies").doc(context.companyId);
  const expenseRef = company.collection("Expenses").doc(expenseId);
  const recordRef = expenseRef.collection("Reimbursements").doc(requestId);
  const actor = { uid: context.token.uid, role, name: context.isOwner ? context.company?.ownerName || context.token.name || "Owner" : context.employee?.personalInfo?.fullName || "" };
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(expenseRef);
    if (!snapshot.exists) throw new Error("EXPENSE_NOT_FOUND");
    const expense = snapshot.data();
    if (expense.companyId && expense.companyId !== context.companyId) throw new Error("FORBIDDEN");
    const history = await transaction.get(expenseRef.collection("Reimbursements"));
    const records = history.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    const existing = records.find((record) => record.id === requestId);
    if (existing) {
      if (existing.createdBy?.uid !== actor.uid || Object.entries(payment).some(([key, value]) => existing[key] !== value)) throw new Error("SUBMISSION_CONFLICT");
      return { success: true, duplicate: true, reimbursement: deriveReimbursement(expense, records) };
    }
    if (expense.status !== "approved" || expense.reimbursable === false || expense.reimbursementStatus === "not_applicable") throw new Error("NOT_REIMBURSABLE");
    if (expense.reimbursed === true) throw new Error("LEGACY_PAID");
    const state = deriveReimbursement(expense, records);
    if (state.reconciliationRequired) throw new Error("RECONCILIATION_REQUIRED");
    if (Math.round(payment.amount * 100) > Math.round(state.outstandingAmount * 100)) throw new Error("OVERPAYMENT");
    let employeeRef;
    if (expense.employeeFirestoreId) employeeRef = company.collection("Usermanagement").doc(String(expense.employeeFirestoreId));
    else if (expense.employeeId) {
      const matches = await transaction.get(company.collection("Usermanagement").where("employeeId", "==", expense.employeeId).limit(2));
      if (matches.size === 1) employeeRef = matches.docs[0].ref;
    }
    if (!employeeRef || !(await transaction.get(employeeRef)).exists) throw new Error("EMPLOYEE_MAPPING_REQUIRED");
    const record = { id: requestId, ...payment, companyId: context.companyId, expenseId, createdBy: actor, createdAt: fields.serverTimestamp() };
    const next = deriveReimbursement({ ...expense, reimbursementLedgerVersion: 1 }, [...records, record]);
    const updated = { ...expense, ...next, reimbursementLedgerVersion: 1, reimbursedAt: fields.serverTimestamp(), reimbursedBy: actor, updatedAt: fields.serverTimestamp() };
    transaction.create(recordRef, record);
    // Writing the canonical expense serializes competing payments and expense edits.
    transaction.set(expenseRef, updated);
    transaction.set(employeeRef.collection("Expenses").doc(expenseId), updated);
    transaction.create(company.collection("ActivityLogs").doc(), { type: "expense_reimbursement_recorded", targetExpenseId: expenseId, actorId: actor.uid, actor, companyId: context.companyId, metadata: { expenseId, reimbursementId: requestId, amount: payment.amount }, createdAt: fields.serverTimestamp() });
    return { success: true, reimbursement: next };
  });
}
