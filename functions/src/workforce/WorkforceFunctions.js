"use strict";

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { resolveCompanyActor, clean } = require("../auth/CompanyActor");
const { resolveEffectiveShift, snapshot: shiftSnapshot, lateMinutes, workingMinutes, statusFor } = require("../shift_policy_resolver");
const { captureStatutoryInputs, buildPayrollStatutory } = require("./payrollStatutory");
const { payrollCollection } = require("./payrollCollection");

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

function gpsDurationFields(shift, start, end, current) {
  const minutes = workingMinutes(shift, start, end);
  const exceeded = minutes > shift.maximumWorkingMinutes;
  const payable = Math.min(minutes, shift.maximumWorkingMinutes);
  return {
    actualWorkingMinutes: minutes, payableWorkingMinutes: payable,
    workedMinutes: payable, totalHours: payable / 60,
    status: exceeded ? "pending" : statusFor(shift, payable, current.checkInStatus === "late" || number(current.lateMinutes) > 0),
    requiresManagerReview: exceeded, durationExceededMaximum: exceeded,
    missingCheckout: shift.missingCheckout,
    overtimeMinutes: shift.allowOvertime ? Math.max(0, minutes - shift.overtimeAfterMinutes) : 0,
  };
}

async function syncApprovedGpsAttendance({ transaction, companyRef, employeeRef, employeeSnapshot, employeeId, punch, actor, reviewedAt, remarks, updates }) {
  const isOut = normalize(punch.type) === "out";
  const date = clean(punch.date || punch.dateKey || punch.attendanceDate);
  const time = punch.time || (isOut ? punch.checkOut : punch.checkIn) || punch.createdAt;
  const checkIn = time?.toDate?.() || new Date(time);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || Number.isNaN(checkIn.getTime())) fail("INVALID_GPS_ATTENDANCE");
  const attendanceRef = companyRef.collection("Attendance").doc(`${employeeId}_${date}`);
  const employeeAttendanceRef = employeeRef.collection("Attendance").doc(date);
  const attendanceSnapshot = await transaction.get(attendanceRef);
  const employeeAttendanceSnapshot = await transaction.get(employeeAttendanceRef);
  const existing = attendanceSnapshot.data() || {};
  const employeeAttendance = employeeAttendanceSnapshot.data() || {};
  if (isOut) {
    const current = { ...employeeAttendance, ...existing };
    const originalIn = existing.checkIn || employeeAttendance.checkIn;
    const originalOut = existing.checkOut || employeeAttendance.checkOut;
    const start = originalIn?.toDate?.() || new Date(originalIn);
    // An OUT must close a real check-in on this workday, never fabricate one.
    if (originalIn && Number.isFinite(start.getTime()) && checkIn >= start) {
      let checkoutUpdate = {};
      if (!originalOut) {
        const companySnapshot = await transaction.get(companyRef);
        const shifts = await transaction.get(companyRef.collection("ShiftPolicies"));
        const shift = current.shiftPolicy || resolveEffectiveShift(employeeSnapshot.data(), companySnapshot.data(), shifts.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        if (!shift) fail("INVALID_GPS_SHIFT");
        checkoutUpdate = {
          checkOut: Timestamp.fromDate(checkIn), checkOutSource: "gps",
          checkOutLocation: punch.location || null,
          ...gpsDurationFields(shift, start, checkIn, current),
          updatedAt: reviewedAt,
        };
      }
      // Fill missing mirror fields without replacing either copy's recorded punches.
      for (const [target, data] of [[attendanceRef, existing], [employeeAttendanceRef, employeeAttendance]]) {
        transaction.set(target, {
          ...current, ...data, ...checkoutUpdate,
          checkIn: data.checkIn || originalIn,
          checkOut: data.checkOut || originalOut || checkoutUpdate.checkOut,
        }, { merge: true });
      }
      updates.attendanceMarked = true;
      updates.attendanceId = date;
    }
  } else if (existing.checkIn || employeeAttendance.checkIn) {
    // Never replace an existing check-in, checkout, or attendance decision.
    if (!attendanceSnapshot.exists) transaction.set(attendanceRef, employeeAttendance);
    if (!employeeAttendanceSnapshot.exists) transaction.set(employeeAttendanceRef, existing);
    if (attendanceSnapshot.exists && !existing.checkIn) transaction.set(attendanceRef, { checkIn: employeeAttendance.checkIn }, { merge: true });
    if (employeeAttendanceSnapshot.exists && !employeeAttendance.checkIn) transaction.set(employeeAttendanceRef, { checkIn: existing.checkIn }, { merge: true });
  } else {
    const companySnapshot = await transaction.get(companyRef);
    const shifts = await transaction.get(companyRef.collection("ShiftPolicies"));
    const shift = resolveEffectiveShift(employeeSnapshot.data(), companySnapshot.data(), shifts.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
    if (!shift) fail("INVALID_GPS_SHIFT");
    const local = new Date(checkIn.getTime() + 330 * 60 * 1000);
    const late = lateMinutes(shift, { hour: local.getUTCHours(), minute: local.getUTCMinutes() });
    const employee = employeeSnapshot.data();
    const attendance = {
      companyId: actor.companyId, employeeFirestoreId: employeeId,
      employeeId: employee.employeeId || punch.employeeId || "",
      employeeName: punch.employeeName || employee.personalInfo?.fullName || employee.name || "Employee",
      date, dateKey: date, month: date.slice(0, 7), year: Number(date.slice(0, 4)),
      checkIn: Timestamp.fromDate(checkIn), checkInLocation: punch.location || null,
      checkInSource: "gps", attendanceSource: "gps", gpsValid: false,
      shiftPolicy: shiftSnapshot(shift), shiftPolicyId: shift.id,
      shiftCode: shift.code, shiftName: shift.name, shiftStartTime: shift.startTime, shiftEndTime: shift.endTime,
      checkInStatus: late > 0 ? "late" : "present", lateMinutes: late,
      status: "present", approvalStatus: "approved", requiresManagerReview: false,
      approvedBy: actor.uid, approvedByUid: actor.uid, approvedByName: actorName(actor),
      approvedAt: reviewedAt, reviewRemarks: remarks, overtimeMinutes: 0,
      createdAt: existing.createdAt || employeeAttendance.createdAt || reviewedAt, updatedAt: reviewedAt,
    };
    transaction.set(attendanceRef, attendance, { merge: true });
    transaction.set(employeeAttendanceRef, attendance, { merge: true });
  }
  if (!isOut) {
    updates.attendanceMarked = true;
    updates.attendanceId = date;
  }
}

function createDecideGpsPunch(db) {
  return onCall(async (request) => {
    const actor = await actorFor(db, request, ["gps.approve", "gps.manage"]);
    const gpsPunchId = clean(request.data?.gpsPunchId);
    const decision = normalize(request.data?.decision);
    const remarks = clean(request.data?.remarks).slice(0, 500);
    if (!gpsPunchId || gpsPunchId.includes("/") || !["approved", "rejected"].includes(decision)) fail("INVALID_GPS_DECISION");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const ref = companyRef.collection("GPSPunches").doc(gpsPunchId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) fail("NOT_FOUND", "GPS punch not found");
      const punch = snapshot.data();
      const state = normalize(punch.reviewStatus || punch.approvalStatus || punch.decision || "pending");
      if (state && state !== "pending") fail("GPS_ALREADY_DECIDED");
      const employeeId = clean(punch.employeeFirestoreId || punch.userId || punch.employeeId);
      if (!employeeId || employeeId.includes("/") || (punch.companyId && punch.companyId !== actor.companyId)) fail("INVALID_GPS_EMPLOYEE");
      const employeeRef = companyRef.collection("Usermanagement").doc(employeeId);
      const employeeSnapshot = await transaction.get(employeeRef);
      if (!employeeSnapshot.exists) fail("INVALID_GPS_EMPLOYEE");
      const mirrorRef = employeeRef.collection("GPSPunches").doc(gpsPunchId);
      const mirrorSnapshot = await transaction.get(mirrorRef);
      const mirror = mirrorSnapshot.data() || {};
      if ((mirror.companyId && mirror.companyId !== actor.companyId) || (mirror.employeeFirestoreId && mirror.employeeFirestoreId !== employeeId)) fail("INVALID_GPS_EMPLOYEE");
      const mirrorState = normalize(mirror.reviewStatus || mirror.approvalStatus || mirror.decision || mirror.status || "pending");
      if (mirrorSnapshot.exists && mirrorState !== "pending") fail("GPS_ALREADY_DECIDED");
      const reviewedAt = FieldValue.serverTimestamp();
      const status = decision === "approved" ? "Approved" : "Rejected";
      const updates = {
        status, reviewStatus: status, approvalStatus: status,
        decision, reviewRemarks: remarks, reviewedByUid: actor.uid,
        reviewedByName: actorName(actor), reviewedByRole: actorRole(actor),
        reviewedAt, updatedAt: reviewedAt,
        approvedBy: actor.uid, approvedAt: reviewedAt, remarks,
      };
      if (decision === "approved" && ["in", "out"].includes(normalize(punch.type))) {
        await syncApprovedGpsAttendance({ transaction, companyRef, employeeRef, employeeSnapshot, employeeId, punch, actor, reviewedAt, remarks, updates });
      }
      transaction.update(ref, updates);
      if (mirrorSnapshot.exists) transaction.update(mirrorRef, updates);
      else transaction.set(mirrorRef, { ...punch, ...updates });
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
      // Legacy requests stored the Usermanagement document ID in employeeId.
      const employeeReference = leave.employeeFirestoreId || leave.userId || leave.employeeId;
      const employeeFirestoreId = typeof employeeReference === "string" ? employeeReference.trim() : "";
      if (!employeeFirestoreId || employeeFirestoreId.includes("/")) fail("INVALID_LEAVE_EMPLOYEE");
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
    const validId = (value) => Boolean(value && !value.includes("/") && ![".", ".."].includes(value));
    const validDay = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    };
    const requestedId = clean(request.data?.attendanceId);
    const requestedEmployee = clean(request.data?.employeeFirestoreId);
    const requestedDate = clean(request.data?.workDate);
    const changes = request.data?.changes;
    if ((requestedId && !validId(requestedId)) || (!requestedId && (!validId(requestedEmployee) || !validDay(requestedDate)))) fail("INVALID_ATTENDANCE_ID", "Select a valid employee and work date.");
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) fail("INVALID_ATTENDANCE_CHANGES");
    const fields = ["checkIn", "checkOut", "status", "approvalStatus", "remarks"];
    const has = (key) => Object.prototype.hasOwnProperty.call(changes, key);
    if (!fields.some(has)) fail("INVALID_ATTENDANCE_CHANGES", "Edit at least one field before saving.");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    try {
      return await db.runTransaction(async (transaction) => {
        let attendanceId = requestedId || `${requestedEmployee}_${requestedDate}`;
        let companyAttendanceRef = companyRef.collection("Attendance").doc(attendanceId);
        let snapshot = await transaction.get(companyAttendanceRef);
        if (requestedId && !snapshot.exists) fail("NOT_FOUND", "Attendance record not found. Reload the month before saving.");
        let current = snapshot.data() || {};
        const employeeFirestoreId = snapshot.exists ? clean(current.employeeFirestoreId || current.userId) : requestedEmployee;
        const date = snapshot.exists ? clean(current.date || current.dateKey || attendanceId.match(/\d{4}-\d{2}-\d{2}$/)?.[0]) : requestedDate;
        if (!validId(employeeFirestoreId) || !validDay(date)) fail("INVALID_ATTENDANCE_ID");
        if ((requestedEmployee && requestedEmployee !== employeeFirestoreId) || (requestedDate && requestedDate !== date) || (current.companyId && current.companyId !== actor.companyId)) fail("INVALID_ATTENDANCE_ID");
        const employeeRef = companyRef.collection("Usermanagement").doc(employeeFirestoreId);
        const employeeSnapshot = await transaction.get(employeeRef);
        const employee = employeeSnapshot.data() || {};
        if (!employeeSnapshot.exists || (employee.companyId && employee.companyId !== actor.companyId)) fail("INVALID_ATTENDANCE_EMPLOYEE", "Employee does not belong to this company.");
        if (!snapshot.exists) {
          // A stale empty grid must reuse legacy canonical records as well as deterministic ones.
          const candidates = new Map();
          for (const field of ["employeeFirestoreId", "userId"]) {
            const matches = await transaction.get(companyRef.collection("Attendance").where(field, "==", employeeFirestoreId));
            for (const doc of matches.docs) {
              const value = doc.data();
              const day = clean(value.date || value.dateKey || doc.id.match(/\d{4}-\d{2}-\d{2}$/)?.[0]);
              if (day === date) candidates.set(doc.id, doc);
            }
          }
          if (candidates.size > 1) fail("INVALID_ATTENDANCE_DUPLICATES", "Multiple Attendance records exist for this day. Reload and review before correcting.");
          if (candidates.size) {
            snapshot = [...candidates.values()][0]; current = snapshot.data();
            attendanceId = snapshot.id; companyAttendanceRef = companyRef.collection("Attendance").doc(attendanceId);
            if ((current.employeeFirestoreId || current.userId) !== employeeFirestoreId || (current.companyId && current.companyId !== actor.companyId)) fail("INVALID_ATTENDANCE_ID");
          }
        }
        const employeeAttendanceRef = employeeRef.collection("Attendance").doc(date);
        const mirrorSnapshot = await transaction.get(employeeAttendanceRef);
        const mirror = mirrorSnapshot.data() || {};
        const mirrorEmployee = mirror.employeeFirestoreId || mirror.userId;
        if ((mirror.companyId && mirror.companyId !== actor.companyId) || (mirrorEmployee && mirrorEmployee !== employeeFirestoreId) || (mirror.date && mirror.date !== date) || (mirror.dateKey && mirror.dateKey !== date)) fail("INVALID_ATTENDANCE_ID");
        // Recover mirror-only data when materializing a missing canonical record.
        if (!snapshot.exists) current = mirror;
        const creating = !snapshot.exists;
        if (creating && !mirrorSnapshot.exists && !fields.some((key) => has(key) && changes[key] !== null && clean(changes[key]) !== "")) fail("INVALID_ATTENDANCE_CHANGES", "Edit at least one field before saving.");
        const now = FieldValue.serverTimestamp();
        const update = {
          manuallyCorrected: true, correctedByUid: actor.uid, correctedByName: actorName(actor), correctedByRole: actorRole(actor),
          correctedAt: now, updatedAt: now,
        };
        for (const key of ["status", "approvalStatus", "remarks"]) {
          if (!has(key)) continue;
          if (typeof changes[key] !== "string") fail("INVALID_ATTENDANCE_CHANGES");
          update[key] = key === "remarks" ? clean(changes[key]).slice(0, 500) : normalize(changes[key]);
        }
        if (has("status") && !["present", "late", "halfday", "leave", "absent", "holiday", "weeklyoff", "pending"].includes(update.status)) fail("INVALID_ATTENDANCE_STATUS", "Select a valid attendance status.");
        if (has("approvalStatus") && !["approved", "pending", "rejected"].includes(update.approvalStatus)) fail("INVALID_ATTENDANCE_STATUS");
        for (const key of ["checkIn", "checkOut"]) {
          if (!has(key)) continue;
          if (changes[key] === null) { update[key] = null; continue; }
          if (typeof changes[key] !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(changes[key])) fail("INVALID_ATTENDANCE_TIME", "Enter a valid check-in or check-out time.");
          const parsed = new Date(changes[key]);
          if (!Number.isFinite(parsed.getTime())) fail("INVALID_ATTENDANCE_TIME");
          update[key] = Timestamp.fromDate(parsed);
        }
        const parseTime = (value) => value?.toDate?.() || (value ? new Date(value) : null);
        const checkIn = parseTime(has("checkIn") ? update.checkIn : current.checkIn);
        let checkOut = parseTime(has("checkOut") ? update.checkOut : current.checkOut);
        const timeChanged = has("checkIn") || has("checkOut");
        if (creating || timeChanged) {
          let shift = current.shiftPolicy;
          if (!shift || !["maximumWorkingMinutes", "minimumWorkingMinutes", "absentMinutes", "halfDayMinutes"].every((key) => Number.isFinite(shift[key]))) {
            const company = await transaction.get(companyRef);
            const policies = await transaction.get(companyRef.collection("ShiftPolicies"));
            const policyEmployee = current.shiftPolicyId || current.shiftPolicy?.id ? { ...employee, employment: { ...employee.employment, shiftPolicyId: current.shiftPolicyId || current.shiftPolicy.id } } : employee;
            shift = resolveEffectiveShift(policyEmployee, company.data() || {}, policies.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
          }
          if ((checkIn || checkOut) && !shift) fail("INVALID_ATTENDANCE_SHIFT", "Assign an active shift policy before saving attendance times.");
          if (checkIn && !Number.isFinite(checkIn.getTime()) || checkOut && !Number.isFinite(checkOut.getTime())) fail("INVALID_ATTENDANCE_TIME");
          if (checkIn && dateKey(checkIn) !== date) fail("INVALID_ATTENDANCE_TIME", "Check-in must be on the selected work date.");
          if (checkOut && !checkIn) fail("INVALID_ATTENDANCE_TIME", "Enter a check-in before adding check-out.");
          if (checkIn && checkOut && checkOut < checkIn && shift.isNightShift && has("checkOut") && dateKey(checkOut) === date) {
            checkOut = new Date(checkOut.getTime() + 86400000); update.checkOut = Timestamp.fromDate(checkOut);
          }
          if (checkIn && checkOut && checkOut < checkIn) fail("INVALID_ATTENDANCE_TIME", "Check-out must follow check-in.");
          if (shift) {
            if (!current.shiftPolicy) Object.assign(update, { shiftPolicy: shiftSnapshot(shift), shiftPolicyId: shift.id });
            if (checkIn && (creating || has("checkIn") || current.lateMinutes == null)) {
              const local = new Date(checkIn.getTime() + 330 * 60000);
              update.lateMinutes = lateMinutes(shift, { hour: local.getUTCHours(), minute: local.getUTCMinutes() });
              update.checkInStatus = update.lateMinutes > 0 ? "late" : "present";
            }
            if (checkIn && checkOut) {
              const calculated = gpsDurationFields(shift, checkIn, checkOut, { ...current, ...update });
              if (has("status")) calculated.status = update.status;
              Object.assign(update, calculated);
            }
          }
          if (!checkIn || !checkOut) {
            Object.assign(update, { workedMinutes: 0, totalHours: 0, actualWorkingMinutes: 0, payableWorkingMinutes: 0, overtimeMinutes: 0 });
            if (!has("status")) update.status = checkIn ? "pending" : current.status || "pending";
          }
        }
        if (creating) {
          Object.assign(update, {
            companyId: actor.companyId, employeeFirestoreId, employeeId: clean(employee.employeeId || employee.login?.employeeId),
            employeeName: clean(employee.personalInfo?.fullName || employee.name || "Employee"),
            date, dateKey: date, month: date.slice(0, 7), year: Number(date.slice(0, 4)),
            attendanceSource: current.attendanceSource || "manual", createdAt: current.createdAt || now,
          });
          if (!has("approvalStatus") && !current.approvalStatus) update.approvalStatus = "approved";
        }
        transaction.set(companyAttendanceRef, { ...current, ...update }, { merge: true });
        transaction.set(employeeAttendanceRef, { ...current, ...update, employeeFirestoreId, date }, { merge: true });
        audit(transaction, companyRef, actor, "attendance.corrected", "Attendance", attendanceId);
        return { ok: true, attendanceId, created: creating };
      });
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error("[correctAttendance] transaction failed", { companyId: actor.companyId, attendanceId: requestedId, code: error?.code, message: error?.message });
      throw new HttpsError("internal", "Attendance correction could not be saved. Please retry or contact your administrator.");
    }
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
      row.statutoryInputs = captureStatutoryInputs(employee, row, month);
      // A regenerated draft must not retain a previous month's calculation inputs/results.
      row.compliance = null;
      const ref = payrollCollection(companyRef).doc(payrollId);
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
    if (!payrollId || payrollId.includes("/") || !["processed", "paid"].includes(target)) fail("INVALID_PAYROLL_STATUS");
    const companyRef = db.collection("Companies").doc(actor.companyId);
    const ref = payrollCollection(companyRef).doc(payrollId);
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) fail("NOT_FOUND", "Payroll record not found");
      const payroll = snapshot.data();
      if (payroll.companyId != null && payroll.companyId !== actor.companyId) fail("FORBIDDEN");
      const current = normalize(payroll.status);
      if (current === target) return;
      if ((target === "processed" && current !== "draft") || (target === "paid" && current !== "processed")) fail("PAYROLL_INVALID_TRANSITION");
      const update = { status: target === "processed" ? "Processed" : "Paid", updatedAt: FieldValue.serverTimestamp(), reviewedByUid: actor.uid, reviewedByName: actorName(actor), reviewedByRole: actorRole(actor) };
      update[target === "processed" ? "finalizedAt" : "paidAt"] = FieldValue.serverTimestamp();
      if (target === "processed") {
        update.finalizedSnapshot = { netSalary: payroll.netSalary, payableDays: payroll.payableDays, grossSalary: payroll.grossSalary, deductions: number(payroll.advanceDeduction) + number(payroll.pfDeduction) + number(payroll.esiDeduction) + number(payroll.otherDeduction) };
        update.compliance = buildPayrollStatutory(payroll);
      }
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

module.exports = { gpsDurationFields, syncApprovedGpsAttendance, createWorkforceFunctions, leaveDays, scheduledDaysFor, calculatePayrollRow };
