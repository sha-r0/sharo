"use strict";

const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { authorizeDecision, validateAmount } = require("./AdvancePolicy");
const { clean, isActiveEmployee, resolveCompanyActor } = require("../auth/CompanyActor");

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
  return { employees: [], projects };
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
  const actor = await resolveCompanyActor(db, request.auth);
  const input = request.data || {};
  const targetEmployeeId = actor.employeeId;
  if (!targetEmployeeId) throw new Error("EMPLOYEE_REQUIRED");

  const companyRef = db.collection("Companies").doc(actor.companyId);
  const employeeSnapshot = await companyRef.collection("Usermanagement").doc(targetEmployeeId).get();
  if (!employeeSnapshot.exists || !isActiveEmployee(employeeSnapshot.data() || {})) throw new Error("EMPLOYEE_NOT_FOUND");
  const payload = requestPayload(input, actor, employeeSnapshot);
  const advanceRef = companyRef.collection("advance_requests").doc();
  const auditRef = companyRef.collection("ActivityLogs").doc(`advance-request-${advanceRef.id}`);

  await db.runTransaction(async (transaction) => {
    transaction.create(advanceRef, {
      ...payload,
      requestId: advanceRef.id,
      requestedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      type: "advance.requested",
      actorId: actor.uid,
      actorEmployeeId: actor.employeeId,
      targetUserId: employeeSnapshot.id,
      companyId: actor.companyId,
      metadata: { advanceId: advanceRef.id },
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { advanceId: advanceRef.id, status: "Pending", payoutStatus: "NOT_INITIATED" };
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

module.exports = {
  createAdvanceRequest,
  decideAdvance,
  getAdvanceReferenceData,
  requestPayload,
};
