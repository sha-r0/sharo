"use strict";

const { resolveTravelRoute } = require("./travelRoute");
const { calculateExpensePolicy } = require("./creationPolicy");
const { assertExpensePeriodOpen } = require("./period");
const EDITABLE_FIELDS = new Set(["amount", "categoryId", "category", "description", "title", "date", "projectFirestoreId", "projectId", "projectName", "billUrl", "locationType", "gstType", "quantity", "travelFrom", "travelTo", "travelMode", "travelDistance", "vendorId", "vendorName", "labourName", "labourCount", "remarks", "travelDetails", "vendorDetails", "labourDetails", "expenseDate", "receiptUrl", "attachments", "unit", "rate"]);
const POLICY_FIELDS = ["allowedAmount", "policyExceeded", "excessAmount", "configuredRate", "configuredLimit", "ruleId", "ruleBasis", "calculationType", "locationType", "gstType", "quantity"];
const has = (actor, permission) => actor.isOwner || actor.permissions?.includes(permission) || actor.permissions?.includes("expense.manage");
const normalEmployee = (actor) => !actor.isOwner && String(actor.employee?.access?.roleId || actor.employee?.employment?.role || "employee").toLowerCase() === "employee";
const owns = (actor, expense) => expense.employeeFirestoreId ? String(expense.employeeFirestoreId) === String(actor.employee?.id) : Boolean(expense.employeeId) && String(expense.employeeId) === String(actor.employee?.employeeId || actor.employee?.login?.employeeId || "");
function assertAuthorized(actor, action, expense) {
  if (["approve", "reject"].includes(action)) {
    if (!has(actor, "expense.approve") || normalEmployee(actor)) throw new Error("FORBIDDEN");
    if (expense.status !== "pending") throw new Error("EXPENSE_FINAL");
  } else {
    const permission = action === "delete" ? "expense.delete" : "expense.edit";
    const employeeDelete = action === "delete" && normalEmployee(actor) && has(actor, "expense.create");
    if (!has(actor, permission) && !employeeDelete) throw new Error("FORBIDDEN");
    if (normalEmployee(actor) && (!owns(actor, expense) || expense.status !== "pending")) throw new Error("FORBIDDEN");
  }
}
function editableUpdates(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_REQUEST");
  const updates = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "expenseId") continue;
    if (!EDITABLE_FIELDS.has(key)) throw new Error("INVALID_REQUEST");
    updates[key] = value;
  }
  if (!Object.keys(updates).length) throw new Error("INVALID_REQUEST");
  if ("amount" in updates && (typeof updates.amount !== "number" || !Number.isFinite(updates.amount) || updates.amount < 0)) throw new Error("INVALID_AMOUNT");
  if ("billUrl" in updates) {
    if (typeof updates.billUrl !== "string" || updates.billUrl.length > 2048) throw new Error("INVALID_REQUEST");
    if (updates.billUrl) {
      let url; try { url = new URL(updates.billUrl); } catch { throw new Error("INVALID_REQUEST"); }
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("INVALID_REQUEST");
    }
  }
  if ("date" in updates && (typeof updates.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(updates.date) || !Number.isFinite(Date.parse(updates.date)) || new Date(updates.date).toISOString().slice(0, 10) !== updates.date)) throw new Error("INVALID_REQUEST");
  return updates;
}

