const present = (value) => value !== undefined && value !== null && String(value).trim() !== "";
export function expenseDetails(expense) {
  const rows = [];
  const add = (label, value) => { if (present(value)) rows.push([label, String(value)]); };
  add("From", expense.travelFrom); add("To", expense.travelTo); add("Location", expense.locationType);
  add("GST", ({ with_gst: "With GST", without_gst: "Without GST" })[expense.gstType]);
  const basis = expense.ruleBasis;
  const unit = expense.unitLabel || expense.unit || ({ per_person: "person", per_day: "day", per_unit: "unit" })[basis];
  const distance = /^(km|kilomet(er|re)s?|mi|miles?)$/i.test(unit || "");
  const quantity = expense.quantity ?? expense.labourCount ?? expense.travelDistance;
  if (present(quantity)) add(distance || (expense.quantity == null && expense.travelDistance != null && expense.labourCount == null) ? "Distance" : basis === "per_person" || expense.labourCount != null ? "Labour Count" : basis === "per_day" ? "Days" : "Quantity", `${quantity}${unit ? ` ${unit}` : ""}`);
  if (typeof expense.configuredRate === "number" && Number.isFinite(expense.configuredRate)) add("Rate", `₹${expense.configuredRate.toLocaleString("en-IN")}${unit ? ` / ${unit}` : ""}`);
  return rows;
}
