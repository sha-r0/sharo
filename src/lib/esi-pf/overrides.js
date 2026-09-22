export const PF_OVERRIDE_KEYS = new Set(["epsMember", "edliApplicable", "pfWageBasis", "epfWages", "epsWages", "edliWages", "ncpDays", "refundOfAdvance"]);
export const ESI_OVERRIDE_KEYS = new Set(["zeroContributionReason", "lastWorkingDay"]);
const number = (value, integer = false) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER && (!integer || Number.isSafeInteger(value));

export function validateOverrideFields(scheme, fields = {}, stored = {}, existing = {}) {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("INVALID_OVERRIDE");
  const allowed = scheme === "pf" ? PF_OVERRIDE_KEYS : ESI_OVERRIDE_KEYS;
  const output = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) throw new Error("INVALID_OVERRIDE_FIELD");
    if (stored[key] != null && stored[key] !== "") throw new Error("FROZEN_FIELD");
    if (scheme === "pf" && ["epsMember", "edliApplicable"].includes(key) && typeof value !== "boolean") throw new Error("INVALID_OVERRIDE_VALUE");
    if (scheme === "pf" && key === "pfWageBasis" && !["basic_only", "full_wages", "explicit"].includes(value)) throw new Error("INVALID_OVERRIDE_VALUE");
    if (scheme === "pf" && ["epfWages", "epsWages", "edliWages", "ncpDays"].includes(key) && !number(value, true)) throw new Error("INVALID_OVERRIDE_VALUE");
    if (scheme === "pf" && key === "refundOfAdvance" && !number(value)) throw new Error("INVALID_OVERRIDE_VALUE");
    if (scheme === "esi" && key === "zeroContributionReason" && (!number(value, true) || value < 1 || value > 13)) throw new Error("INVALID_OVERRIDE_VALUE");
    if (scheme === "esi" && key === "lastWorkingDay" && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()))) throw new Error("INVALID_OVERRIDE_VALUE");
    output[key] = value;
  }
  if (!Object.keys(output).length) throw new Error("INVALID_OVERRIDE");
  return { ...existing, ...output };
}

export function overrideFor(payroll, scheme) {
  const value = payroll?.statutoryOverrides;
  return value?.approved === true && value?.fields?.[scheme] && typeof value.fields[scheme] === "object" ? value.fields[scheme] : {};
}