async function recompute(transaction, company, before, updates) {
  const after = { ...before, ...updates };
  if (["projectId", "projectFirestoreId", "projectName"].some((key) => key in updates)) {
    let project;
    const key = updates.projectFirestoreId || updates.projectId || before.projectFirestoreId || before.projectId;
    if (typeof key !== "string" || !key || key.includes("/")) throw new Error("INVALID_PROJECT");
    project = await transaction.get(company.collection("Projectmanagement").doc(key));
    if (!project.exists) {
      const matches = await transaction.get(company.collection("Projectmanagement").where("projectId", "==", key).limit(2));
      if (matches.size !== 1) throw new Error("INVALID_PROJECT");
      project = matches.docs[0];
    }
    if (project.data().companyId && project.data().companyId !== company.id) throw new Error("FORBIDDEN");
    Object.assign(after, { projectFirestoreId: project.id, projectId: project.data().projectId || project.id, projectName: project.data().projectName || "" });
  }
  if ("date" in updates) Object.assign(after, { month: Number(after.date.slice(5, 7)), year: Number(after.date.slice(0, 4)) });
  const policyChanged = ['amount', 'categoryId', 'category', 'locationType', 'gstType', 'quantity', 'projectId', 'projectFirestoreId', 'projectName'].some((key) => key in updates);
  if (!policyChanged && !['travelFrom', 'travelTo'].some((key) => key in updates)) return after;
  if ("categoryId" in updates && (typeof updates.categoryId !== "string" || !updates.categoryId || updates.categoryId.includes("/"))) throw new Error("INVALID_CATEGORY");
  let categoryId = after.categoryId;
  if ("category" in updates && !("categoryId" in updates)) {
    if (typeof updates.category !== "string" || !updates.category.trim()) throw new Error("INVALID_CATEGORY");
    const matches = await transaction.get(company.collection("ExpenseCategories").where("name", "==", updates.category.trim()).limit(2));
    if (matches.size !== 1) throw new Error("INVALID_CATEGORY");
    categoryId = matches.docs[0].id;
  }
  if (!categoryId) {
    if (["travelFrom", "travelTo"].some((key) => key in updates)) {
      const route = resolveTravelRoute({ name: before.categoryName || before.category }, after);
      delete after.travelFrom; delete after.travelTo; Object.assign(after, route);
    }
    // Unconfigured legacy records retain their absence of policy limits.
    if (["locationType", "gstType", "quantity"].some((key) => key in updates)) throw new Error("INVALID_CATEGORY");
    if (typeof before.allowedAmount === "number" && Number.isFinite(before.allowedAmount)) {
      after.excessAmount = Math.round(Math.max(0, after.amount - before.allowedAmount) * 100) / 100;
      after.policyExceeded = after.excessAmount > 0;
    }
    return after;
  }
  const snapshot = await transaction.get(company.collection("ExpenseCategories").doc(categoryId));
  if (!snapshot.exists) throw new Error("INVALID_CATEGORY");
  const category = snapshot.data();
  if (!policyChanged) {
    if (category.active !== true) throw new Error("INVALID_CATEGORY");
    const route = resolveTravelRoute(category, after);
    delete after.travelFrom; delete after.travelTo;
    return { ...after, ...route };
  }
  const selection = { amount: after.amount };
  if (category.conditions?.locationEnabled) selection.locationType = after.locationType;
  if (category.conditions?.gstEnabled) selection.gstType = after.gstType;
  if (category.calculationType === "per_unit") selection.quantity = after.quantity;
  let policy;
  try { policy = calculateExpensePolicy(category, selection); } catch (error) { throw new Error(`INVALID_POLICY: ${error.message.replace(/^INVALID_EXPENSE: /, "")}`); }
  const route = resolveTravelRoute(category, after);
  delete after.travelFrom; delete after.travelTo;
  Object.assign(after, route);
  POLICY_FIELDS.forEach((field) => { delete after[field]; });
  return { ...after, ...policy, categoryId, category: category.name, categoryName: category.name };
}

