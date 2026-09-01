"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { resolveCompanyActor, clean } = require("../auth/CompanyActor");

const normalize = (value) => clean(value).toLowerCase().replace(/[ _-]/g, "");
const number = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const permitted = (actor, ...permissions) => actor.isOwner || permissions.some((permission) => actor.permissions.includes(permission));
const actorName = (actor) => actor.isOwner ? "Company Owner" : clean(actor.employee?.personalInfo?.fullName || actor.employee?.name || "Manager");
const actorRole = (actor) => actor.isOwner ? "owner" : clean(actor.employee?.access?.roleId || actor.employee?.role || "manager").toLowerCase();
const fail = (code, message = code) => { throw new HttpsError(code === "UNAUTHENTICATED" ? "unauthenticated" : code === "NOT_FOUND" ? "not-found" : code.startsWith("INVALID") ? "invalid-argument" : "failed-precondition", message); };

async function actorFor(db, request, permissions) {
  let actor;
  try { actor = await resolveCompanyActor(db, request.auth); } catch (error) { fail(error.message === "UNAUTHENTICATED" ? "UNAUTHENTICATED" : "FORBIDDEN"); }
  if (!permitted(actor, ...permissions)) fail("FORBIDDEN");
  return actor;
}

function audit(transaction, companyRef, actor, action, entityType, entityId, details = {}) {
  const ref = companyRef.collection("ActivityLogs").doc();
  transaction.set(ref, {
    action, module: "workforce", entityType, entityId, actorId: actor.uid,
    actorName: actorName(actor), actorRole: actorRole(actor), companyId: actor.companyId,
    details, createdAt: FieldValue.serverTimestamp(),
  });
}

function createDecideGpsPunch(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["gps.approve", "gps.manage"]);
    const gpsPunchId = clean(request.data?.gpsPunchId);
    const decision = normalize(request.data?.decision);
    const remarks = clean(request.data?.remarks).slice(0, 500);
    if (!gpsPunchId || !["approved", "rejected"].includes(decision)) fail("INVALID_GPS_DECISION");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const ref = companyRef.collection("GPSPunches").doc(gpsPunchId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) fail("NOT_FOUND", "GPS punch not found");
      const punch = snapshot.data();
      const state = normalize(punch.reviewStatus || punch.approvalStatus || punch.decision || "pending");
      if (state && state !== "pending") fail("GPS_ALREADY_DECIDED");
      transaction.update(ref, {
        reviewStatus: decision === "approved" ? "Approved" : "Rejected",
        approvalStatus: decision === "approved" ? "Approved" : "Rejected",
        decision, reviewRemarks: remarks, reviewedByUid: actor.uid,
        reviewedByName: actorName(actor), reviewedByRole: actorRole(actor),
        reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      audit(transaction, companyRef, actor, `gps.${decision}`, "GPSPunch", gpsPunchId, { decision, remarks });
    });
    return { ok: true, gpsPunchId, decision };
  });
}

