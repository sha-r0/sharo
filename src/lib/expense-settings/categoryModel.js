export const LOCATIONS = ["Delhi NCR", "Outside Delhi NCR"];
export const GST_TYPES = ["with_gst", "without_gst"];
export const CALCULATION_TYPES = { fixed_limit: "Fixed Limit", per_unit: "Per Unit", actual: "Actual Expense" };
export const BASES = { per_expense: "Per expense", per_day: "Per day", per_person: "Per person", per_unit: "Per unit" };
export const ruleId = (location, gst) => `${location === null ? "all" : LOCATIONS.indexOf(location)}_${gst || "all"}`;

export function generateRules(conditions, previous = []) {
  return (conditions.locationEnabled ? LOCATIONS : [null]).flatMap((locationType) =>
    (conditions.gstEnabled ? GST_TYPES : [null]).map((gstType) => {
      const id = ruleId(locationType, gstType);
      return previous.find((rule) => rule.id === id) || { id, locationType, gstType, amount: "", basis: "per_expense" };
    }));
}

export const normalizedName = (name) => name.normalize("NFKC").trim().replace(/\s+/gu, " ").toLowerCase();
const invalid = (message) => { throw new Error(`INVALID_CATEGORY: ${message}`); };
const object = (value) => value && typeof value === "object" && !Array.isArray(value);
function keysOnly(value, keys) {
  if (!object(value) || Object.keys(value).some((key) => !keys.includes(key))) invalid("Unsupported fields.");
}

export function validateCategory(input) {
  keysOnly(input, ["name", "description", "calculationType", "conditions", "rules", "active", "travelRouteEnabled"]);
  if (typeof input.name !== "string" || !input.name.trim() || input.name.length > 100) invalid("Category name is required (maximum 100 characters).");
  if (typeof input.description !== "string" || input.description.length > 1000) invalid("Description must be at most 1000 characters.");
  if (typeof input.calculationType !== "string" || !Object.hasOwn(CALCULATION_TYPES, input.calculationType)) invalid("Invalid calculation type.");
  if (typeof input.active !== "boolean") invalid("Active must be a boolean.");
  if (input.travelRouteEnabled !== undefined && typeof input.travelRouteEnabled !== "boolean") invalid("Requires From / To must be a boolean.");
  keysOnly(input.conditions, ["locationEnabled", "gstEnabled"]);
  if (typeof input.conditions.locationEnabled !== "boolean" || typeof input.conditions.gstEnabled !== "boolean") invalid("Invalid conditions.");
  const expected = generateRules(input.conditions);
  if (!Array.isArray(input.rules) || input.rules.length !== expected.length) invalid("Provide every rule combination exactly once.");
  const seen = new Set();
  const rules = input.rules.map((rule) => {
    keysOnly(rule, ["id", "locationType", "gstType", "amount", "basis"]);
    const combination = expected.find((item) => item.locationType === rule.locationType && item.gstType === rule.gstType);
    if (!combination) invalid("Invalid location/GST combination.");
    if (seen.has(combination.id)) invalid("Duplicate rule combination.");
    seen.add(combination.id);
    if (typeof rule.amount !== "number" || !Number.isFinite(rule.amount) || rule.amount < 0) invalid("Amount must be a finite number of zero or more.");
    if (typeof rule.basis !== "string" || !Object.hasOwn(BASES, rule.basis)) invalid("Invalid calculation basis.");
    if (input.calculationType === "actual" && rule.amount !== 0) invalid("Actual expenses do not have a configured limit or rate.");
    return { ...combination, amount: rule.amount, basis: rule.basis };
  });
  return {
    name: input.name.normalize("NFKC").trim().replace(/\s+/gu, " "), description: input.description.trim(),
    travelRouteEnabled: input.travelRouteEnabled ?? false,
    calculationType: input.calculationType, active: input.active, conditions: { ...input.conditions },
    locationOptions: input.conditions.locationEnabled ? [...LOCATIONS] : [],
    gstOptions: input.conditions.gstEnabled ? [...GST_TYPES] : [], rules,
  };
}