async function mutateExpense(db, actor, expenseId, action, input, fields) {
  if (typeof expenseId !== "string" || !expenseId || expenseId.includes("/")) throw new Error("INVALID_REQUEST");
  if (!["approve", "reject", "edit", "delete"].includes(action)) throw new Error("INVALID_REQUEST");
  if (action === "reject" && (typeof input.managerRemarks !== "string" || !input.managerRemarks.trim() || input.managerRemarks.length > 2000)) throw new Error("REASON_REQUIRED");
  const updates = action === "edit" ? editableUpdates(input) : {};
  const company = db.collection("Companies").doc(actor.companyId);
  const ref = company.collection("Expenses").doc(expenseId);
  const activity = company.collection("ActivityLogs").doc();
  const history = ref.collection("EditHistory").doc();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error("EXPENSE_NOT_FOUND");
    const before = snapshot.data();
    if (before.companyId && before.companyId !== actor.companyId) throw new Error("FORBIDDEN");
    assertAuthorized(actor, action, before);
    if (action === "edit" || action === "delete") {
      await assertExpensePeriodOpen(transaction, company, before.date || before.expenseDate);
      if (action === "edit" && updates.date) await assertExpensePeriodOpen(transaction, company, updates.date);
    }
    if (action === "delete" || (action === "edit" && "amount" in updates && Number(updates.amount) !== Number(before.amount))) {
      const payments = await transaction.get(ref.collection("Reimbursements").limit(1));
      if (!payments.empty || before.reimbursed === true || Number(before.reimbursedAmount) > 0) throw new Error("REIMBURSEMENT_LOCKED");
    }
    let employeeRef;
    if (before.employeeFirestoreId) employeeRef = company.collection("Usermanagement").doc(String(before.employeeFirestoreId));
    else if (before.employeeId) {
      const matches = await transaction.get(company.collection("Usermanagement").where("employeeId", "==", before.employeeId).limit(2));
      if (matches.size === 1) employeeRef = matches.docs[0].ref;
    }
    if (!employeeRef || !(await transaction.get(employeeRef)).exists) throw new Error("EMPLOYEE_MAPPING_REQUIRED");
    const mirror = employeeRef.collection("Expenses").doc(expenseId);
    const reviewer = { uid: actor.uid, employeeFirestoreId: actor.employee?.id || null, role: actor.isOwner ? "owner" : actor.employee?.access?.roleId || "employee", name: actor.name || actor.employee?.personalInfo?.fullName || "" };
    let after = { ...before };
    let metadata = {};
    if (action === "edit") {
      after = await recompute(transaction, company, before, updates);
      const changedFields = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((key) => JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null));
      if (!changedFields.length) throw new Error("NO_CHANGES");
      const editCount = Number(before.editCount || 0) + 1;
      Object.assign(after, { editCount, lastEditedAt: fields.serverTimestamp(), lastEditedByUid: actor.uid, lastEditedByName: reviewer.name, lastEditedByRole: reviewer.role });
      if (changedFields.includes("amount")) Object.assign(after, { lastEditPreviousAmount: Number(before.amount || 0), lastEditNewAmount: after.amount });
      transaction.create(history, { auditVersion: 2, expenseId, companyId: actor.companyId, editNumber: editCount, editedAt: fields.serverTimestamp(), editedByUid: actor.uid, editedByName: reviewer.name, editedByRole: reviewer.role, changedFields, before: Object.fromEntries(changedFields.map((key) => [key, before[key] ?? null])), after: Object.fromEntries(changedFields.map((key) => [key, after[key] ?? null])) });
      metadata = { changedFields, editCount };
    } else if (action !== "delete") {
      ["approvedBy", "approvedAt", "rejectedBy", "rejectedAt", "managerRemarks", "reviewedBy", "reviewedAt", "reviewedByUid", "reviewedByName", "reviewedByRole"].forEach((key) => { delete after[key]; });
      Object.assign(after, { status: action === "approve" ? "approved" : "rejected", reviewedBy: reviewer, reviewedAt: fields.serverTimestamp(), reviewedByUid: reviewer.uid, reviewedByName: reviewer.name, reviewedByRole: reviewer.role });
      if (action === "approve") Object.assign(after, { approvedBy: reviewer, approvedAt: fields.serverTimestamp() });
      else Object.assign(after, { rejectedBy: reviewer, rejectedAt: fields.serverTimestamp(), managerRemarks: input.managerRemarks.trim() });
    }
    if (action === "delete") {
      transaction.delete(ref); transaction.delete(mirror);
      metadata = { deletedExpense: before };
    } else {
      after.updatedAt = fields.serverTimestamp();
      // Replace both copies from the canonical snapshot, repairing missing/stale mirrors.
      transaction.set(ref, after); transaction.set(mirror, after);
    }
    transaction.create(activity, { type: `expense.${action === "edit" ? "updated" : action === "delete" ? "deleted" : action}`, actorId: actor.uid, actorEmployeeId: actor.employee?.id || null, targetExpenseId: expenseId, companyId: actor.companyId, metadata, createdAt: fields.serverTimestamp() });
    return { success: true, ok: true, expenseId, action, ...(action === "edit" ? { ...metadata, auditVersion: 2 } : {}) };
  });
}
module.exports = { mutateExpense, assertAuthorized, editableUpdates, EDITABLE_FIELDS };
