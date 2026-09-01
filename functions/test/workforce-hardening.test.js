"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { resolveEffectiveShift, statusFor } = require("../src/shift_policy_resolver");
const { leaveDays, scheduledDaysFor, calculatePayrollRow } = require("../src/workforce/WorkforceFunctions");

const shift = (id, startTime) => ({ id, active: true, basic: { status: "active", name: id }, timing: { startTime, endTime: "18:00" }, attendance: { minimumWorkingHours: "8h", halfDayHours: "4h", absentHours: "2h" }, weeklyOff: { primary: "Sunday" } });

test("employee-aware shift resolution keeps two employee assignments independent", () => {
  const shifts = [shift("morning", "09:00"), shift("late", "12:00")];
  assert.equal(resolveEffectiveShift({ employment: { shiftPolicyId: "morning" } }, {}, shifts).id, "morning");
  assert.equal(resolveEffectiveShift({ employment: { shiftPolicyId: "late" } }, {}, shifts).id, "late");
});

test("shift resolution order is assignment, company, marked default, single active", () => {
  const assigned = shift("assigned", "09:00"), company = shift("company", "10:00"), fallback = { ...shift("fallback", "11:00"), isDefault: true };
  assert.equal(resolveEffectiveShift({ employment: { shiftPolicyId: "assigned" } }, { defaultShiftPolicyId: "company" }, [assigned, company, fallback]).id, "assigned");
  assert.equal(resolveEffectiveShift({}, { defaultShiftPolicyId: "company" }, [assigned, company, fallback]).id, "company");
  assert.equal(resolveEffectiveShift({}, {}, [assigned, fallback]).id, "fallback");
  assert.equal(resolveEffectiveShift({}, {}, [assigned]).id, "assigned");
});

test("missing checkout is pending and is never counted as present payroll", () => {
  const row = calculatePayrollRow({ employee: { compensation: { monthlySalary: 26000 } }, attendance: [{ date: "2026-08-01", checkIn: {}, status: "pending" }], leaves: [], advances: [], month: "2026-08", holidays: new Set(), weeklyOff: "Sunday" });
  assert.equal(row.presentDays, 0);
  assert.equal(row.pendingDays, 1);
  assert.equal(row.payableDays, 0);
});

test("payroll distinguishes present, half day, absent and approved leave", () => {
  const row = calculatePayrollRow({ employee: { compensation: { monthlySalary: 26000, pfEnabled: true, pfAmount: 1000, esiEnabled: true, esiAmount: 250 } }, attendance: [{ status: "present", checkOut: {} }, { status: "halfday", checkOut: {} }, { status: "absent", checkOut: {} }], leaves: [{ status: "Approved", leaveType: "Paid", totalDays: 1 }], advances: [], month: "2026-08", holidays: new Set(), weeklyOff: "Sunday" });
  assert.equal(row.presentDays, 1);
  assert.equal(row.halfDays, 1);
  assert.equal(row.absentDays, 1);
  assert.equal(row.paidLeaveDays, 1);
  assert.equal(row.payableDays, 2.5);
  assert.equal(row.pfDeduction, 1000);
  assert.equal(row.esiDeduction, 250);
});

test("leave day calculation is inclusive", () => {
  assert.equal(leaveDays({ fromDate: "2026-08-20", toDate: "2026-08-22" }), 3);
  assert.equal(leaveDays({ totalDays: 0.5 }), 0.5);
});

test("weekly off and holiday reduce scheduled days", () => {
  assert.equal(scheduledDaysFor("2026-08", "Sunday", new Set(["2026-08-15"])), 25);
});

test("client rules keep Workforce decisions and payroll server-owned", () => {
  const rules = fs.readFileSync(path.join(__dirname, "../../firestore.rules"), "utf8");
  assert.match(rules, /keepsGpsReviewServerOwned/);
  assert.match(rules, /keepsLeaveDecisionServerOwned/);
  assert.match(rules, /match \/Payroll\/\{id\} \{ allow read:[^}]+allow write: if false;/);
});

test("biometric status thresholds do not treat insufficient work as present", () => {
  const policy = resolveEffectiveShift({}, {}, [shift("only", "09:00")]);
  assert.equal(statusFor(policy, 60, false), "absent");
  assert.equal(statusFor(policy, 300, false), "halfday");
  assert.equal(statusFor(policy, 480, true), "late");
});
