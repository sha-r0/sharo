import { readEmployeeStatutory } from "../../app/allservice/employee/employeeStatutory.js";
import { overrideFor } from "./overrides.js";

// Read-only projection. Never derive statutory wages or contributions from salary/rates.
export const FINAL_PAYROLL_STATUSES = new Set(["processed", "paid", "finalized"]);
export const MONTH_PATTERN = /^(20\d{2})-(0[1-9]|1[0-2])$/;
const text = (value) => typeof value === "string" ? value.trim() : "";
const number = (value) => {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim()))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= Number.MAX_SAFE_INTEGER ? parsed : null;
};
const bool = (value) => typeof value === "boolean" ? value : null;
const employeeName = (employee) => text(employee?.personalInfo?.fullName || employee?.name || employee?.employeeName);
const employeeCode = (employee) => text(employee?.employeeId || employee?.login?.employeeId);
const unique = (values) => [...new Set(values)];

export function validateMonth(month) {
  if (!MONTH_PATTERN.test(month || "")) throw new Error("INVALID_MONTH");
  return month;
}

function identifier(snapshotValue, profileValue, length, label, issues) {
  const raw = snapshotValue ?? profileValue;
  const value = text(raw);
  if (raw === undefined || raw === null || raw === "") issues.push(`Missing ${label}`);
  else if (!new RegExp(`^\\d{${length}}$`).test(value)) issues.push(`Invalid ${label}`);
  if (snapshotValue != null && profileValue != null && text(snapshotValue) !== text(profileValue)) issues.push(`Conflicting ${label}`);
  return value || null;
}

