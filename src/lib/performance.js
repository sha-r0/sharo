import { attendanceDayKey, attendanceEmployeeKeys } from "../app/(dashboard)/manager/Workforce/services/attendanceDateTime.js";
import { asDate as dashboardDate } from "../app/(dashboard)/manager/dashboard/dashboardMetrics.js";


const lower = (value) => String(value || "").trim().toLowerCase();
const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

export const PERFORMANCE_WEIGHTS = {
  attendance: 40,
  punctuality: 20,
  workExecution: 25,
  projectParticipation: 15,
};

// Calendar arithmetic uses local midnight; timestamp conversion uses SHARO's
// shared attendance timezone, independent of the server's timezone.
export function dateKey(value) {
  if (!value) return "";
  const parsed = dashboardDate(value);
  if (!parsed || !Number.isFinite(parsed.getTime())) return "";
  return attendanceDayKey(typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : parsed);
}
export function asDate(value) {
  const key = dateKey(value);
  return key ? new Date(`${key}T00:00:00`) : null;
}
function calendarKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function compareDates(left, right) {
  return (left?.getTime?.() || 0) - (right?.getTime?.() || 0);
}

function periodLabel(periodRange) {
  if (!periodRange) return "Selected period";
  if (periodRange.period === "month") {
    return periodRange.startDate?.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) || "Month";
  }
  if (periodRange.period === "quarter") {
    return `Q${periodRange.quarter} ${periodRange.year}`;
  }
  if (periodRange.period === "year") {
    return String(periodRange.year || "");
  }
  return "Selected period";
}

function makeRange({ startDate, endDate, period, year, month, quarter }) {
  const safeStart = startOfLocalDay(startDate);
  const safeEnd = endOfLocalDay(endDate);
  return {
    period,
    year,
    month,
    quarter,
    startDate: safeStart,
    endDate: safeEnd,
    startKey: calendarKey(safeStart),
    endKey: calendarKey(safeEnd),
    label: periodLabel({ period, year, month, quarter, startDate: safeStart, endDate: safeEnd }),
  };
}

export function getPerformancePeriodRange({ period = "month", year, month, quarter } = {}, now = new Date()) {
  if (!["month", "quarter", "year"].includes(period)) throw new Error("INVALID_PERFORMANCE_PERIOD");
  for (const [value, min, max] of [[year, 1900, 2200], [month, 1, 12], [quarter, 1, 4]]) {
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < min || Number(value) > max)) throw new Error("INVALID_PERFORMANCE_PERIOD");
  }
  const current = asDate(now) || new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth() + 1;

  if (period === "quarter") {
    const resolvedYear = Number(year) || currentYear;
    const resolvedQuarter = Math.min(4, Math.max(1, Number(quarter) || Math.floor((currentMonth - 1) / 3) + 1));
    const startMonth = (resolvedQuarter - 1) * 3;
    return makeRange({
      period: "quarter",
      year: resolvedYear,
      quarter: resolvedQuarter,
      startDate: new Date(resolvedYear, startMonth, 1),
      endDate: new Date(resolvedYear, startMonth + 3, 0),
    });
  }

  if (period === "year") {
    const resolvedYear = Number(year) || currentYear;
    return makeRange({
      period: "year",
      year: resolvedYear,
      startDate: new Date(resolvedYear, 0, 1),
      endDate: new Date(resolvedYear, 11, 31),
    });
  }

  const resolvedYear = Number(year) || currentYear;
  const resolvedMonth = Math.min(12, Math.max(1, Number(month) || currentMonth));
  return makeRange({
    period: "month",
    year: resolvedYear,
    month: resolvedMonth,
    startDate: new Date(resolvedYear, resolvedMonth - 1, 1),
    endDate: new Date(resolvedYear, resolvedMonth, 0),
  });
}

export function getPreviousEquivalentPeriodRange(periodRange, now = new Date()) {
  if (!periodRange) return null;
  if (periodRange.period === "quarter") {
    const previousQuarter = periodRange.quarter === 1 ? 4 : periodRange.quarter - 1;
    const year = periodRange.quarter === 1 ? periodRange.year - 1 : periodRange.year;
    return getPerformancePeriodRange({ period: "quarter", year, quarter: previousQuarter }, now);
  }
  if (periodRange.period === "year") {
    return getPerformancePeriodRange({ period: "year", year: periodRange.year - 1 }, now);
  }
  const previousMonth = periodRange.month === 1 ? 12 : periodRange.month - 1;
  const year = periodRange.month === 1 ? periodRange.year - 1 : periodRange.year;
  return getPerformancePeriodRange({ period: "month", year, month: previousMonth }, now);
}

