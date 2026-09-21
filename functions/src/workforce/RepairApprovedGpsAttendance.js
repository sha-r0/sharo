"use strict";

const { FieldValue } = require("firebase-admin/firestore");
const { syncApprovedGpsAttendance, gpsDurationFields } = require("./WorkforceFunctions");
const { resolveEffectiveShift, lateMinutes } = require("../shift_policy_resolver");

const normalize = (value) => String(value || "").trim().toLowerCase();
const validId = (value) => typeof value === "string" && value.trim() === value && value.length > 0 && !value.includes("/") && ![".", ".."].includes(value);
const toDate = (value) => value ? value.toDate?.() || new Date(value) : null;
function requireApproved(punch) {
  const states = [punch.status, punch.reviewStatus, punch.approvalStatus, punch.decision].filter(Boolean);
  if (!states.length || states.some((state) => normalize(state) !== "approved")) throw new Error("GPS_NOT_APPROVED");
}
function validateTenant(data, companyId, employeeId) {
  if ((data.companyId && data.companyId !== companyId) || (data.employeeFirestoreId && data.employeeFirestoreId !== employeeId)) throw new Error("INVALID_GPS_EMPLOYEE");
}

// Administrative, explicitly targeted repair. This is not a deployed callable or an approval action.
async function repairApprovedGpsAttendance(db, { companyId, gpsPunchId, date = "2026-09-18", dryRun = true }) {
  if (!validId(companyId) || !validId(gpsPunchId) || date !== "2026-09-18") throw new Error("INVALID_REPAIR_TARGET");
  const companyRef = db.collection("Companies").doc(companyId);
  const gpsRef = companyRef.collection("GPSPunches").doc(gpsPunchId);
  return db.runTransaction(async (transaction) => {
    const gpsSnapshot = await transaction.get(gpsRef);
    if (!gpsSnapshot.exists) throw new Error("GPS_NOT_FOUND");
    const punch = gpsSnapshot.data();
    requireApproved(punch);
    if ((punch.date || punch.dateKey || punch.attendanceDate) !== date) throw new Error("INVALID_REPAIR_DATE");
    const employeeId = punch.employeeFirestoreId || punch.userId || punch.employeeId;
    if (!validId(employeeId)) throw new Error("INVALID_GPS_EMPLOYEE");
    validateTenant(punch, companyId, employeeId);
    const employeeRef = companyRef.collection("Usermanagement").doc(employeeId);
    const employeeSnapshot = await transaction.get(employeeRef);
    if (!employeeSnapshot.exists) throw new Error("INVALID_GPS_EMPLOYEE");
    validateTenant(employeeSnapshot.data(), companyId, employeeId);
    const gpsMirrorRef = employeeRef.collection("GPSPunches").doc(gpsPunchId);
    const gpsMirror = await transaction.get(gpsMirrorRef);
    if (gpsMirror.exists) {
      validateTenant(gpsMirror.data(), companyId, employeeId);
      requireApproved(gpsMirror.data());
    }
    const field = { in: "checkIn", out: "checkOut" }[normalize(punch.type)];
    if (!field) throw new Error("INVALID_GPS_TYPE");
    const attendanceRefs = [companyRef.collection("Attendance").doc(`${employeeId}_${date}`), employeeRef.collection("Attendance").doc(date)];
    const originals = new Map();
    for (const ref of attendanceRefs) {
      const snap = await transaction.get(ref);
      const data = snap.data() || {};
      validateTenant(data, companyId, employeeId);
      if ((data.date && data.date !== date) || (data.dateKey && data.dateKey !== date)) throw new Error("INVALID_REPAIR_DATE");
      originals.set(ref.path, data);
    }
    if (attendanceRefs.every((ref) => originals.get(ref.path)[field])) return { outcome: "unchanged", gpsPunchId, date, dryRun };

    // Buffer the shared sync's writes so repair can preserve all existing metadata,
    // recalculate derived fields, and finish every read before committing anything.
    const planned = [];
    const updates = {};
    const reviewedAt = FieldValue.serverTimestamp();
    const actor = { companyId, uid: punch.reviewedByUid || punch.approvedBy || "", employee: { name: punch.reviewedByName || "Manager" } };
    await syncApprovedGpsAttendance({
      transaction: { get: (ref) => transaction.get(ref), set: (ref, data) => planned.push({ ref, data }) },
      companyRef, employeeRef, employeeSnapshot, employeeId, punch, actor, reviewedAt,
      remarks: punch.reviewRemarks || punch.remarks || "", updates,
    });
    if (!planned.length) return { outcome: "unchanged", gpsPunchId, date, dryRun };
    const company = await transaction.get(companyRef);
    const shifts = await transaction.get(companyRef.collection("ShiftPolicies"));
    const writes = [];
    for (const { ref, data } of planned) {
      const original = originals.get(ref.path);
      if (original[field]) continue;
      const merged = { ...data, ...original };
      // Null or absent punches are fillable; populated punches are immutable.
      for (const key of ["checkIn", "checkOut"]) if (!original[key] && data[key]) merged[key] = data[key];
      if (!merged[field]) continue;
      const start = toDate(merged.checkIn), end = toDate(merged.checkOut);
      if (field === "checkIn" && start && Number.isFinite(start.getTime())) {
        const shift = merged.shiftPolicy || resolveEffectiveShift(employeeSnapshot.data(), company.data() || {}, shifts.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        if (!shift) throw new Error("INVALID_GPS_SHIFT");
        const local = new Date(start.getTime() + 330 * 60000);
        merged.lateMinutes = lateMinutes(shift, { hour: local.getUTCHours(), minute: local.getUTCMinutes() });
        merged.checkInStatus = merged.lateMinutes > 0 ? "late" : "present";
        if (!end) merged.status = "present";
      }
      if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end >= start) {
        const shift = merged.shiftPolicy || resolveEffectiveShift(employeeSnapshot.data(), company.data() || {}, shifts.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
        if (!shift) throw new Error("INVALID_GPS_SHIFT");
        Object.assign(merged, gpsDurationFields(shift, start, end, merged));
      }
      writes.push({ ref, data: { ...merged, updatedAt: reviewedAt } });
    }
    if (!writes.length) return { outcome: "unchanged", gpsPunchId, date, dryRun };
    if (!dryRun) {
      for (const write of writes) transaction.set(write.ref, write.data, { merge: true });
      const marker = { attendanceMarked: true, attendanceId: date };
      transaction.update(gpsRef, marker);
      if (gpsMirror.exists) transaction.update(gpsMirrorRef, marker);
      else transaction.set(gpsMirrorRef, { ...punch, ...marker });
    }
    return { outcome: dryRun ? "would-repair" : "repaired", gpsPunchId, date, dryRun, attendancePaths: writes.map(({ ref }) => ref.path) };
  });
}

module.exports = { repairApprovedGpsAttendance };