function requiredNumber(raw, label, issues, integer = false) {
  const value = number(raw);
  if (value === null) issues.push(`Missing or invalid ${label}`);
  else if (integer && !Number.isSafeInteger(value)) issues.push(`${label} must be a whole number`);
  return value;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function schemeRow(scheme, employee, payroll, commonIssues, daysInMonth, month) {
  const issues = [...commonIssues];
  const compliance = payroll?.compliance;
  const frozen = compliance?.version === 2;
  const stored = compliance?.[scheme] || {};
  const override = overrideFor(payroll, scheme);
  // Legacy names stay readable. Versioned snapshots never fall back from missing
  // monetary fields to current employee data or newly calculated amounts.
  const statutory = frozen ? {
    ...stored,
    grossWages: scheme === "pf" ? stored.grossWages : stored.esiWages,
    employerContribution: scheme === "pf" ? stored.employerPf : stored.employerEsi,
    epsContribution: stored.employerEps, refunds: stored.refundOfAdvance,
    zeroWageReasonCode: stored.zeroContributionReason ?? stored.zeroWageReasonCode,
  } : stored;
  const effective = { ...statutory };
  for (const key of ["grossWages", "epfWages", "epsWages", "edliWages", "ncpDays", "refunds", "zeroWageReasonCode", "lastWorkingDay"]) {
    const overrideKey = key === "refunds" ? "refundOfAdvance" : key === "zeroWageReasonCode" ? "zeroContributionReason" : key;
    if (effective[key] == null && override[overrideKey] != null) effective[key] = override[overrideKey];
  }
  if (scheme === "pf" && effective.epsWages == null && override.epsMember === false) effective.epsWages = 0;
  if (scheme === "pf" && effective.edliWages == null && override.edliApplicable === false) effective.edliWages = 0;
  if (scheme === "pf" && effective.epsContribution == null && override.epsMember === false) effective.epsContribution = 0;
  const employeeContribution = frozen ? stored[scheme === "pf" ? "employeePf" : "employeeEsi"] : payroll?.[scheme === "pf" ? "pfDeduction" : "esiDeduction"];
  const workingDays = frozen ? compliance.esi?.payableDays : payroll?.payableDays;
  if (frozen && compliance.month !== month) issues.push("Statutory snapshot month mismatch");
  if (compliance?.version != null && !frozen) issues.push("Unsupported statutory snapshot version");
  const employeeStatutory = readEmployeeStatutory(employee);
  const settings = employeeStatutory[scheme === "pf" ? "pfApplicable" : "esiApplicable"];
  const frozenEligibility = bool(frozen ? stored.applicable : payroll?.[`${scheme}Enabled`]);
  const eligible = payroll ? frozenEligibility : settings;
  const eligibilityConflict = payroll && frozenEligibility !== null && settings !== null && frozenEligibility !== settings;
  if (eligibilityConflict) issues.push("Eligibility differs from employee settings; review required");
  const candidate = eligible !== false || Boolean(eligibilityConflict) || issues.some((issue) => issue !== "Missing payroll");
  if (candidate && frozenEligibility === null) issues.push("Missing finalized eligibility");

  const name = text(statutory.memberName) || text(payroll?.employeeName) || employeeName(employee);
  const row = {
    eligible, candidate, name, issues,
    grossWages: number(effective.grossWages),
    employeeContribution: number(employeeContribution),
    employerContribution: number(effective.employerContribution),
    workingDays: number(workingDays),
    epfWages: number(effective.epfWages), epsWages: number(effective.epsWages),
    edliWages: number(effective.edliWages), epsContribution: number(effective.epsContribution),
    ncpDays: number(effective.ncpDays), refunds: number(effective.refunds),
    zeroWageReasonCode: number(effective.zeroWageReasonCode), lastWorkingDay: text(effective.lastWorkingDay),
    overrideApplied: Object.keys(override).length > 0,
    identifier: null,
  };
  if (!candidate) {
    row.ready = false;
    return row;
  }
  if (frozen) {
    issues.push(...(Array.isArray(compliance.issues?.[scheme]) ? compliance.issues[scheme].filter((issue) => typeof issue === "string") : ["Missing statutory calculation validation"]));
    const deduction = number(payroll?.[scheme === "pf" ? "pfDeduction" : "esiDeduction"]);
    if (deduction !== row.employeeContribution) issues.push("Statutory employee contribution differs from payroll deduction");
    if (scheme === "esi" && number(payroll?.payableDays) !== row.workingDays) issues.push("Statutory paid days differ from payroll");
  }
  const identifierKey = scheme === "pf" ? "uan" : "ipNumber";
  const profileIdentifier = employeeStatutory[identifierKey];
  row.identifier = identifier(statutory[identifierKey], frozen ? undefined : profileIdentifier === "" ? undefined : profileIdentifier, scheme === "pf" ? 12 : 10, scheme === "pf" ? "UAN" : "IP No.", issues);
  if (frozen && statutory[identifierKey] && profileIdentifier !== "" && text(statutory[identifierKey]) !== text(profileIdentifier)) issues.push(`Conflicting ${scheme === "pf" ? "UAN" : "IP No."}`);
  if (!name) issues.push("Missing employee name");
  else if (/[\x00-\x1f\x7f#~]/.test(name)) issues.push("Invalid portal employee name");
  requiredNumber(effective.grossWages, "statutory gross wages", issues, scheme === "pf");
  requiredNumber(employeeContribution, `employee ${scheme.toUpperCase()}`, issues, scheme === "pf");
  requiredNumber(effective.employerContribution, `employer ${scheme.toUpperCase()}`, issues, scheme === "pf");
  if (scheme === "pf") {
    for (const [key, label] of [["epfWages", "EPF wages"], ["epsWages", "EPS wages"], ["edliWages", "EDLI wages"], ["epsContribution", "EPS contribution"], ["ncpDays", "NCP days"], ["refunds", "refunds"]]) requiredNumber(effective[key], label, issues, true);
    if (row.grossWages !== null && row.epfWages !== null && row.epfWages > row.grossWages) issues.push("EPF wages exceed gross wages");
    if (row.grossWages > 0 && row.epfWages === 0) issues.push("Zero EPF wages with earned gross wages");
    if (row.epfWages !== null && row.epsWages !== null && row.epsWages > row.epfWages) issues.push("EPS wages exceed EPF wages");
    if (row.edliWages !== null && (row.edliWages > 15000 || (row.epfWages !== null && row.edliWages > row.epfWages))) issues.push("Invalid EDLI wage ceiling");
    if (row.edliWages > 0 && row.epfWages !== null && row.edliWages !== Math.min(row.epfWages, 15000)) issues.push("EDLI wages do not match EPF wages or the ceiling");
    if (row.ncpDays > daysInMonth) issues.push("NCP days exceed month length");
    if (row.grossWages === 0 && row.ncpDays !== daysInMonth) issues.push("Zero wages require full-month NCP days");
    if (row.epsWages === 0 && row.epsContribution !== null && row.epsContribution !== 0) issues.push("EPS contribution without EPS wages");
  } else {
    requiredNumber(workingDays, "working days", issues);
    if (row.workingDays > daysInMonth) issues.push("Working days exceed month length");
    const requiresReason = row.grossWages === 0 || row.workingDays === 0;
    if (effective.zeroWageReasonCode != null && row.zeroWageReasonCode === null) issues.push("Invalid zero-wage reason");
    if (requiresReason && (!Number.isInteger(row.zeroWageReasonCode) || row.zeroWageReasonCode < 1 || row.zeroWageReasonCode > 13)) issues.push("Missing or invalid zero-wage reason");
    if (!requiresReason && row.zeroWageReasonCode !== null && row.zeroWageReasonCode !== 0) issues.push("Unexpected zero-wage reason");
    const requiresDate = [2, 3, 4, 5, 6, 10].includes(row.zeroWageReasonCode);
    if (requiresDate && (!validDate(row.lastWorkingDay) || row.lastWorkingDay > `${month}-${daysInMonth}`)) issues.push("Missing or invalid last working day");
    if (!requiresDate && row.lastWorkingDay) issues.push("Unexpected last working day");
    if ((row.grossWages === 0) !== (row.workingDays === 0) && row.grossWages !== null && row.workingDays !== null) issues.push("Zero wages and working days do not match");
  }
  if (row.grossWages !== null && row.employeeContribution !== null && row.employeeContribution > row.grossWages) issues.push("Employee contribution exceeds gross wages");
  if (row.grossWages === 0 && (row.employeeContribution > 0 || row.employerContribution > 0 || row.epsContribution > 0)) issues.push("Contributions without wages");
  row.issues = unique(issues);
  const missingFields = [];
  if (scheme === "pf") {
    if (row.epsWages === null && override.epsMember !== false) missingFields.push("epsMember", "epsWages");
    if (row.edliWages === null && override.edliApplicable !== false) missingFields.push("edliApplicable", "edliWages");
    if (row.epfWages === null) missingFields.push("pfWageBasis", "epfWages");
    if (row.ncpDays === null) missingFields.push("ncpDays");
    if (row.refunds === null) missingFields.push("refundOfAdvance");
  } else {
    if ((row.grossWages === 0 || row.workingDays === 0) && row.zeroWageReasonCode === null) missingFields.push("zeroContributionReason");
    if ([2, 3, 4, 5, 6, 10].includes(row.zeroWageReasonCode) && !row.lastWorkingDay) missingFields.push("lastWorkingDay");
  }
  row.missingFields = unique(missingFields);
  // A stored snapshot issue is stale only when the approved override supplies that exact field.
  row.issues = row.issues.filter((issue) => {
    const lower = issue.toLowerCase();
    if (row.epfWages !== null && lower.includes("epf") && lower.includes("wage") && lower.includes("missing")) return false;
    if (row.epsWages !== null && lower.includes("eps") && lower.includes("wage") && lower.includes("missing")) return false;
    if (row.edliWages !== null && lower.includes("edli") && lower.includes("wage") && lower.includes("missing")) return false;
    if (row.ncpDays !== null && lower.includes("ncp") && lower.includes("missing")) return false;
    if (row.refunds !== null && lower.includes("refund") && lower.includes("missing")) return false;
    if (row.zeroWageReasonCode !== null && lower.includes("zero") && lower.includes("reason") && lower.includes("missing")) return false;
    if (validDate(row.lastWorkingDay) && row.lastWorkingDay <= `${month}-${daysInMonth}` && lower.includes("last working") && lower.includes("missing")) return false;
    return true;
  });
  row.ready = row.issues.length === 0;
  return row;
}

export function buildComplianceReport({ month, employees, payroll }) {
  validateMonth(month);
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const byCode = new Map();
  for (const employee of employees) {
    const code = employeeCode(employee);
    if (code) byCode.set(code, [...(byCode.get(code) || []), employee]);
  }
  const groups = new Map(employees.map((employee) => [employee.id, { employee, records: [], issues: [] }]));
  let ignoredDrafts = 0;
  for (const item of payroll.filter((record) => record.month === month)) {
    if (!FINAL_PAYROLL_STATUSES.has(text(item.status).toLowerCase())) { ignoredDrafts += 1; continue; }
    const documentId = text(item.employeeFirestoreId);
    const matches = documentId ? [byId.get(documentId)].filter(Boolean) : byCode.get(text(item.employeeId)) || [];
    const employee = matches.length === 1 ? matches[0] : null;
    const key = employee?.id || `unmatched:${item.id}`;
    if (!groups.has(key)) groups.set(key, { employee: null, records: [], issues: [matches.length > 1 ? "Ambiguous employee match" : "Missing employee record"] });
    groups.get(key).records.push(item);
    // Block candidate employee rows too when a legacy employee ID is ambiguous.
    if (matches.length > 1) for (const match of matches) groups.get(match.id).issues.push("Ambiguous employee match");
  }
  const rows = [...groups.entries()].map(([id, { employee, records, issues }]) => {
    const finalized = records.length === 1 ? records[0] : null;
    if (!records.length) issues.push("Missing payroll");
    if (records.length > 1) issues.push("Duplicate finalized payroll");
    return {
      id, payrollId: finalized?.id || null, employeeId: employeeCode(employee) || text(finalized?.employeeId),
      employeeName: text(finalized?.employeeName) || employeeName(employee) || "Unnamed employee",
      payrollStatus: text(finalized?.status) || null,
      payrollGrossSalary: number(finalized?.grossSalary), earnedSalary: number(finalized?.earnedSalary),
      pf: schemeRow("pf", employee, finalized, issues, daysInMonth, month),
      esi: schemeRow("esi", employee, finalized, issues, daysInMonth, month),
    };
  });
  for (const scheme of ["pf", "esi"]) {
    const counts = new Map();
    for (const row of rows) if (row[scheme].candidate && row[scheme].identifier) counts.set(row[scheme].identifier, (counts.get(row[scheme].identifier) || 0) + 1);
    for (const row of rows) if (counts.get(row[scheme].identifier) > 1) {
      row[scheme].issues.push(`Duplicate ${scheme === "pf" ? "UAN" : "IP No."}`);
      row[scheme].ready = false;
    }
  }
  rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.id.localeCompare(b.id));
  const exportStatus = Object.fromEntries(["pf", "esi"].map((scheme) => {
    const candidates = rows.filter((row) => row[scheme].candidate);
    const blocked = candidates.filter((row) => !row[scheme].ready).length;
    return [scheme, { candidates: candidates.length, blocked, ready: candidates.length > 0 && blocked === 0 }];
  }));
  return {
    month, rows, ignoredDrafts, exportStatus,
    summary: {
      totalEmployees: rows.length,
      pfEligible: rows.filter((row) => row.pf.eligible === true).length,
      esiEligible: rows.filter((row) => row.esi.eligible === true).length,
      missingData: rows.filter((row) => row.pf.issues.length || row.esi.issues.length).length,
    },
  };
}
