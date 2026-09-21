"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { Timestamp } = require("firebase-admin/firestore");
const { createWorkforceFunctions } = require("../src/workforce/WorkforceFunctions");

function harness({ punch = {}, mirror = {}, missingMirror = false, missingEmployee = false, attendance = null, employeeAttendance = attendance, permitted = true, failCommit = false } = {}) {
  const base = "Companies/tenant-a", employee = `${base}/Usermanagement/employee-a`;
  const companyPunch = `${base}/GPSPunches/punch-a`, employeePunch = `${employee}/GPSPunches/punch-a`;
  const companyAttendance = `${base}/Attendance/employee-a_2026-09-18`, employeeAttendancePath = `${employee}/Attendance/2026-09-18`;
  const time = Timestamp.fromDate(new Date("2026-09-18T04:00:00Z"));
  const source = { punchId: "punch-a", companyId: "tenant-a", employeeFirestoreId: "employee-a", employeeId: "0001", employeeName: "Employee", type: "OUT", date: "2026-09-18", time, status: "Pending", reviewStatus: "pending", approvalStatus: "pending", attendanceMarked: false, photoUrl: "photo", location: { latitude: 1, longitude: 2 }, officeDistance: 100, configuredRadius: 50, ...punch };
  const records = new Map([[base, { ownerUid: "owner" }], [companyPunch, source], [`${base}/ShiftPolicies/shift`, { active: true, basic: { name: "Day" }, timing: { startTime: "09:00", endTime: "18:00" } }], ["Companies/tenant-b/Usermanagement/other", {}]]);
  if (!missingEmployee) records.set(employee, { employeeId: "0001" });
  records.set(`${base}/Usermanagement/reviewer`, { access: { authUid: "reviewer-auth", effectivePermissions: permitted ? ["gps.approve"] : [] } });
  if (!missingMirror) records.set(employeePunch, { ...source, ...mirror });
  if (attendance) records.set(companyAttendance, attendance);
  if (employeeAttendance) records.set(employeeAttendancePath, employeeAttendance);
  const ref = (path, isCollection = false) => ({ path, isCollection, id: path.split("/").at(-1), collection: (name) => ref(`${path}/${name}`, true), doc: (id = "audit") => ref(`${path}/${id}`), get: async () => snap(path) });
  const snap = (path) => ({ id: path.split("/").at(-1), ref: ref(path), exists: records.has(path), data: () => records.get(path) });
  const commits = [];
  const db = { collection: (name) => ref(name, true), runTransaction: async (run) => {
    const writes = [];
    const result = await run({
      get: async (r) => { assert.equal(writes.length, 0, "all transaction reads precede writes"); return r.isCollection ? { docs: [...records.keys()].filter((p) => p.startsWith(`${r.path}/`) && p.split('/').length === r.path.split('/').length + 1).map(snap) } : snap(r.path); },
      update: (r, data) => writes.push({ path: r.path, data, merge: true, update: true }),
      set: (r, data, options) => writes.push({ path: r.path, data, merge: options?.merge }),
    });
    if (failCommit) throw new Error("commit failed");
    for (const write of writes) if (write.update && !records.has(write.path)) throw new Error("missing document");
    for (const write of writes) records.set(write.path, write.merge ? { ...records.get(write.path), ...write.data } : write.data);
    commits.push(writes);
    return result;
  } };
  const decide = (decision = "approved", extra = {}) => createWorkforceFunctions(db).decideGpsPunch.run({ auth: { uid: "reviewer-auth", token: { companyId: "tenant-a", companyEmployeeId: "reviewer" } }, data: { gpsPunchId: "punch-a", decision, remarks: "Reviewed", ...extra } });
  return { db, records, decide, commits, companyPunch, employeePunch, companyAttendance, employeeAttendancePath, time };
}