function leaveDays(leave) {
  const explicit = number(leave.totalDays || leave.days || leave.daysRequested || leave.durationDays);
  if (explicit > 0) return explicit;
  const start = leave.fromDate?.toDate?.() || new Date(leave.fromDate || leave.startDate);
  const end = leave.toDate?.toDate?.() || new Date(leave.toDate || leave.endDate || leave.fromDate || leave.startDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}

function createDecideLeaveRequest(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["leave.approve", "leave.manage"]);
    const leaveRequestId = clean(request.data?.leaveRequestId);
    const decision = normalize(request.data?.decision);
    const remarks = clean(request.data?.remarks).slice(0, 500);
    if (!leaveRequestId || !["approved", "rejected"].includes(decision)) fail("INVALID_LEAVE_DECISION");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const leaveRef = companyRef.collection("LeaveRequests").doc(leaveRequestId);
    await db.runTransaction(async (transaction) => {
      const leaveSnapshot = await transaction.get(leaveRef);
      if (!leaveSnapshot.exists) fail("NOT_FOUND", "Leave request not found");
      const leave = leaveSnapshot.data();
      if (normalize(leave.status || "pending") !== "pending") fail("LEAVE_ALREADY_DECIDED");
      const employeeFirestoreId = clean(leave.employeeFirestoreId || leave.userId);
      if (!employeeFirestoreId) fail("INVALID_LEAVE_EMPLOYEE");
      if (!actor.isOwner && actor.employeeId === employeeFirestoreId) fail("LEAVE_SELF_APPROVAL_DENIED");
      const employeeRef = companyRef.collection("Usermanagement").doc(employeeFirestoreId);
      const employeeSnapshot = await transaction.get(employeeRef);
      if (!employeeSnapshot.exists) fail("INVALID_LEAVE_EMPLOYEE");
      const employee = employeeSnapshot.data();
      const code = clean(leave.leaveCode || leave.leaveTypeCode || leave.code || leave.leaveType);
      const days = leaveDays(leave);
      if (days <= 0) fail("INVALID_LEAVE_DAYS");
      if (decision === "approved") {
        const balances = employee.leaveBalance || {};
        const balance = balances[code];
        const unpaid = normalize(leave.leaveType || leave.type).includes("unpaid") || normalize(code) === "lop";
        if (!unpaid && balance && typeof balance === "object") {
          const remaining = number(balance.balance);
          if (remaining < days) fail("INSUFFICIENT_LEAVE_BALANCE");
          transaction.update(employeeRef, {
            [`leaveBalance.${code}.used`]: number(balance.used) + days,
            [`leaveBalance.${code}.balance`]: remaining - days,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
      const status = decision === "approved" ? "Approved" : "Rejected";
      transaction.update(leaveRef, {
        status, decision, managerRemarks: remarks, reviewedByUid: actor.uid,
        reviewedByName: actorName(actor), reviewedByRole: actorRole(actor),
        reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      audit(transaction, companyRef, actor, `leave.${decision}`, "LeaveRequest", leaveRequestId, { decision, days, remarks });
    });
    return { ok: true, leaveRequestId, decision };
  });
}

function createCorrectAttendance(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["attendance.edit", "attendance.manage", "attendance.approve"]);
    const attendanceId = clean(request.data?.attendanceId);
    const changes = request.data?.changes || {};
    if (!attendanceId) fail("INVALID_ATTENDANCE_ID");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const companyAttendanceRef = companyRef.collection("Attendance").doc(attendanceId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(companyAttendanceRef);
      if (!snapshot.exists) fail("NOT_FOUND", "Attendance record not found");
      const current = snapshot.data();
      const employeeFirestoreId = clean(current.employeeFirestoreId || current.userId);
      const date = clean(current.date || attendanceId.split("_").pop());
      if (!employeeFirestoreId || !date) fail("INVALID_ATTENDANCE_ID");
      const employeeRef = companyRef.collection("Usermanagement").doc(employeeFirestoreId);
      if (!(await transaction.get(employeeRef)).exists) fail("INVALID_ATTENDANCE_EMPLOYEE");
      const employeeAttendanceRef = employeeRef.collection("Attendance").doc(date);
      const update = {
        status: clean(changes.status || current.status), approvalStatus: clean(changes.approvalStatus || current.approvalStatus),
        remarks: clean(changes.remarks).slice(0, 500), manuallyCorrected: true,
        correctedByUid: actor.uid, correctedByName: actorName(actor), correctedByRole: actorRole(actor),
        correctedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      };
      for (const key of ["checkIn", "checkOut"]) {
        const value = changes[key];
        if (value) {
          const parsed = value instanceof Date ? value : new Date(value);
          if (Number.isNaN(parsed.getTime())) fail("INVALID_ATTENDANCE_TIME");
          update[key] = Timestamp.fromDate(parsed);
        }
      }
      const checkIn = update.checkIn?.toDate?.() || current.checkIn?.toDate?.();
      const checkOut = update.checkOut?.toDate?.() || current.checkOut?.toDate?.();
      if (checkIn && checkOut) {
        update.workedMinutes = Math.max(0, Math.floor((checkOut - checkIn) / 60000));
        update.totalHours = update.workedMinutes / 60;
      }
      transaction.set(companyAttendanceRef, update, { merge: true });
      transaction.set(employeeAttendanceRef, { ...update, employeeFirestoreId, date }, { merge: true });
      audit(transaction, companyRef, actor, "attendance.corrected", "Attendance", attendanceId);
    });
    return { ok: true, attendanceId };
  });
}

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
function dateKey(value) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";
}
function salaryOf(employee) {
  return number(employee.salary || employee.employment?.salary || employee.compensation?.monthlySalary || employee.compensation?.gross || employee.payroll?.salary);
}
function scheduledDaysFor(month, weeklyOff = "Sunday", holidays = new Set()) {
  const [year, monthNumber] = month.split("-").map(Number);
  const off = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(weeklyOff);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  let count = 0;
  for (let day = 1; day <= days; day += 1) {
    const key = `${month}-${String(day).padStart(2, "0")}`;
    if (new Date(`${key}T00:00:00+05:30`).getDay() !== (off < 0 ? 0 : off) && !holidays.has(key)) count += 1;
  }
  return count;
}
function calculatePayrollRow({ employee, attendance, leaves, advances, month, holidays, weeklyOff, adjustment = {} }) {
  const scheduledDays = scheduledDaysFor(month, weeklyOff, holidays);
  const statuses = attendance.map((item) => normalize(item.status));
  const presentDays = statuses.filter((status) => ["present", "late"].includes(status)).length;
  const halfDays = statuses.filter((status) => status === "halfday").length;
  const absentDays = statuses.filter((status) => status === "absent").length;
  const pendingDays = attendance.filter((item) => !item.checkOut || ["", "pending", "reviewrequired"].includes(normalize(item.status))).length;
  const paidLeaveDays = leaves.filter((item) => normalize(item.status) === "approved" && !normalize(item.leaveType || item.type).includes("unpaid")).reduce((sum, item) => sum + leaveDays(item), 0);
  const payableDays = Math.min(scheduledDays, Math.max(0, presentDays + halfDays * 0.5 + paidLeaveDays));
  const grossSalary = salaryOf(employee);
  const earnedSalary = scheduledDays ? grossSalary * payableDays / scheduledDays : 0;
  const advanceDeductions = advances.filter((item) => normalize(item.status) === "approved" && number(item.remainingAmount) > 0).map((item) => ({ advanceId: item.id, amount: Math.min(number(item.monthlyDeduction), number(item.remainingAmount)) })).filter((item) => item.amount > 0);
  const advanceDeduction = advanceDeductions.reduce((sum, item) => sum + item.amount, 0);
  const pfEnabled = employee.compensation?.pfEnabled === true || employee.payroll?.pfEnabled === true;
  const esiEnabled = employee.compensation?.esiEnabled === true || employee.payroll?.esiEnabled === true;
  const pfDeduction = pfEnabled ? number(employee.compensation?.pfAmount || employee.payroll?.pfAmount) : 0;
  const esiDeduction = esiEnabled ? number(employee.compensation?.esiAmount || employee.payroll?.esiAmount) : 0;
  const bonus = Math.max(0, number(adjustment.bonus));
  const otherDeduction = Math.max(0, number(adjustment.otherDeduction));
  return { scheduledDays, presentDays, halfDays, absentDays, pendingDays, paidLeaveDays, payableDays, grossSalary, earnedSalary, advanceDeductions, advanceDeduction, pfEnabled, esiEnabled, pfDeduction, esiDeduction, bonus, otherDeduction, netSalary: Math.max(0, earnedSalary + bonus - advanceDeduction - pfDeduction - esiDeduction - otherDeduction) };
}

