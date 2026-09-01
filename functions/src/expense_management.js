"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const { FieldValue } = require("firebase-admin/firestore");
const { resolveCompanyActor } = require("./auth/CompanyActor");

const EDITABLE_FIELDS = new Set([
  "amount", "category", "description", "title", "date", "projectId", "projectName", "billUrl",
  "locationType", "travelFrom", "travelTo", "travelMode", "travelDistance", "vendorId", "vendorName",
  "labourName", "labourCount", "remarks", "travelDetails", "vendorDetails", "labourDetails",
  "expenseDate", "receiptUrl", "attachments", "quantity", "unit", "rate",
]);

function fail(stage, code, message, trace = {}) {
  logger.warn("[updateExpenseAuth]", { ...trace, permissionAllowed: false, failureStage: stage });
  throw new HttpsError(code, message);
}

function editableUpdates(data, trace) {
  const updates = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (key === "expenseId") continue;
    if (!EDITABLE_FIELDS.has(key)) fail("INVALID_EDIT_FIELD", "invalid-argument", `Expense field ${key} cannot be edited.`, trace);
    updates[key] = value;
  }
  if (!Object.keys(updates).length) fail("NO_EDIT_FIELDS", "invalid-argument", "No editable expense fields were supplied.", trace);
  if ("amount" in updates && (typeof updates.amount !== "number" || !Number.isFinite(updates.amount) || updates.amount < 0)) {
    fail("INVALID_AMOUNT", "invalid-argument", "Expense amount must be a finite non-negative number.", trace);
  }
  return updates;
}

async function resolveMirror(companyRef, expenseId, expense) {
  if (expense.employeeFirestoreId) return companyRef.collection("Usermanagement").doc(String(expense.employeeFirestoreId)).collection("Expenses").doc(expenseId);
  if (!expense.employeeId) return null;
  const matches = await companyRef.collection("Usermanagement").where("employeeId", "==", expense.employeeId).limit(2).get();
  return matches.size === 1 ? matches.docs[0].ref.collection("Expenses").doc(expenseId) : null;
}

function actorName(actor, company, auth) {
  return actor.isOwner
    ? String(company.ownerName || auth.token?.name || auth.token?.email || "Owner")
    : String(actor.employee?.personalInfo?.fullName || actor.employee?.fullName || auth.token?.name || "Manager");
}