for (const decision of ["approved", "rejected"]) {
  test(`${decision} atomically synchronizes both GPS copies and preserves evidence`, async () => {
    const h = harness(); await h.decide(decision);
    const a = h.records.get(h.companyPunch), b = h.records.get(h.employeePunch);
    assert.deepEqual(a, b);
    assert.equal(a.status, decision === "approved" ? "Approved" : "Rejected");
    assert.equal(a.reviewStatus, a.status); assert.equal(a.approvalStatus, a.status);
    assert.equal(a.reviewedByUid, "reviewer-auth"); assert.equal(a.approvedBy, "reviewer-auth");
    assert.equal(a.reviewRemarks, "Reviewed"); assert.equal(a.remarks, "Reviewed");
    assert.deepEqual(a.reviewedAt, a.approvedAt);
    assert.equal(a.photoUrl, "photo"); assert.deepEqual(a.location, { latitude: 1, longitude: 2 });
    assert.equal(a.officeDistance, 100); assert.equal(a.type, "OUT");
    assert.equal(a.attendanceMarked, false);
    assert.equal(h.records.has(h.companyAttendance), false);
    assert.equal([...h.records.keys()].filter((key) => key.includes('/GPSPunches/')).length, 2);
    assert.equal(h.commits.length, 1);
  });
}
test("approved IN writes both deterministic Attendance copies using original time and review conventions", async () => {
  const h = harness({ punch: { type: "IN" } }); await h.decide();
  const attendance = h.records.get(h.companyAttendance);
  assert.deepEqual(attendance, h.records.get(h.employeeAttendancePath));
  assert.deepEqual(attendance.checkIn, h.time);
  assert.equal(attendance.status, "present"); assert.equal(attendance.approvalStatus, "approved");
  assert.equal(attendance.checkInSource, "gps"); assert.equal(attendance.gpsValid, false);
  assert.equal(attendance.shiftPolicyId, "shift"); assert.equal(attendance.lateMinutes, 30);
  assert.equal(attendance.requiresManagerReview, false);
  assert.equal(h.records.get(h.employeePunch).attendanceMarked, true);
  assert.equal(h.records.get(h.employeePunch).attendanceId, "2026-09-18");
  assert.equal(h.commits.length, 1);
  await assert.rejects(h.decide(), { message: "GPS_ALREADY_DECIDED" });
  assert.equal(h.commits.length, 1);
});
test("rejected IN never marks Attendance", async () => {
  const h = harness({ punch: { type: "IN" } }); await h.decide("rejected");
  assert.equal(h.records.has(h.companyAttendance), false);
  assert.equal(h.records.get(h.employeePunch).attendanceMarked, false);
});
test("existing attendance check-in, checkout and decision are never replaced", async () => {
  const existing = { checkIn: "original", checkOut: "checkout", approvalStatus: "rejected", status: "halfday" };
  const h = harness({ punch: { type: "IN" }, attendance: existing }); await h.decide();
  assert.deepEqual(h.records.get(h.companyAttendance), existing);
  assert.deepEqual(h.records.get(h.employeeAttendancePath), existing);
});
test("missing Attendance mirror is restored with the existing check-in unchanged", async () => {
  const existing = { checkIn: "original", approvalStatus: "approved" };
  const h = harness({ punch: { type: "IN" }, attendance: existing, employeeAttendance: null }); await h.decide();
  assert.deepEqual(h.records.get(h.employeeAttendancePath), existing);
});
test("missing GPS mirror is restored at the same ID with original evidence", async () => {
  const h = harness({ missingMirror: true }); await h.decide();
  assert.deepEqual(h.records.get(h.companyPunch), h.records.get(h.employeePunch));
});
test("commit failure leaves both GPS copies and Attendance untouched", async () => {
  const h = harness({ punch: { type: "IN" }, failCommit: true });
  await assert.rejects(h.decide(), /commit failed/);
  assert.equal(h.records.get(h.companyPunch).status, "Pending");
  assert.equal(h.records.get(h.employeePunch).status, "Pending");
  assert.equal(h.records.has(h.companyAttendance), false);
});
for (const options of [{ missingEmployee: true }, { punch: { employeeFirestoreId: "other" } }, { punch: { employeeFirestoreId: "../other" } }, { punch: { companyId: "tenant-b" } }, { mirror: { employeeFirestoreId: "other" } }]) {
  test(`invalid employee or tenant fails without writes: ${JSON.stringify(options)}`, async () => {
    const h = harness(options); await assert.rejects(h.decide(), { message: "INVALID_GPS_EMPLOYEE" });
    assert.equal(h.commits.length, 0);
  });
}
test("caller cannot choose a different tenant or employee", async () => {
  const h = harness(); await h.decide("approved", { companyId: "tenant-b", employeeFirestoreId: "other" });
  assert.ok(h.commits[0].every((write) => write.path.startsWith("Companies/tenant-a/")));
});
test("review permission remains required", async () => {
  const h = harness({ permitted: false }); await assert.rejects(h.decide(), { message: "FORBIDDEN" });
  assert.equal(h.commits.length, 0);
});
test("already reviewed employee mirror cannot be overwritten", async () => {
  const h = harness({ mirror: { reviewStatus: "Rejected" } });
  await assert.rejects(h.decide(), { message: "GPS_ALREADY_DECIDED" });
  assert.equal(h.commits.length, 0);
});
test("invalid IN time fails atomically", async () => {
  const h = harness({ punch: { type: "IN", time: "invalid" } });
  await assert.rejects(h.decide(), { message: "INVALID_GPS_ATTENDANCE" });
  assert.equal(h.commits.length, 0);
});

