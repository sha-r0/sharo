"use strict";
// Only missing flags on legacy Travel categories receive the compatibility default.
function travelRouteEnabled(category) {
  return typeof category?.travelRouteEnabled === "boolean" ? category.travelRouteEnabled
    : category?.travelRouteEnabled === undefined && String(category?.name || "").trim().toLowerCase() === "travel";
}
function resolveTravelRoute(category, input) {
  if (!travelRouteEnabled(category)) return {};
  const route = {};
  for (const field of ["travelFrom", "travelTo"]) {
    if (typeof input[field] !== "string" || !input[field].trim() || input[field].length > 300) throw new Error("INVALID_EXPENSE: From and To are required (maximum 300 characters each).");
    route[field] = input[field].trim();
  }
  return route;
}
module.exports = { travelRouteEnabled, resolveTravelRoute };