async function updateExpenseCore(db, auth, data) {
  const expenseId = String(data?.expenseId || "").trim();
  const trace = {
    authenticated: Boolean(auth?.uid), uid: auth?.uid || null, expenseId: expenseId || null,
    resolvedCompanyId: null, companyFound: false, isCompanyOwner: false,
    membershipFound: false, resolvedRole: null, permissionAllowed: false,
  };
  if (!auth?.uid) fail("AUTH_REQUIRED", "unauthenticated", "Authentication is required.", trace);
  if (!expenseId) fail("EXPENSE_ID_REQUIRED", "invalid-argument", "Expense ID is required.", trace);

  let actor;
  try {
    actor = await resolveCompanyActor(db, auth);
  } catch (error) {
    fail(error?.message === "UNAUTHENTICATED" ? "AUTH_REQUIRED" : "COMPANY_RESOLUTION_FAILED", error?.message === "UNAUTHENTICATED" ? "unauthenticated" : "permission-denied", "Company membership could not be verified.", trace);
  }

  trace.resolvedCompanyId = actor.companyId;
  trace.isCompanyOwner = actor.isOwner;
  trace.membershipFound = actor.isOwner || Boolean(actor.employeeId);
  trace.resolvedRole = actor.isOwner ? "owner" : String(actor.employee?.access?.roleId || actor.employee?.employment?.role || "employee");
  const allowed = actor.isOwner || actor.permissions.includes("expense.edit") || actor.permissions.includes("expense.manage");
  if (!allowed) fail("EXPENSE_EDIT_PERMISSION_DENIED", "permission-denied", "Expense edit permission is required.", trace);
  trace.permissionAllowed = true;

  const companyRef = db.collection("Companies").doc(actor.companyId);
  const companySnapshot = await companyRef.get();
  if (!companySnapshot.exists) fail("COMPANY_NOT_FOUND", "not-found", "Company was not found.", trace);
  trace.companyFound = true;
  const company = companySnapshot.data() || {};
  if (actor.isOwner && company.ownerUid !== auth.uid) fail("OWNER_UID_MISMATCH", "permission-denied", "Company ownership could not be verified.", trace);

  const requestedUpdates = editableUpdates(data, trace);
  const expenseRef = companyRef.collection("Expenses").doc(expenseId);
  const initialExpense = await expenseRef.get();
  if (!initialExpense.exists) fail("EXPENSE_NOT_FOUND", "not-found", "Expense was not found.", trace);
  const mirrorRef = await resolveMirror(companyRef, expenseId, initialExpense.data() || {});
  if (!mirrorRef) fail("MEMBERSHIP_NOT_FOUND", "failed-precondition", "Expense employee mapping was not found.", trace);

  const historyRef = expenseRef.collection("EditHistory").doc();
  const activityRef = companyRef.collection("ActivityLogs").doc();
  const editorRole = actor.isOwner ? "owner" : trace.resolvedRole;
  const editorName = actorName(actor, company, auth);
  let response;

  await db.runTransaction(async (transaction) => {
    const [canonicalSnapshot, mirrorSnapshot] = await Promise.all([transaction.get(expenseRef), transaction.get(mirrorRef)]);
    if (!canonicalSnapshot.exists) fail("EXPENSE_NOT_FOUND", "not-found", "Expense was not found.", trace);
    if (!mirrorSnapshot.exists) fail("EXPENSE_MIRROR_NOT_FOUND", "failed-precondition", "Expense mirror was not found.", trace);
    const before = canonicalSnapshot.data() || {};
    const changedFields = Object.keys(requestedUpdates).filter((key) => {
      const left = before[key]; const right = requestedUpdates[key];
      if (left?.isEqual && typeof left.isEqual === "function") return !left.isEqual(right);
      return JSON.stringify(left ?? null) !== JSON.stringify(right ?? null);
    });
    if (!changedFields.length) fail("NO_CHANGES", "failed-precondition", "The expense already contains these values.", trace);

    const editCount = Number(before.editCount || 0) + 1;
    const audit = {
      editCount,
      lastEditedAt: FieldValue.serverTimestamp(),
      lastEditedByUid: auth.uid,
      lastEditedByName: editorName,
      lastEditedByRole: editorRole,
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (changedFields.includes("amount")) {
      audit.lastEditPreviousAmount = Number(before.amount || 0);
      audit.lastEditNewAmount = requestedUpdates.amount;
    }
    const writes = { ...requestedUpdates, ...audit };
    transaction.update(expenseRef, writes);
    transaction.update(mirrorRef, writes);
    transaction.create(historyRef, {
      auditVersion: 2, expenseId, companyId: actor.companyId, editNumber: editCount,
      editedAt: FieldValue.serverTimestamp(), editedByUid: auth.uid, editedByName: editorName,
      editedByRole: editorRole, changedFields,
      before: Object.fromEntries(changedFields.map((key) => [key, before[key] ?? null])),
      after: Object.fromEntries(changedFields.map((key) => [key, requestedUpdates[key] ?? null])),
    });
    transaction.create(activityRef, {
      type: "expense.updated", companyId: actor.companyId, actorId: auth.uid,
      actorEmployeeId: actor.employeeId || null, targetExpenseId: expenseId,
      metadata: { changedFields, editCount }, createdAt: FieldValue.serverTimestamp(),
    });
    response = { ok: true, expenseId, editCount, changedFields, auditVersion: 2 };
  });

  logger.info("[updateExpenseAuth]", { ...trace, companyFound: true, permissionAllowed: true, failureStage: null });
  return response;
}

function createUpdateExpense(db) {
  return onCall({ region: "us-central1", timeoutSeconds: 60 }, (request) => updateExpenseCore(db, request.auth, request.data));
}

module.exports = { EDITABLE_FIELDS, createUpdateExpense, editableUpdates, updateExpenseCore };