test("approved OUT after approved IN closes both copies with policy hours and status", async () => {
  const first = harness({ punch: { type: "IN" } });
  await first.decide();
  const existing = first.records.get(first.companyAttendance);
  const end = Timestamp.fromDate(new Date("2026-09-18T12:30:00Z"));
  const h = harness({ punch: { time: end }, attendance: existing });
  await h.decide();
  const attendance = h.records.get(h.companyAttendance);
  assert.deepEqual(attendance, h.records.get(h.employeeAttendancePath));
  assert.deepEqual(attendance.checkIn, first.time);
  assert.deepEqual(attendance.checkOut, end);
  assert.equal(attendance.workedMinutes, 510);
  assert.equal(attendance.totalHours, 8.5);
  assert.equal(attendance.status, "late");
  assert.equal(h.records.get(h.companyPunch).status, "Approved");
  assert.equal(h.records.get(h.employeePunch).status, "Approved");
  assert.equal(h.records.get(h.companyPunch).attendanceMarked, true);
  assert.equal(h.commits.length, 1);
});

for (const checkIn of [undefined, "invalid", Timestamp.fromDate(new Date("2026-09-18T05:00:00Z"))]) {
  test(`OUT with missing, invalid or later IN creates no attendance: ${String(checkIn)}`, async () => {
    const attendance = checkIn ? { checkIn, status: "absent" } : null;
    const h = harness({ attendance });
    await h.decide();
    assert.deepEqual(h.records.get(h.companyAttendance), attendance || undefined);
    assert.deepEqual(h.records.get(h.employeeAttendancePath), attendance || undefined);
    assert.equal(h.records.get(h.employeePunch).status, "Approved");
    assert.equal(h.records.get(h.companyPunch).attendanceMarked, false);
  });
}

test("OUT preserves existing machine and app punches", async () => {
  const attendance = { checkIn: Timestamp.fromDate(new Date("2026-09-18T01:00:00Z")), checkOut: Timestamp.fromDate(new Date("2026-09-18T03:00:00Z")), checkInSource: "hardware", checkOutSource: "app", status: "absent" };
  const h = harness({ attendance }); await h.decide();
  assert.deepEqual(h.records.get(h.companyAttendance), attendance);
  assert.deepEqual(h.records.get(h.employeeAttendancePath), attendance);
});