function employeeKeys(employee = {}) {
  return new Set(
    [employee.id, employee.firestoreId, employee.employeeId, employee.login?.employeeId, employee.access?.authUid]
      .filter(Boolean)
      .map((value) => String(value).trim())
  );
}

function recordEmployeeKeys(record = {}) {
  return attendanceEmployeeKeys(record);
}

function employeeAssignedToProject(employee, project) {
  const ids = employeeKeys(employee);
  return (project?.employees || []).some((item) =>
    [item.firestoreId, item.id, item.employeeId].filter(Boolean).some((value) => ids.has(String(value).trim()))
  );
}

function projectsForEmployee(employee, projects = []) {
  return projects.filter((project) => employeeAssignedToProject(employee, project));
}

function recordProjectKeys(record = {}) {
  return [record.projectFirestoreId, record.projectId, record.project?.id, record.project?.projectId]
    .filter(Boolean)
    .map((value) => String(value).trim());
}

function employeeMatchesRecord(employee, record) {
  const employeeSet = employeeKeys(employee);
  if (record.employeeFirestoreId) return String(record.employeeFirestoreId) === String(employee.id);
  return recordEmployeeKeys(record).some((value) => employeeSet.has(value));
}

function normalizeAttendanceStatus(item = {}) {
  return lower(item.status || item.checkInStatus || item.approvalStatus || "");
}

function normalizeWorkStatus(item = {}) {
  return lower(item.status || item.workStatus || "");
}

function normalizeLeaveStatus(item = {}) {
  return lower(item.status || "");
}

function normalizeDayName(value) {
  const text = lower(value);
  if (!text) return "";
  if (text.startsWith("sun")) return "sunday";
  if (text.startsWith("mon")) return "monday";
  if (text.startsWith("tue")) return "tuesday";
  if (text.startsWith("wed")) return "wednesday";
  if (text.startsWith("thu")) return "thursday";
  if (text.startsWith("fri")) return "friday";
  if (text.startsWith("sat")) return "saturday";
  return text;
}

export function resolveEmployeeShiftPolicy(employee = {}, shiftPolicies = []) {
  const direct = employee.shiftPolicy || employee.employment?.shiftPolicy || null;
  if (direct && typeof direct === "object") return direct;
  const requested = lower(employee.employment?.shift || employee.shift || employee.employment?.shiftPolicyId || employee.shiftPolicyId || "");
  if (!requested) return null;
  return shiftPolicies.find((policy) => {
    const values = [
      policy.id,
      policy.basic?.code,
      policy.basic?.name,
      policy.name,
      policy.code,
    ].filter(Boolean).map((value) => lower(value));
    return values.includes(requested);
  }) || null;
}

export function isWeeklyOff(date, shiftPolicy) {
  if (!shiftPolicy) return false;
  const current = typeof date === "string" ? new Date(`${date.slice(0,10)}T00:00:00`) : date;
  const day = current.getDay();
  const weekly = shiftPolicy.weeklyOff || shiftPolicy;
  const name = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day];
  const selected = weekly[name] === true || [weekly.primary, weekly.secondary].some(value => normalizeDayName(value) === name);
  const weeks = shiftPolicy.saturdayWeeks || weekly.saturdayWeeks || weekly.weeks || [];
  return selected && (day !== 6 || !weeks.length || weeks.map(Number).includes(Math.ceil(current.getDate()/7)));
}

function buildDateKeys(startDate, endDate) {
  const keys = [];
  for (let cursor = startOfLocalDay(startDate); compareDates(cursor, endDate) <= 0; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
    keys.push(calendarKey(cursor));
  }
  return keys;
}

function leaveDaysForEmployee(employee, leaves = [], range) {
  const days = new Set();
  leaves.filter((item) => normalizeLeaveStatus(item) === "approved" && employeeMatchesRecord(employee, item)).forEach((item) => {
    const from = asDate(item.fromDate || item.startDate || item.date);
    const to = asDate(item.toDate || item.endDate || item.date || item.fromDate || item.startDate);
    if (!from || !to) return;
    const start = calendarKey(from) < range.startKey ? range.startDate : startOfLocalDay(from);
    const end = calendarKey(to) > range.endKey ? range.endDate : endOfLocalDay(to);
    for (let cursor = startOfLocalDay(start); compareDates(cursor, end) <= 0; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
      days.add(calendarKey(cursor));
    }
  });
  return days;
}