function createGeneratePayroll(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["payroll.create", "payroll.edit", "payroll.manage"]);
    const month = clean(request.data?.month);
    if (!monthPattern.test(month)) fail("INVALID_PAYROLL_MONTH");
    const adjustments = request.data?.adjustments && typeof request.data.adjustments === "object" ? request.data.adjustments : {};
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const [employeesSnapshot, attendanceSnapshot, leaveSnapshot, advanceSnapshot, holidaySnapshot, shiftSnapshot] = await Promise.all([
      companyRef.collection("Usermanagement").get(), companyRef.collection("Attendance").get(), companyRef.collection("LeaveRequests").get(),
      companyRef.collection("advance_requests").get(), companyRef.collection("Holidays").get(), companyRef.collection("ShiftPolicies").get(),
    ]);
    const attendance = attendanceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => dateKey(item.date || item.checkIn).startsWith(month));
    const leaves = leaveSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((item) => dateKey(item.fromDate || item.startDate).startsWith(month));
    const advances = advanceSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const holidays = new Set(holidaySnapshot.docs.map((doc) => dateKey(doc.data().date || doc.id)).filter((key) => key.startsWith(month)));
    const shifts = new Map(shiftSnapshot.docs.map((doc) => [doc.id, doc.data()]));
    const rows = [];
    for (const employeeDoc of employeesSnapshot.docs) {
      const employee = employeeDoc.data();
      if (["inactive", "terminated"].includes(normalize(employee.employment?.status || employee.status))) continue;
      const id = employeeDoc.id;
      const ids = new Set([id, clean(employee.employeeId), clean(employee.login?.employeeId)].filter(Boolean));
      const employeeAttendance = attendance.filter((item) => ids.has(clean(item.employeeFirestoreId || item.employeeId)));
      const employeeLeaves = leaves.filter((item) => ids.has(clean(item.employeeFirestoreId || item.employeeId)));
      const employeeAdvances = advances.filter((item) => ids.has(clean(item.employeeFirestoreId || item.employeeId)));
      const shiftId = clean(employee.employment?.shiftPolicyId || employee.shiftPolicyId);
      const shift = shifts.get(shiftId) || {};
      const weeklyOff = clean(shift.weeklyOff?.primary || "Sunday");
      const payrollId = `${month}_${id}`;
      const calculated = calculatePayrollRow({ employee, attendance: employeeAttendance, leaves: employeeLeaves, advances: employeeAdvances, month, holidays, weeklyOff, adjustment: adjustments[id] });
      const row = { id: payrollId, month, companyId: actor.companyId, employeeFirestoreId: id, employeeId: clean(employee.employeeId || employee.login?.employeeId), employeeName: actorName({ employee }), department: clean(employee.employment?.department || employee.department), shiftPolicyId: shiftId, weeklyOff, ...calculated, status: "Draft", policySnapshot: { shiftPolicyId: shiftId, weeklyOff, generatedFrom: "finalized-attendance-v1" } };
      const ref = companyRef.collection("Payroll").doc(payrollId);
      await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(ref);
        if (existing.exists && ["processed", "paid", "finalized"].includes(normalize(existing.data().status))) fail("PAYROLL_FINALIZED");
        transaction.set(ref, { ...row, createdAt: existing.exists ? existing.data().createdAt : FieldValue.serverTimestamp(), generatedByUid: actor.uid, generatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      });
      rows.push(row);
    }
    return { ok: true, month, rows };
  });
}

