import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const names = ["Usermanagement", "Attendance", "GPSPunches", "LeaveRequests", "WorkLogs", "ShiftPolicies", "Holidays", "advance_requests", "Payroll"];
export function subscribeWorkforce(companyId, onData, onError) {
  const state = Object.fromEntries(names.map((name) => [name, []]));
  const stops = names.map((name) => onSnapshot(collection(db, "Companies", companyId, name), (snapshot) => {
    state[name] = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    onData({ ...state });
  }, (error) => onError?.(name, error)));
  return () => stops.forEach((stop) => stop());
}

export const toDate = (value) => { if (!value) return null; if (typeof value?.toDate === "function") return value.toDate(); const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date; };
export const dayKey = (value) => { const date = toDate(value); if (!date) return typeof value === "string" ? value.slice(0, 10) : ""; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
export const employeeName = (item) => item.employeeName || item.personalInfo?.fullName || item.fullName || item.name || "Employee";

export function workforceMetrics(data) {
  const today = dayKey(new Date());
  const employees = data.Usermanagement || [], attendance = data.Attendance || [], leaves = data.LeaveRequests || [], logs = data.WorkLogs || [];
  const active = employees.filter((item) => String(item.employment?.status || item.status || "active").toLowerCase() !== "inactive");
  const todayAttendance = attendance.filter((item) => dayKey(item.date || item.checkIn || item.createdAt) === today);
  const presentIds = new Set(todayAttendance.filter((item) => item.checkIn || ["present", "late", "half day"].includes(String(item.status).toLowerCase())).map((item) => item.employeeFirestoreId || item.employeeId));
  const onLeave = leaves.filter((item) => String(item.status).toLowerCase() === "approved" && dayKey(item.fromDate || item.startDate) <= today && dayKey(item.toDate || item.endDate) >= today);
  const leaveIds = new Set(onLeave.map((item) => item.employeeFirestoreId || item.employeeId));
  const todayLogs = logs.filter((item) => dayKey(item.date || item.startTime || item.createdAt) === today);
  return { employees, active, todayAttendance, onLeave, todayLogs, summary: { total: employees.length, active: active.length, present: presentIds.size, late: todayAttendance.filter((item) => item.isLate || String(item.status).toLowerCase() === "late").length, absent: Math.max(0, active.length - presentIds.size - leaveIds.size), leave: leaveIds.size, working: todayLogs.filter((item) => item.startTime && !item.endTime).length, pendingLeave: leaves.filter((item) => String(item.status || "pending").toLowerCase() === "pending").length, gpsReview: (data.GPSPunches || todayAttendance).filter((item) => dayKey(item.date || item.checkIn) === today && (item.gpsValid === false || item.outsideRadius)).length } };
}