function holidayDays(holidays = [], range) {
  return new Set(holidays.map((item) => dateKey(item.date || item.holidayDate || item.startDate)).filter((key) => key && key >= range.startKey && key <= range.endKey));
}

function attendanceRecordsForEmployee(employee, attendance = [], range) {
  return attendance.filter((item) => employeeMatchesRecord(employee, item) && (dateKey(item.date || item.checkIn || item.createdAt) >= range.startKey && dateKey(item.date || item.checkIn || item.createdAt) <= range.endKey));
}

function workLogsForEmployee(employee, workLogs = [], range) {
  return workLogs.filter((item) => employeeMatchesRecord(employee, item) && (dateKey(item.date || item.workDate || item.createdAt || item.startTime || item.checkIn) >= range.startKey && dateKey(item.date || item.workDate || item.createdAt || item.startTime || item.checkIn) <= range.endKey));
}

function workingUnitsFromAttendance(record = {}) {
  const status = normalizeAttendanceStatus(record).replace(/[ _-]/g, "");
  if (status === "halfday" || status === "half day" || status === "half_day") return 0.5;
  if (status === "present" || status === "late") return 1;
  return !status && record.checkIn ? 1 : 0;
}

function isLateArrival(record = {}) {
  const status = normalizeAttendanceStatus(record).replace(/[ _-]/g, "");
  return status === "late" || Number(record.lateMinutes || 0) > 0 || record.isLate === true;
}

