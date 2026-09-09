import { adminDb } from "@/lib/firebase-admin";
import { buildEmployeePerformanceDetail, buildPerformanceReport, getPerformancePeriodRange } from "@/lib/performance";

const normalize = (value) => String(value || "").trim().toLowerCase();

const collectionRows = async (companyId, name) => {
  const snapshot = await adminDb.collection("Companies").doc(companyId).collection(name).get();
  return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
};

export async function loadPerformanceDataset(companyId) {
  if (!companyId || String(companyId).includes("/")) throw new Error("FORBIDDEN");
  const [employees, attendance, workLogs, projects, leaves, holidays, shiftPolicies] = await Promise.all([
    collectionRows(companyId, "Usermanagement"),
    collectionRows(companyId, "Attendance"),
    collectionRows(companyId, "WorkLogs"),
    collectionRows(companyId, "Projectmanagement"),
    collectionRows(companyId, "LeaveRequests"),
    collectionRows(companyId, "Holidays"),
    collectionRows(companyId, "ShiftPolicies"),
  ]);
  return {
    employees,
    attendance,
    workLogs,
    projects,
    leaves,
    holidays,
    shiftPolicies,
  };
}

function currentPeriodSpec(period = "month") {
  const range = getPerformancePeriodRange({ period });
  return { period, year: range.year, month: range.month, quarter: range.quarter };
}
const compactRow = ({ attendanceTrend, performanceTrend, ...row }) => row;

export function buildPerformanceDashboardResponse(data, query = {}) {
  const report = buildPerformanceReport({
    employees: data.employees,
    attendance: data.attendance,
    workLogs: data.workLogs,
    projects: data.projects,
    leaves: data.leaves,
    holidays: data.holidays,
    shiftPolicies: data.shiftPolicies,
    period: query.period || "month",
    year: query.year,
    month: query.month,
    quarter: query.quarter,
  });
  const month = buildPerformanceReport({ ...data, ...currentPeriodSpec("month"), period: "month" });
  const quarter = buildPerformanceReport({ ...data, ...currentPeriodSpec("quarter"), period: "quarter" });
  const year = buildPerformanceReport({ ...data, ...currentPeriodSpec("year"), period: "year" });
  return {
    period: report.period,
    summary: report.summary,
    leaders: {
      month: month.leader ? compactRow(month.leader) : null,
      quarter: quarter.leader ? compactRow(quarter.leader) : null,
      year: year.leader ? compactRow(year.leader) : null,
    },
    rankings: report.rankings.map(compactRow),
  };
}

export function buildEmployeePerformanceResponse(data, employeeId, query = {}) {
  const detail = buildEmployeePerformanceDetail({
    employees: data.employees,
    attendance: data.attendance,
    workLogs: data.workLogs,
    projects: data.projects,
    leaves: data.leaves,
    holidays: data.holidays,
    shiftPolicies: data.shiftPolicies,
    employeeId,
    period: query.period || "month",
    year: query.year,
    month: query.month,
    quarter: query.quarter,
  });
  return { period: detail.period, comparisonPeriod: detail.comparisonPeriod, employee: detail.employee };
}

export function parsePerformanceQuery(searchParams) {
  const period = normalize(searchParams.get("period") || "month");
  const parsed = Object.fromEntries(["year", "month", "quarter"].map(key => [key, searchParams.has(key) ? Number(searchParams.get(key)) : undefined]));
  getPerformancePeriodRange({ period, ...parsed });
  return { period, ...parsed };
}
