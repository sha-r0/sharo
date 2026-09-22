const boolean = (value) => typeof value === "boolean" ? value : null;
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const fields = [
  { flag: "includePf", applicable: "pfApplicable", key: "uan", length: 12, label: "UAN Number" },
  { flag: "includeEsi", applicable: "esiApplicable", key: "ipNumber", length: 10, label: "ESIC/IP Number" },
];

// Canonical salary flags win; legacy eligibility remains readable without migration.
export function readEmployeeStatutory(employee) {
  const applicable = (scheme, flag) => boolean(employee?.salaryStructure?.[flag])
    ?? boolean(employee?.compensation?.[`${scheme}Enabled`])
    ?? boolean(employee?.payroll?.[`${scheme}Enabled`]);
  return {
    pfApplicable: applicable("pf", "includePf"),
    esiApplicable: applicable("esi", "includeEsi"),
    uan: employee?.statutoryDetails?.uan ?? "",
    ipNumber: employee?.statutoryDetails?.ipNumber ?? "",
  };
}

export function validateEmployeeStatutory(profile) {
  const values = readEmployeeStatutory(profile);
  const errors = {};
  for (const field of fields) {
    if (own(profile.salaryStructure, field.flag) && typeof profile.salaryStructure[field.flag] !== "boolean") errors[field.flag] = `${field.flag === "includePf" ? "PF" : "ESI"} Applicable must be Yes or No.`;
    const raw = values[field.key];
    const value = typeof raw === "string" ? raw.trim() : raw;
    if ((value === "" || value == null) && values[field.applicable] === true) errors[field.key] = `${field.label} is required when ${field.flag === "includePf" ? "PF" : "ESI"} is applicable.`;
    else if (value !== "" && value != null && (typeof value !== "string" || !new RegExp(`^\\d{${field.length}}$`).test(value))) errors[field.key] = `${field.label} must contain exactly ${field.length} digits.`;
  }
  return errors;
}

export function mergeEmployeeStatutory(profile, existing = null) {
  for (const key of ["salaryStructure", "statutoryDetails"]) {
    if (own(profile, key) && !object(profile[key])) throw new Error(`Invalid ${key}.`);
  }
  const salaryStructure = { ...(existing?.salaryStructure || {}), ...(profile.salaryStructure || {}) };
  const statutoryDetails = { ...(existing?.statutoryDetails || {}) };
  for (const { key } of fields) if (own(profile.statutoryDetails, key)) {
    const raw = profile.statutoryDetails[key];
    statutoryDetails[key] = typeof raw === "string" ? raw.trim() : raw;
  }
  const merged = { ...existing, salaryStructure, statutoryDetails };
  const before = readEmployeeStatutory(existing), after = readEmployeeStatutory(merged);
  const errors = validateEmployeeStatutory(merged);
  // Legacy callers may update unrelated fields without supplying missing old IDs.
  // New profiles, explicit statutory edits and eligibility changes validate normally.
  for (const field of fields) {
    const touched = !existing || own(profile.statutoryDetails, field.key)
      || (own(profile.salaryStructure, field.flag) && before[field.applicable] !== after[field.applicable]);
    if (errors[field.flag] && own(profile.salaryStructure, field.flag)) throw new Error(errors[field.flag]);
    if (touched && errors[field.key]) throw new Error(errors[field.key]);
  }
  return {
    salaryStructure,
    ...(existing?.statutoryDetails || own(profile, "statutoryDetails") ? { statutoryDetails } : {}),
  };
}