test("OUT uses mirror-only check-in and ShiftPolicy break, cap and overtime", async () => {
  const attendance = { checkIn: Timestamp.fromDate(new Date("2026-09-18T01:00:00Z")), checkInSource: "app" };
  const h = harness({ employeeAttendance: attendance });
  h.records.set("Companies/tenant-a/ShiftPolicies/shift", { active: true, attendance: { maximumWorkingHours: 90 }, break: { enabled: true, duration: 30 }, payroll: { allowOvertime: true, overtimeAfter: 120 } });
  await h.decide();
  const result = h.records.get(h.companyAttendance);
  assert.deepEqual(result, h.records.get(h.employeeAttendancePath));
  assert.deepEqual(result.checkIn, attendance.checkIn);
  assert.equal(result.checkInSource, "app");
  assert.equal(result.actualWorkingMinutes, 150);
  assert.equal(result.workedMinutes, 90);
  assert.equal(result.totalHours, 1.5);
  assert.equal(result.status, "pending");
  assert.equal(result.requiresManagerReview, true);
  assert.equal(result.overtimeMinutes, 30);
});

test("rejected OUT does not change existing attendance", async () => {
  const attendance = { checkIn: Timestamp.fromDate(new Date("2026-09-18T01:00:00Z")) };
  const h = harness({ attendance }); await h.decide("rejected");
  assert.deepEqual(h.records.get(h.companyAttendance), attendance);
  assert.deepEqual(h.records.get(h.employeeAttendancePath), attendance);
});

test("OUT commit failure rolls back GPS and both attendance copies", async () => {
  const attendance = { checkIn: Timestamp.fromDate(new Date("2026-09-18T01:00:00Z")) };
  const h = harness({ attendance, failCommit: true });
  await assert.rejects(h.decide(), /commit failed/);
  assert.deepEqual(h.records.get(h.companyAttendance), attendance);
  assert.deepEqual(h.records.get(h.employeeAttendancePath), attendance);
  assert.equal(h.records.get(h.companyPunch).status, "Pending");
  assert.equal(h.records.get(h.employeePunch).status, "Pending");
});


const { repairApprovedGpsAttendance } = require("../src/workforce/RepairApprovedGpsAttendance");
const approved = { status: "Approved", reviewStatus: "Approved", approvalStatus: "Approved", decision: "approved", approvedBy: "original-reviewer", reviewedByUid: "original-reviewer", reviewRemarks: "Original review" };
const repair = (h, extra = {}) => repairApprovedGpsAttendance(h.db, { companyId: "tenant-a", gpsPunchId: "punch-a", dryRun: false, ...extra });

test("repair approved IN then OUT on 18 Sep, retaining original GPS review and idempotency", async () => {
  const h = harness({ punch: { ...approved, type: "IN", attendanceMarked: true } });
  const beforeGps = h.records.get(h.companyPunch);
  assert.equal((await repair(h)).outcome, "repaired");
  assert.deepEqual(h.records.get(h.companyAttendance).checkIn, h.time);
  assert.deepEqual(h.records.get(h.companyAttendance), h.records.get(h.employeeAttendancePath));
  assert.deepEqual(h.records.get(h.companyPunch), { ...beforeGps, attendanceMarked: true, attendanceId: "2026-09-18" });
  assert.deepEqual(h.records.get(h.companyPunch), h.records.get(h.employeePunch));
  const out = { ...beforeGps, type: "OUT", time: Timestamp.fromDate(new Date("2026-09-18T12:30:00Z")) };
  h.records.set(h.companyPunch.replace("punch-a", "punch-out"), out);
  h.records.set(h.employeePunch.replace("punch-a", "punch-out"), out);
  await repair(h, { gpsPunchId: "punch-out" });
  const result = h.records.get(h.companyAttendance);
  assert.deepEqual(result, h.records.get(h.employeeAttendancePath));
  assert.deepEqual(result.checkIn, h.time);
  assert.deepEqual(result.checkOut, out.time);
  assert.equal(result.totalHours, 8.5);
  assert.equal(result.status, "late");
  const recordsBeforeRepeat = new Map(h.records);
  assert.equal((await repair(h)).outcome, "unchanged");
  assert.equal((await repair(h, { gpsPunchId: "punch-out" })).outcome, "unchanged");
  assert.deepEqual(h.records, recordsBeforeRepeat);
  assert.equal(h.commits.at(-1).length, 0);
});