function completedWorkUnits(workLogs = []) {
  const units = item => Math.max(0, number(item.completedTasks)) || (["completed", "done"].includes(normalizeWorkStatus(item)) ? 1 : 0);
  return { completedLogs: workLogs.filter(item => units(item) > 0).length, completedWork: workLogs.reduce((sum,item) => sum + units(item), 0), totalLogs: workLogs.length };
}
function computeWeightedScore(metrics) {
  return round1(Object.entries(PERFORMANCE_WEIGHTS).reduce((sum, [key, weight]) => sum + metrics[`${key}Score`] * weight / 100, 0));
}
const isActive = employee => employee.isActive !== false && ["active", "enabled"].includes(lower(employee.employment?.status || employee.status || employee.access?.status || "active"));
function calculateEmployeePerformanceRow({
  employee,
  attendance = [],
  workLogs = [],
  projects = [],
  leaves = [],
  holidays = [],
  shiftPolicies = [],
  range,
  comparisonRange = null,
  now = new Date(),
}) {
  const joiningDate = asDate(employee.employment?.joiningDate || employee.joiningDate || employee.joinDate);
  const effectiveStart = joiningDate && calendarKey(joiningDate) > range.startKey ? startOfLocalDay(joiningDate) : range.startDate;
  const effectiveRange = makeRange({
    period: range.period,
    year: range.year,
    month: range.month,
    quarter: range.quarter,
    startDate: effectiveStart,
    endDate: range.endKey < dateKey(now) ? range.endDate : asDate(now),
  });
  const employeeAttendance = attendanceRecordsForEmployee(employee, attendance, effectiveRange);
  const employeeWorkLogs = workLogsForEmployee(employee, workLogs, effectiveRange);
  const employeeProjects = projectsForEmployee(employee, projects).filter(project => {
    const start = dateKey(project.startDate || project.createdAt);
    const end = dateKey(project.actualEndDate || project.completedAt || project.endDate);
    return start && start <= effectiveRange.endKey && (!end || end >= effectiveRange.startKey);
  });
  const shiftPolicy = resolveEmployeeShiftPolicy(employee, shiftPolicies);
  const holidaySet = holidayDays(holidays, effectiveRange);
  const leaveSet = leaveDaysForEmployee(employee, leaves, effectiveRange);
  const days = buildDateKeys(effectiveRange.startDate, effectiveRange.endDate);

  let eligibleWorkingDays = 0;
  let presentDays = 0;
  let lateArrivals = 0;
  let attendanceClockedDays = 0;
  let onTimeDays = 0;

  const attendanceByDay = new Map();
  employeeAttendance.forEach((record) => {
    const day = dateKey(record.date || record.checkIn || record.createdAt);
    if (!day) return;
    const current = attendanceByDay.get(day) || [];
    current.push(record);
    attendanceByDay.set(day, current);
  });

  const attendanceTrendMap = new Map();

  days.forEach((day) => {
    const date = new Date(`${day}T00:00:00`);
    const neutral = holidaySet.has(day) || isWeeklyOff(date, shiftPolicy) || leaveSet.has(day);
    const records = attendanceByDay.get(day) || [];
    const record = [...records].sort((a,b) => (dashboardDate(b.updatedAt)?.getTime() || 0) - (dashboardDate(a.updatedAt)?.getTime() || 0) || String(a.id || "").localeCompare(String(b.id || "")))[0] || null;
    const hasAttendance = Boolean(record);
    if (!neutral) eligibleWorkingDays += 1;
    if (hasAttendance && !neutral) {
      const units = workingUnitsFromAttendance(record);
      presentDays += units;
      if (units > 0) attendanceClockedDays += 1;
      if (units > 0 && isLateArrival(record)) lateArrivals += 1;
      if (units > 0 && !isLateArrival(record)) onTimeDays += 1;
      attendanceTrendMap.set(day, { attendanceScore: units * 100 });
    } else {
      attendanceTrendMap.set(day, { attendanceScore: neutral ? null : 0 });
    }
  });

  const scheduled = new Set(days.filter(day => !holidaySet.has(day) && !leaveSet.has(day) && !isWeeklyOff(day, shiftPolicy)));
  const logs = employeeWorkLogs.filter(log => scheduled.has(dateKey(log.date || log.workDate || log.startTime || log.createdAt)) && (["completed", "done", "working", "active", "in progress", "paused", "pending", "cancelled"].includes(normalizeWorkStatus(log)) || Number.isFinite(log.completedTasks)));
  const completed = completedWorkUnits(logs);
  const completedWork = completed.completedWork;
  const projectIds = new Set(employeeProjects.map(project => project.id));
  for (const log of employeeWorkLogs) {
    const project = projects.find(project => recordProjectKeys(log).some(key => key === String(project.id) || key === String(project.projectId)));
    if (project) projectIds.add(project.id);
  }
  const attendancePercent = eligibleWorkingDays ? round1(Math.min(100, presentDays / eligibleWorkingDays * 100)) : null;
  const punctualityScore = attendanceClockedDays ? round1(onTimeDays / attendanceClockedDays * 100) : null;
  const logDays = new Set(logs.map(log => dateKey(log.date || log.workDate || log.startTime || log.createdAt))).size;
  const recordedDays = [...scheduled].filter(day => attendanceByDay.has(day)).length;
  // Require five scheduled days and 80% attendance + completion-schema coverage.
  // Partial means some evidence exists, but cannot support a fair overall score.
  const sufficient = Boolean(shiftPolicy && eligibleWorkingDays >= 5 && recordedDays / eligibleWorkingDays >= 0.8 && logDays / eligibleWorkingDays >= 0.8 && attendanceClockedDays > 0);
  const dataCoverage = sufficient ? "good" : recordedDays || logDays ? "partial" : "insufficient";
  const workExecutionScore = sufficient ? round1(completed.completedLogs / Math.max(1, completed.totalLogs) * 100) : null;
  const projectCount = projectIds.size;
  const projectParticipationScore = Math.min(100, projectCount * 25);
  const rankingEligible = isActive(employee) && sufficient;
  const overallScore = sufficient ? computeWeightedScore({ attendanceScore: attendancePercent, punctualityScore, workExecutionScore, projectParticipationScore }) : null;

  const current = {
    employeeFirestoreId: employee.id,
    employeeId: employee.employeeId || employee.login?.employeeId || "",
    fullName: employee.personalInfo?.fullName || employee.fullName || employee.name || "Employee",
    department: employee.employment?.department || employee.department || "",
    designation: employee.employment?.designation || employee.designation || "",
    attendancePercent,
    attendanceScore: attendancePercent,
    punctualityScore,
    lateArrivals,
    workExecutionScore,
    completedWork,
    projectParticipationScore,
    projectCount,
    eligibleWorkingDays,
    presentDays: round1(presentDays),
    approvedLeave: leaveSet.size,
    dataCoverage,
    rankingEligible,
    overallScore,
    currentPeriod: effectiveRange.label,
    trendChange: null,
    trendDirection: null,
    attendanceTrend: days.filter(day => scheduled.has(day) && attendanceByDay.has(day)).map((day) => ({ label: day.slice(5), value: attendanceTrendMap.get(day)?.attendanceScore ?? 0 })),
    performanceTrend: [],
    coverageReason: sufficient ? null : "Requires a known schedule, at least 5 eligible days, and attendance and structured work logs on at least 80% of eligible days.",
  };

  if (comparisonRange) {
    const previous = calculateEmployeePerformanceRow({
      employee,
      attendance,
      workLogs,
      projects,
      leaves,
      holidays,
      shiftPolicies,
      range: comparisonRange,
      now,
    });
    if (Number.isFinite(current.overallScore) && Number.isFinite(previous.overallScore) && current.dataCoverage === "good" && previous.dataCoverage === "good") {
      current.performanceTrend = [{ label: comparisonRange.label, value: previous.overallScore }, { label: range.label, value: current.overallScore }];
      current.trendChange = round1(current.overallScore - previous.overallScore);
      current.trendDirection = current.trendChange > 0 ? "up" : current.trendChange < 0 ? "down" : "flat";
    }
    current.previousScore = previous.overallScore;
  }

  return current;
}

