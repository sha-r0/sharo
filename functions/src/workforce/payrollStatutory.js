"use strict";

const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const numeric = (value) => {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim()))) return null;
  const result = Number(value);
  return Number.isFinite(result) && result >= 0 && result <= Number.MAX_SAFE_INTEGER ? result : null;
};
const bool = (value) => typeof value === "boolean" ? value : null;
const text = (value) => typeof value === "string" ? value.trim() : null;
const selected = (record, key, alias) => own(record, key) ? record[key] : alias && own(record, alias) ? record[alias] : undefined;
const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const rateAmount = (wages, rate, rounding) => rounding(Number((wages * rate / 100).toFixed(8)));

// Capture at generation, not from mutable employee profiles at finalization/export.
function captureStatutoryInputs(employee, payroll, month) {
  const salary = employee.salaryStructure || {};
  // Exactly the source-selection order used by salaryOf; a missing salary is not zero.
  const monthlySalary = numeric(employee.salary || employee.employment?.salary || employee.compensation?.monthlySalary || employee.compensation?.gross || employee.payroll?.salary);
  return {
    version: 1, month, monthlySalary,
    pfApplicable: bool(salary.includePf) ?? bool(employee.compensation?.pfEnabled) ?? bool(employee.payroll?.pfEnabled) ?? bool(payroll.pfEnabled),
    esiApplicable: bool(salary.includeEsi) ?? bool(employee.compensation?.esiEnabled) ?? bool(employee.payroll?.esiEnabled) ?? bool(payroll.esiEnabled),
    uan: text(employee.statutoryDetails?.uan), ipNumber: text(employee.statutoryDetails?.ipNumber),
    joiningDate: text(employee.employment?.joiningDate),
    salaryStructure: Object.fromEntries(["grossSalary", "basicSalary", "hra", "otherAllowance", "employeePfPercent", "employerPfPercent", "employeeEsiPercent", "employerEsiPercent"].map((key) => [key, numeric(salary[key])])),
  };
}

