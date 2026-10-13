"use strict";

const { salarySource } = require("./payrollMath");

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
  const monthlySalary = numeric(salarySource(employee));
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
  const earned = numeric(payroll.earnedSalary), bonus = numeric(payroll.bonus) ?? 0, scheduled = numeric(payroll.scheduledDays), payable = numeric(payroll.payableDays);
  const generated = earned !== null && scheduled !== null && payable !== null && scheduled >= 0 && payable >= 0 && payable <= scheduled;
  // Versioned payroll fields are authoritative. Missing fields on historical
  // rows remain missing so the compliance page can require a safe correction;
  // this adapter never recreates a wage basis from live salary data.
  const payrollPfWages = numeric(payroll.pfWages);
  const payrollEsiWages = numeric(payroll.esiWages);
  assign("pf", pf, oldPf, "grossWages", null, () => numeric(payroll.grossWages) ?? (generated ? money(earned) : null), "payroll.grossWages");
  assign("pf", pf, oldPf, "epfWages", null, () => payrollPfWages, "payroll.pfWages");
  // EPS/EDLI membership is not represented by employee flags. When payroll has
  // an authoritative PF wage basis, the existing export contract can safely
  // consume the capped wage basis; explicit finalized values still win.
  assign("pf", pf, oldPf, "epsWages", null, () => payrollPfWages === null ? null : Math.min(payrollPfWages, 15000), "payroll.pfWages-capped");
  assign("pf", pf, oldPf, "edliWages", null, () => payrollPfWages === null ? null : Math.min(payrollPfWages, 15000), "payroll.pfWages-capped");
  pf.employeePf = numeric(payroll.pfDeduction);
  sources.pf.employeePf = "pfDeduction-unchanged";
  assign("pf", pf, oldPf, "employerEps", "epsContribution", () => numeric(payroll.employerEps), "payroll.employerEps");
  assign("pf", pf, oldPf, "employerPf", "employerContribution", () => numeric(payroll.employerPf), "payroll.employerPf");
  /* Keep the legacy derivation as a fallback for historical rows. */
  if (pf.employerEps === null) pf.employerEps = (() => {
    if (pf.epsWages === null || pf.epsWages > 15000 || (pf.epsWages > 0 && month < "2014-09")) return null;
    return rateAmount(pf.epsWages, 8.33, Math.round);
  })();
  if (pf.employerPf === null) pf.employerPf = (() => {
    if (pf.epfWages === null || pf.employerEps === null || !(salary.employerPfPercent > 0 && salary.employerPfPercent <= 100)) return null;
    const total = rateAmount(pf.epfWages, salary.employerPfPercent, Math.round);
    if (total < pf.employerEps) return null;
    return total - pf.employerEps;
  })();
  assign("pf", pf, oldPf, "ncpDays", null, () => {
    if (!generated) return null;
    if (earned === 0 && bonus === 0 && payable === 0) return daysInMonth;
    if (payable === scheduled && numeric(payroll.pendingDays) === 0 && /^\d{4}-\d{2}-\d{2}$/.test(inputs.joiningDate || "") && inputs.joiningDate <= `${month}-01`) return 0;
    return null;
  }, "confirmed-full-pay-or-zero-pay-month");
  // Salary advance recovery is unrelated to refunds of EPF advances.
  assign("pf", pf, oldPf, "refundOfAdvance", "refunds");

  // ESI uses the frozen payroll wage basis; bonus/OT is never recomputed here.
  assign("esi", esi, oldEsi, "esiWages", "grossWages", () => payrollEsiWages, "payroll.esiWages");
  esi.employeeEsi = numeric(payroll.esiDeduction);
  sources.esi.employeeEsi = "esiDeduction-unchanged";
  assign("esi", esi, oldEsi, "employerEsi", "employerContribution", () => numeric(payroll.employerEsi), "payroll.employerEsi");
  if (esi.employerEsi === null && esi.esiWages !== null && salary.employerEsiPercent > 0) esi.employerEsi = rateAmount(esi.esiWages, salary.employerEsiPercent, Math.ceil);
  esi.payableDays = payable;
  sources.esi.payableDays = "payableDays-unchanged";
  assign("esi", esi, oldEsi, "zeroContributionReason", "zeroWageReasonCode", () => esi.esiWages > 0 && payable > 0 ? 0 : null, "positive-wages-and-paid-days");
  esi.lastWorkingDay = text(oldEsi.lastWorkingDay);

  for (const [scheme, data, deduction, old] of [["pf", pf, "employeePf", oldPf], ["esi", esi, "employeeEsi", oldEsi]]) {
    const supplied = selected(old, deduction);
    if (supplied != null && numeric(supplied) !== data[deduction]) issues[scheme].push("Stored statutory employee contribution differs from payroll deduction");
    if (data.applicable !== null && bool(payroll[`${scheme}Enabled`]) !== data.applicable) issues[scheme].push("Payroll eligibility differs from frozen statutory eligibility");
    if (!generated && !own(old, scheme === "pf" ? "grossWages" : "esiWages") && !own(old, "grossWages")) issues[scheme].push("Authoritative monthly wage basis unavailable");
    if (numeric(payroll.pendingDays) > 0) issues[scheme].push("Payroll contains pending attendance");
  }
  if (pf.applicable && inputs && !(salary.employeePfPercent > 0 && salary.employeePfPercent <= 100)) issues.pf.push("Missing or invalid frozen employee PF rate");
  if (pf.applicable && pf.epfWages !== null && salary.employeePfPercent > 0 && salary.employeePfPercent <= 100) {
    const expected = rateAmount(pf.epfWages, salary.employeePfPercent, Math.round);
    if (pf.employeePf !== expected) issues.pf.push("Employee PF deduction differs from frozen wage/rate; net salary preserved");
  }
  if (esi.applicable && inputs && !(salary.employeeEsiPercent > 0 && salary.employeeEsiPercent <= 100 && salary.employerEsiPercent > 0 && salary.employerEsiPercent <= 100)) issues.esi.push("Missing or unsupported frozen ESI rates for this month");
  if (esi.applicable && esi.esiWages !== null && salary.employeeEsiPercent > 0 && salary.employeeEsiPercent <= 100) {
    const expected = rateAmount(esi.esiWages, salary.employeeEsiPercent, Math.ceil);
    if (esi.employeeEsi !== expected) issues.esi.push("Employee ESI deduction differs from frozen wage/rate; net salary preserved");
  }
  for (const key of ["grossWages", "epfWages", "epsWages", "edliWages", "employeePf", "employerPf", "employerEps", "ncpDays", "refundOfAdvance"]) if (pf[key] === null) issues.pf.push(`Missing ${key}`);
  for (const key of ["esiWages", "employeeEsi", "employerEsi", "payableDays"]) if (esi[key] === null) issues.esi.push(`Missing ${key}`);
  if ((esi.esiWages === 0 || esi.payableDays === 0) && esi.zeroContributionReason === null) issues.esi.push("Missing zeroContributionReason");
  if ([2, 3, 4, 5, 6, 10].includes(esi.zeroContributionReason) && !esi.lastWorkingDay) issues.esi.push("Missing lastWorkingDay");
  return { version: 2, month, calculationVersion: "stored-payroll-statutory-v1", pf, esi, issues, sources };
}

module.exports = { captureStatutoryInputs, buildPayrollStatutory };
