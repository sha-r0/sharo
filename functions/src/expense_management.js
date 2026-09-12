"use strict";
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("./auth/CompanyActor");
const { mutateExpense, editableUpdates, EDITABLE_FIELDS } = require("./expense/lifecycle");

async function updateExpenseCore(db, auth, data) {
  try {
    const actor = await resolveCompanyActor(db, auth);
    const company = await db.collection("Companies").doc(actor.companyId).get();
    if (String(company.data()?.serviceStatus || "active").toLowerCase() !== "active") throw new Error("FORBIDDEN");
    const context = { ...actor, employee: actor.employee ? { ...actor.employee, id: actor.employeeId } : null,
      name: actor.isOwner ? company.data()?.ownerName || auth.token?.name || "Owner" : actor.employee?.personalInfo?.fullName || "Manager" };
    return await mutateExpense(db, context, data?.expenseId, "edit", data, FieldValue);
  } catch (error) {
    const message = error.message || "INTERNAL_ERROR";
    const code = message === "UNAUTHENTICATED" ? "unauthenticated" : message === "FORBIDDEN" ? "permission-denied"
      : message === "EXPENSE_NOT_FOUND" ? "not-found" : ["EXPENSE_FINAL", "EMPLOYEE_MAPPING_REQUIRED", "NO_CHANGES", "REIMBURSEMENT_LOCKED"].includes(message) ? "failed-precondition"
        : message.startsWith("INVALID") ? "invalid-argument" : "internal";
    throw new HttpsError(code, code === "internal" ? "Unable to update expense." : message);
  }
}
function createUpdateExpense(db) {
  return onCall({ region: "us-central1", timeoutSeconds: 60 }, (request) => updateExpenseCore(db, request.auth, request.data));
}
module.exports = { EDITABLE_FIELDS, editableUpdates, updateExpenseCore, createUpdateExpense };