export function rankPerformanceRows(rows) {
  const ranked = [...rows].sort((left, right) => {
    const leftEligible = left.rankingEligible ? 1 : 0;
    const rightEligible = right.rankingEligible ? 1 : 0;
    if (leftEligible !== rightEligible) return rightEligible - leftEligible;
    const overall = (right.overallScore || 0) - (left.overallScore || 0);
    if (overall) return overall;
    const attendance = (right.attendanceScore || 0) - (left.attendanceScore || 0);
    if (attendance) return attendance;
    const late = (left.lateArrivals || 0) - (right.lateArrivals || 0);
    if (late) return late;
    const completed = (right.completedWork || 0) - (left.completedWork || 0);
    if (completed) return completed;
    return String(left.employeeId || left.employeeFirestoreId || "").localeCompare(String(right.employeeId || right.employeeFirestoreId || "")) || String(left.employeeFirestoreId).localeCompare(String(right.employeeFirestoreId));
  });

  let rank = 0;
  return ranked.map((row) => {
    if (row.rankingEligible) rank += 1;
    return { ...row, rank: row.rankingEligible ? rank : null };
  });
}

export function buildPerformanceReport({
  employees = [],
  attendance = [],
  workLogs = [],
  projects = [],
  leaves = [],
  holidays = [],
  shiftPolicies = [],
  period = "month",
  year,
  month,
  quarter,
  now = new Date(),
}) {
  const currentRange = getPerformancePeriodRange({ period, year, month, quarter }, now);
  const comparisonRange = getPreviousEquivalentPeriodRange(currentRange, now);
  const activeEmployees = employees.filter(isActive);
  const rankings = rankPerformanceRows(activeEmployees.map((employee) => calculateEmployeePerformanceRow({
    employee,
    attendance,
    workLogs,
    projects,
    leaves,
    holidays,
    shiftPolicies,
    range: currentRange,
    comparisonRange,
    now,
  })));
  const eligible = rankings.filter((item) => item.rankingEligible);
  const summary = {
    averageScore: eligible.length ? round1(eligible.reduce((sum, item) => sum + (item.overallScore || 0), 0) / eligible.length) : null,
    eligibleEmployees: eligible.length,
    totalEmployees: activeEmployees.length,
  };
  const leader = eligible[0] || null;
  return { period: currentRange, comparisonPeriod: comparisonRange, summary, rankings, leader };
}

export function buildEmployeePerformanceDetail({
  employees = [],
  attendance = [],
  workLogs = [],
  projects = [],
  leaves = [],
  holidays = [],
  shiftPolicies = [],
  employeeId,
  period = "month",
  year,
  month,
  quarter,
  now = new Date(),
}) {
  const report = buildPerformanceReport({ employees, attendance, workLogs, projects, leaves, holidays, shiftPolicies, period, year, month, quarter, now });
  const sourceEmployee = employees.find((item) => String(item.id) === String(employeeId) || String(item.employeeId) === String(employeeId)) || null;
  if (!sourceEmployee) return { ...report, employee: null };
  const employee = calculateEmployeePerformanceRow({
    employee: sourceEmployee,
    attendance,
    workLogs,
    projects,
    leaves,
    holidays,
    shiftPolicies,
    range: report.period,
    comparisonRange: report.comparisonPeriod,
    now,
  });
  return {
    ...report,
    employee: { ...employee, rank: report.rankings.find(row => row.employeeFirestoreId === employee.employeeFirestoreId)?.rank ?? null },
    trendChange: employee.trendChange,
    trendDirection: employee.trendDirection,
  };
}
