import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { attendanceDayKey, attendanceEmployeeKeys, toAttendanceDate } from "./attendanceDateTime";

const names = ["Usermanagement", "Attendance", "GPSPunches", "LeaveRequests", "WorkLogs", "ShiftPolicies", "Holidays", "advance_requests", "Payroll"];
export function subscribeWorkforce(companyId, allowedNames, onData, onError) {
  const state = Object.fromEntries(names.map((name) => [name, []]));
  const subscriptions = names.filter((name) => allowedNames.has(name));
  if (!subscriptions.length) onData({ ...state });
  const stops = subscriptions.map((name) => onSnapshot(collection(db, "Companies", companyId, name), (snapshot) => {
    state[name] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    onData({ ...state });
  }, (error) => onError?.(name, error)));
  return () => stops.forEach((stop) => stop());
}

export const toDate = toAttendanceDate;
export const dayKey = attendanceDayKey;
export const employeeName = (item) => item.employeeName || item.personalInfo?.fullName || item.fullName || item.name || "Employee";

export function workforceMetrics(data) {
  const today = dayKey(new Date());
  const employees = data.Usermanagement || [], attendance = data.Attendance || [], leaves = data.LeaveRequests || [], logs = data.WorkLogs || [];
  const active = employees.filter((item) => String(item.employment?.status || item.status || "active").toLowerCase() !== "inactive");
  const todayAttendance = attendance.filter((item) => dayKey(item.date || item.checkIn || item.createdAt) === today).sort((a, b) => (toDate(b.checkIn)?.getTime() || 0) - (toDate(a.checkIn)?.getTime() || 0));
  const normalizedStatus = (item) => String(item.status || "").toLowerCase().replace(/[ _-]/g, "");
  const employeeKey = (item) => attendanceEmployeeKeys(item)[0];
  const presentIds = new Set(todayAttendance.filter((item) => ["present", "late"].includes(normalizedStatus(item))).map(employeeKey).filter(Boolean));
  const halfDayIds = new Set(todayAttendance.filter((item) => normalizedStatus(item) === "halfday").map(employeeKey).filter(Boolean));
  const explicitAbsentIds = new Set(todayAttendance.filter((item) => normalizedStatus(item) === "absent").map(employeeKey).filter(Boolean));
  const onLeave = leaves.filter((item) => String(item.status).toLowerCase() === "approved" && dayKey(item.fromDate || item.startDate) <= today && dayKey(item.toDate || item.endDate) >= today);
  const leaveIds = new Set(onLeave.map((item) => item.employeeFirestoreId || item.employeeId).filter(Boolean).map(String));
  const todayLogs = logs.filter((item) => dayKey(item.date || item.startTime || item.createdAt) === today);
  const accountedIds = new Set([...presentIds, ...halfDayIds, ...leaveIds]);
  const missing = active.filter((item) => !accountedIds.has(String(item.id)) && !accountedIds.has(String(item.employeeId || item.login?.employeeId || ""))).length;
  const checkedIn = todayAttendance.filter((item) => item.checkIn).length;
  const checkedOut = todayAttendance.filter((item) => item.checkOut).length;
  const pendingReview = (item) => String(item.reviewStatus || item.approvalStatus || item.decision || "pending").toLowerCase() === "pending";
  return { employees, active, todayAttendance, onLeave, todayLogs, summary: { total: active.length, active: active.length, present: presentIds.size, halfDay: halfDayIds.size, late: todayAttendance.filter((item) => Number(item.lateMinutes || 0) > 0 || item.isLate || normalizedStatus(item) === "late").length, absent: Math.max(explicitAbsentIds.size, missing), leave: leaveIds.size, checkedIn, checkedOut, working: todayAttendance.filter((item) => item.checkIn && !item.checkOut).length, pendingLeave: leaves.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length, gpsReview: (data.GPSPunches || []).filter((item) => dayKey(item.date || item.checkIn) === today && pendingReview(item) && (item.gpsValid === false || item.outsideRadius)).length } };
}