function buildPayrollStatutory(payroll) {
  const month = text(payroll.month);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || "")) throw new Error("INVALID_PAYROLL_MONTH");
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const inputs = payroll.statutoryInputs?.version === 1 && payroll.statutoryInputs.month === month ? payroll.statutoryInputs : null;
  const salary = inputs?.salaryStructure || {};
  const oldPf = payroll.compliance?.pf || {}, oldEsi = payroll.compliance?.esi || {};
  const issues = { pf: [], esi: [] };
  const sources = { pf: {}, esi: {} };
  const pf = { applicable: inputs?.pfApplicable ?? bool(payroll.pfEnabled), uan: selected(oldPf, "uan") ?? inputs?.uan ?? null, memberName: text(oldPf.memberName) || text(payroll.employeeName) };
  const esi = { applicable: inputs?.esiApplicable ?? bool(payroll.esiEnabled), ipNumber: selected(oldEsi, "ipNumber") ?? inputs?.ipNumber ?? null, memberName: text(oldEsi.memberName) || text(payroll.employeeName) };
  const assign = (scheme, target, old, key, alias, derive, source) => {
    const provided = selected(old, key, alias);
    target[key] = provided !== undefined && provided !== null ? numeric(provided) : derive?.() ?? null;
    if (provided !== undefined && provided !== null && target[key] === null) issues[scheme].push(`Invalid stored ${key}`);
    if (target[key] !== null) sources[scheme][key] = provided !== undefined && provided !== null ? "stored-monthly-payroll" : source;
  };
  const earned = numeric(payroll.earnedSalary), bonus = numeric(payroll.bonus), scheduled = numeric(payroll.scheduledDays), payable = numeric(payroll.payableDays);
  const supportedGeneration = inputs && inputs.monthlySalary !== null && inputs.monthlySalary === numeric(payroll.grossSalary)
    && earned !== null && bonus !== null && scheduled > 0 && payable !== null && payable <= scheduled
    && Math.abs(earned - inputs.monthlySalary * payable / scheduled) < 0.000001
    && (!own(payroll, "overtimeAmount") || numeric(payroll.overtimeAmount) === 0);
  const regularWages = supportedGeneration ? money(earned) : null;
  assign("pf", pf, oldPf, "grossWages", null, () => supportedGeneration ? Math.round(earned + bonus) : null, "earnedSalary+bonus-rounded-to-rupee");
  // Without an explicit statutory basis, only the unambiguous basic-only case
  // below the wage ceiling can establish EPF wages. No assumed DA/allowance policy.
  const basicOnly = supportedGeneration && salary.basicSalary === inputs.monthlySalary && salary.grossSalary === inputs.monthlySalary
    && salary.hra === 0 && salary.otherAllowance === 0 && inputs.monthlySalary <= 15000 && month >= "2014-09" && bonus === 0;
  assign("pf", pf, oldPf, "epfWages", null, () => basicOnly ? Math.round(earned) : null, "confirmed-basic-only-earned-wages");
  // EPS membership and EDLI exemption are not represented by includePf. Do not infer them.
  assign("pf", pf, oldPf, "epsWages");
  assign("pf", pf, oldPf, "edliWages");
  pf.employeePf = numeric(payroll.pfDeduction);
  sources.pf.employeePf = "pfDeduction-unchanged";
  assign("pf", pf, oldPf, "employerEps", "epsContribution", () => {
    if (pf.epsWages === null || pf.epsWages > 15000 || (pf.epsWages > 0 && month < "2014-09")) return null;
    return rateAmount(pf.epsWages, 8.33, Math.round);
  }, "stored-eps-wages-at-8.33-percent");
  assign("pf", pf, oldPf, "employerPf", "employerContribution", () => {
    if (pf.epfWages === null || pf.employerEps === null || ![10, 12].includes(salary.employerPfPercent)) return null;
    const total = rateAmount(pf.epfWages, salary.employerPfPercent, Math.round);
    if (total < pf.employerEps) return null;
    return total - pf.employerEps;
  }, "frozen-employer-rate-less-employerEps");
  assign("pf", pf, oldPf, "ncpDays", null, () => {
    if (!supportedGeneration) return null;
    if (earned === 0 && bonus === 0 && payable === 0) return daysInMonth;
    if (payable === scheduled && numeric(payroll.pendingDays) === 0 && /^\d{4}-\d{2}-\d{2}$/.test(inputs.joiningDate || "") && inputs.joiningDate <= `${month}-01`) return 0;
    return null;
  }, "confirmed-full-pay-or-zero-pay-month");
  // Salary advance recovery is unrelated to refunds of EPF advances.
  assign("pf", pf, oldPf, "refundOfAdvance", "refunds");

  // The current payroll has a regular earned amount and an unclassified bonus.
  // ESI wages can use regular earnings only when no bonus/OT classification is needed.
  assign("esi", esi, oldEsi, "esiWages", "grossWages", () => bonus === 0 ? regularWages : null, "confirmed-regular-earned-wages");
  esi.employeeEsi = numeric(payroll.esiDeduction);
  sources.esi.employeeEsi = "esiDeduction-unchanged";
  assign("esi", esi, oldEsi, "employerEsi", "employerContribution", () => {
    if (esi.esiWages === null || salary.employerEsiPercent !== 3.25 || month < "2019-07") return null;
    return rateAmount(esi.esiWages, salary.employerEsiPercent, Math.ceil);
  }, "frozen-employer-rate-rounded-up");
  esi.payableDays = payable;
  sources.esi.payableDays = "payableDays-unchanged";
  assign("esi", esi, oldEsi, "zeroContributionReason", "zeroWageReasonCode", () => esi.esiWages > 0 && payable > 0 ? 0 : null, "positive-wages-and-paid-days");
  esi.lastWorkingDay = text(oldEsi.lastWorkingDay);

  for (const [scheme, data, deduction, old] of [["pf", pf, "employeePf", oldPf], ["esi", esi, "employeeEsi", oldEsi]]) {
    const supplied = selected(old, deduction);
    if (supplied != null && numeric(supplied) !== data[deduction]) issues[scheme].push("Stored statutory employee contribution differs from payroll deduction");
    if (data.applicable !== null && bool(payroll[`${scheme}Enabled`]) !== data.applicable) issues[scheme].push("Payroll eligibility differs from frozen statutory eligibility");
    if (inputs && !supportedGeneration && !own(old, scheme === "pf" ? "grossWages" : "esiWages") && !own(old, "grossWages")) issues[scheme].push("Authoritative monthly wage basis unavailable");
    if (numeric(payroll.pendingDays) > 0) issues[scheme].push("Payroll contains pending attendance");
  }
  if (pf.applicable && inputs && !(salary.employeePfPercent > 0 && salary.employeePfPercent <= 100)) issues.pf.push("Missing or invalid frozen employee PF rate");
  if (pf.applicable && pf.epfWages !== null && salary.employeePfPercent > 0 && salary.employeePfPercent <= 100) {
    const expected = rateAmount(pf.epfWages, salary.employeePfPercent, Math.round);
    if (pf.employeePf !== expected) issues.pf.push("Employee PF deduction differs from frozen wage/rate; net salary preserved");
  }
  if (esi.applicable && inputs && (salary.employeeEsiPercent !== 0.75 || salary.employerEsiPercent !== 3.25 || month < "2019-07")) issues.esi.push("Missing or unsupported frozen ESI rates for this month");
  if (esi.applicable && esi.esiWages !== null && salary.employeeEsiPercent === 0.75 && month >= "2019-07") {
    // A zero employee share with positive wages may be an exemption, but its
    // eligibility is not recorded by current payroll. Never assume an exemption.
    const expected = rateAmount(esi.esiWages, salary.employeeEsiPercent, Math.ceil);
    if (esi.employeeEsi !== expected) issues.esi.push("Employee ESI deduction/exemption needs review; net salary preserved");
  }
  for (const key of ["grossWages", "epfWages", "epsWages", "edliWages", "employeePf", "employerPf", "employerEps", "ncpDays", "refundOfAdvance"]) if (pf[key] === null) issues.pf.push(`Missing ${key}`);
  for (const key of ["esiWages", "employeeEsi", "employerEsi", "payableDays"]) if (esi[key] === null) issues.esi.push(`Missing ${key}`);
  if ((esi.esiWages === 0 || esi.payableDays === 0) && esi.zeroContributionReason === null) issues.esi.push("Missing zeroContributionReason");
  if ([2, 3, 4, 5, 6, 10].includes(esi.zeroContributionReason) && !esi.lastWorkingDay) issues.esi.push("Missing lastWorkingDay");
  return { version: 2, month, calculationVersion: "stored-payroll-statutory-v1", pf, esi, issues, sources };
}

module.exports = { captureStatutoryInputs, buildPayrollStatutory };