test("repair dry run and orphan OUT make no writes", async () => {
  const h = harness({ punch: { ...approved, type: "IN" } });
  assert.equal((await repair(h, { dryRun: true })).outcome, "would-repair");
  assert.equal(h.commits[0].length, 0);
  assert.equal(h.records.has(h.companyAttendance), false);
  const orphan = harness({ punch: approved });
  assert.equal((await repair(orphan)).outcome, "unchanged");
  assert.equal(orphan.records.has(orphan.companyAttendance), false);
});

test("repair preserves existing machine/app punches and metadata, restoring missing mirror only", async () => {
  const existing = { checkIn: Timestamp.fromDate(new Date("2026-09-18T01:00:00Z")), checkOut: Timestamp.fromDate(new Date("2026-09-18T03:00:00Z")), checkInSource: "hardware", checkOutSource: "app", approvalStatus: "rejected", custom: "retain", status: "absent" };
  const h = harness({ punch: approved, attendance: existing, employeeAttendance: null });
  await repair(h);
  assert.deepEqual(h.records.get(h.companyAttendance), existing);
  const mirror = h.records.get(h.employeeAttendancePath);
  assert.deepEqual(mirror.checkIn, existing.checkIn);
  assert.deepEqual(mirror.checkOut, existing.checkOut);
  assert.equal(mirror.checkInSource, "hardware");
  assert.equal(mirror.checkOutSource, "app");
  assert.equal(mirror.custom, "retain");
  assert.equal(mirror.approvalStatus, "rejected");
  assert.equal(mirror.totalHours, 2);
});

test("repair missing IN preserves preexisting OUT and recalculates status", async () => {
  const checkOut = Timestamp.fromDate(new Date("2026-09-18T12:30:00Z"));
  const h = harness({ punch: { ...approved, type: "IN" }, attendance: { checkIn: null, checkOut, checkOutSource: "app", status: "absent", notes: "retain" } });
  await repair(h);
  const result = h.records.get(h.companyAttendance);
  assert.deepEqual(result.checkOut, checkOut);
  assert.equal(result.checkOutSource, "app");
  assert.equal(result.totalHours, 8.5);
  assert.equal(result.status, "late");
  assert.equal(result.notes, "retain");
  assert.deepEqual(result, h.records.get(h.employeeAttendancePath));
});

for (const options of [
  { punch: { status: "Pending", reviewStatus: "pending", approvalStatus: "pending" } },
  { punch: { ...approved, decision: "rejected" } },
  { punch: { ...approved, companyId: "tenant-b" } },
  { punch: { ...approved, employeeFirestoreId: "../other" } },
  { punch: { ...approved, date: "2026-09-17" } },
  { punch: approved, mirror: { reviewStatus: "Rejected" } },
  { punch: approved, attendance: { companyId: "tenant-b" } },
  { punch: approved, missingEmployee: true },
]) {
  test(`repair rejects unsafe or unapproved target: ${JSON.stringify(options)}`, async () => {
    const h = harness(options);
    const before = new Map(h.records);
    await assert.rejects(repair(h));
    assert.deepEqual(h.records, before);
    assert.equal(h.commits.length, 0);
  });
}

test("repair is scoped to explicit tenant and rolls back on commit failure", async () => {
  const h = harness({ punch: { ...approved, type: "IN" } });
  await assert.rejects(repair(h, { companyId: "tenant-b" }), /GPS_NOT_FOUND/);
  await assert.rejects(repair(h, { companyId: "tenant-a/other" }), /INVALID_REPAIR_TARGET/);
  const failed = harness({ punch: { ...approved, type: "IN" }, failCommit: true });
  const before = new Map(failed.records);
  await assert.rejects(repair(failed), /commit failed/);
  assert.deepEqual(failed.records, before);
});
