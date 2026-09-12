import lifecycle from "../../../../../functions/src/expense/lifecycle.js";

const ACTIONS = new Set(["approve", "reject"]);
const ALLOWED_INPUT_KEYS = new Set(["action", "managerRemarks"]);

export function validateExpenseMutationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_REQUEST");
  if (Object.keys(input).some((key) => !ALLOWED_INPUT_KEYS.has(key))) throw new Error("INVALID_REQUEST");
  if (!ACTIONS.has(input.action)) throw new Error("INVALID_REQUEST");
  if (input.action === "reject") {
    if (typeof input.managerRemarks !== "string" || !input.managerRemarks.trim() || input.managerRemarks.length > 2000) throw new Error("REASON_REQUIRED");
    return { action: input.action, managerRemarks: input.managerRemarks.trim() };
  }
  if ("managerRemarks" in input) throw new Error("INVALID_REQUEST");
  return { action: input.action };
}

export const assertExpenseMutationAuthorized = (context, action, expense) => lifecycle.assertAuthorized(context, action, expense);
