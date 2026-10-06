"use strict";

const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { authorizeDecision, validateAmount } = require("./AdvancePolicy");
const { clean, resolveCompanyActor } = require("../auth/CompanyActor");

const { listEmployees } = require("./EmployeeDirectory");

const employeeName = (data) => data.personalInfo?.fullName || data.fullName || data.name || "Unnamed employee";

async function getAdvanceReferenceData(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  if (request.data && Object.keys(request.data).length) throw new Error("INVALID_REFERENCE_INPUT");
  const companyRef = db.collection("Companies").doc(actor.companyId);
  const projectSnapshot = await companyRef.collection("Projectmanagement").get();
  const projects = projectSnapshot.docs.map((snapshot) => {
    const project = snapshot.data() || {};
    return { id: snapshot.id, projectName: project.projectName || project.name || "Unnamed project" };
  });
  return { companyId: actor.companyId, employees: await listEmployees(companyRef, actor), projects };
}

function asTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
}

function requestPayload(input, actor, employeeSnapshot) {
  const employee = employeeSnapshot.data() || {};
  const amount = validateAmount(input.amount);
  const advanceType = clean(input.advanceType || "Personal");
  const monthlyDeduction = Number(input.monthlyDeduction || 0);
  if (advanceType === "Personal" && (!Number.isFinite(monthlyDeduction) || monthlyDeduction <= 0 || monthlyDeduction > amount)) {
    throw new Error("INVALID_MONTHLY_DEDUCTION");
  }
  if (advanceType === "Company" && (!clean(input.projectId) || !clean(input.purpose))) {
    throw new Error("INVALID_COMPANY_ADVANCE");
  }

  const months = advanceType === "Personal" ? Math.ceil(amount / monthlyDeduction) : 0;
  const firstDeductionDate = asTimestamp(input.firstDeductionDate);
  if (advanceType === "Personal" && !firstDeductionDate) throw new Error("INVALID_FIRST_DEDUCTION_DATE");
  const expectedCompletion = firstDeductionDate && months
    ? Timestamp.fromDate(new Date(firstDeductionDate.toDate().getFullYear(), firstDeductionDate.toDate().getMonth() + months, firstDeductionDate.toDate().getDate()))
    : null;

  return {
    companyId: actor.companyId,
    employeeFirestoreId: employeeSnapshot.id,
    employeeId: employee.employeeId || employee.login?.employeeId || "",
    employeeName: employeeName(employee),
    employeePhotoUrl: employee.personalInfo?.photoUrl || employee.photoUrl || "",
    department: employee.employment?.department || employee.department || "",
    designation: employee.employment?.designation || employee.designation || "",
    advanceType,
    amount,
    monthlyDeduction: advanceType === "Personal" ? monthlyDeduction : 0,
    months,
    interest: 0,
    remainingAmount: amount,
    settledAmount: 0,
    repaymentMethod: advanceType === "Personal" ? "Salary Deduction" : "Expense Settlement",
    firstDeductionDate,
    expectedCompletion,
    reason: clean(input.reason),
    projectId: advanceType === "Company" ? clean(input.projectId) : "",
    projectName: advanceType === "Company" ? clean(input.projectName) : "",
    purpose: advanceType === "Company" ? clean(input.purpose) : "",
    requiredDate: asTimestamp(input.requiredDate),
    description: clean(input.description),
    priority: clean(input.priority || "Normal"),
    managerRemarks: "",
    status: "Pending",
    approvedBy: null,
    approvedAt: null,
    payoutStatus: "NOT_INITIATED",
  };
}

async function createAdvanceRequest(db, request) {
  const {createAdvanceRequestCore} = require('./CreateAdvanceRequest');
  return createAdvanceRequestCore({firestore: db, fieldValue: FieldValue, uid: request.auth?.uid, auth: request.auth, data: request.data});
}

async function decideAdvance(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const advanceId = clean(request.data?.advanceId);
  const action = clean(request.data?.action);
  if (!advanceId || !action) throw new Error("INVALID_ARGUMENT");

  const companyRef = db.collection("Companies").doc(actor.companyId);
  const advanceRef = companyRef.collection("advance_requests").doc(advanceId);
  const auditRef = companyRef.collection("ActivityLogs").doc(`advance-decision-${advanceId}`);

  return db.runTransaction(async (transaction) => {
    const advanceSnapshot = await transaction.get(advanceRef);
    if (!advanceSnapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
    const advance = advanceSnapshot.data() || {};
    const result = authorizeDecision({ actor, advanceCompanyId: advance.companyId || actor.companyId, employeeFirestoreId: advance.employeeFirestoreId, status: advance.status, action });

    const updates = {
      status: result.decision,
      approvedBy: result.decision === "Approved" ? actor.employeeId || actor.uid : null,
      approvedAt: result.decision === "Approved" ? FieldValue.serverTimestamp() : null,
      rejectedBy: result.decision === "Rejected" ? actor.employeeId || actor.uid : null,
      rejectedAt: result.decision === "Rejected" ? FieldValue.serverTimestamp() : null,
      payoutStatus: "NOT_INITIATED",
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.update(advanceRef, updates);
    transaction.create(auditRef, {
      type: result.decision === "Approved" ? "advance.approved" : "advance.rejected",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      targetUserId: advance.employeeFirestoreId || null,
      companyId: actor.companyId,
      before: { status: advance.status || "Pending" },
      after: { status: result.decision, payoutStatus: updates.payoutStatus },
      metadata: { advanceId },
      createdAt: FieldValue.serverTimestamp(),
    });
    return { advanceId, status: result.decision };
  });
}

function canDeleteAdvance(actor, advance) {
  if (actor.isOwner) return true;
  const permissions = Array.isArray(actor.permissions) ? actor.permissions : [];
  if (!permissions.includes("advance.delete")) return false;
  const role = clean(actor.employee?.access?.roleId || actor.employee?.roleId || actor.employee?.employment?.role || "employee").toLowerCase();
  return role !== "employee" || advance.employeeFirestoreId === actor.employeeId;
}

async function deleteAdvanceRequest(db, request) {
  const actor = await resolveCompanyActor(db, request.auth);
  const advanceId = clean(request.data?.advanceId);
  if (!advanceId || advanceId.includes("/")) throw new Error("INVALID_ADVANCE_ID");

  const companyRef = db.collection("Companies").doc(actor.companyId);
  const advanceRef = companyRef.collection("advance_requests").doc(advanceId);
  const auditRef = companyRef.collection("ActivityLogs").doc(`advance-delete-${advanceId}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(advanceRef);
    if (!snapshot.exists) throw new Error("ADVANCE_NOT_FOUND");
    const advance = snapshot.data() || {};
    if (advance.companyId && advance.companyId !== actor.companyId) throw new Error("COMPANY_MISMATCH");
    if (!canDeleteAdvance(actor, advance)) throw new Error("FORBIDDEN");
    transaction.delete(advanceRef);
    transaction.create(auditRef, {
      type: "advance.deleted",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId || null,
      targetUserId: advance.employeeFirestoreId || null,
      companyId: actor.companyId,
      before: { status: advance.status || "Pending", payoutStatus: advance.payoutStatus || "NOT_INITIATED" },
      metadata: { advanceId },
      createdAt: FieldValue.serverTimestamp(),
    });
    return { advanceId, status: "Deleted" };
  });
}

module.exports = {
  createAdvanceRequest,
  decideAdvance,
  deleteAdvanceRequest,
  getAdvanceReferenceData,
  requestPayload,
};