function createTransitionPayroll(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["payroll.approve", "payroll.manage"]);
    const payrollId = clean(request.data?.payrollId);
    const target = normalize(request.data?.status);
    if (!payrollId || !["processed", "paid"].includes(target)) fail("INVALID_PAYROLL_STATUS");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const ref = companyRef.collection("Payroll").doc(payrollId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) fail("NOT_FOUND", "Payroll record not found");
      const payroll = snapshot.data();
      const current = normalize(payroll.status);
      if (current === target) return;
      if ((target === "processed" && current !== "draft") || (target === "paid" && current !== "processed")) fail("PAYROLL_INVALID_TRANSITION");
      const update = { status: target === "processed" ? "Processed" : "Paid", updatedAt: FieldValue.serverTimestamp(), reviewedByUid: actor.uid, reviewedByName: actorName(actor), reviewedByRole: actorRole(actor) };
      update[target === "processed" ? "finalizedAt" : "paidAt"] = FieldValue.serverTimestamp();
      if (target === "processed") update.finalizedSnapshot = { netSalary: payroll.netSalary, payableDays: payroll.payableDays, grossSalary: payroll.grossSalary, deductions: number(payroll.advanceDeduction) + number(payroll.pfDeduction) + number(payroll.esiDeduction) + number(payroll.otherDeduction) };
      const advanceRecords = [];
      if (target === "paid" && !payroll.advanceRecoveryAppliedAt) {
        const deductions = (payroll.advanceDeductions || []).filter((item) => clean(item.advanceId));
        const refs = deductions.map((item) => companyRef.collection("advance_requests").doc(clean(item.advanceId)));
        const snapshots = refs.length ? await transaction.getAll(...refs) : [];
        snapshots.forEach((advanceSnapshot, index) => advanceRecords.push({ deduction: deductions[index], advanceSnapshot }));
      }
      transaction.update(ref, update);
      if (target === "paid" && !payroll.advanceRecoveryAppliedAt) {
        for (const { deduction, advanceSnapshot } of advanceRecords) {
          if (!advanceSnapshot.exists) continue;
          const advanceRef = advanceSnapshot.ref;
          const advance = advanceSnapshot.data();
          const amount = Math.min(number(deduction.amount), number(advance.remainingAmount));
          const remainingAmount = Math.max(0, number(advance.remainingAmount) - amount);
          transaction.update(advanceRef, { remainingAmount, settledAmount: number(advance.settledAmount) + amount, status: remainingAmount === 0 ? "Settled" : "Approved", updatedAt: FieldValue.serverTimestamp() });
        }
        transaction.update(ref, { advanceRecoveryAppliedAt: FieldValue.serverTimestamp() });
      }
      audit(transaction, companyRef, actor, `payroll.${target}`, "Payroll", payrollId);
    });
    return { ok: true, payrollId, status: target === "processed" ? "Processed" : "Paid" };
  });
}

function createWorkforceFunctions(db) {
  return {
    decideGpsPunch: createDecideGpsPunch(db),
    decideLeaveRequest: createDecideLeaveRequest(db),
    correctAttendance: createCorrectAttendance(db),
    generatePayroll: createGeneratePayroll(db),
    transitionPayroll: createTransitionPayroll(db),
  };
}

module.exports = { createWorkforceFunctions, leaveDays, scheduledDaysFor, calculatePayrollRow };
