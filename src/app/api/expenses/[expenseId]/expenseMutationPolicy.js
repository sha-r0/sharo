const ACTIONS = new Set(["approve", "reject"]);
const ALLOWED_INPUT_KEYS = new Set(["action"]);

export function validateExpenseMutationInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_REQUEST");
  if (Object.keys(input).some((key) => !ALLOWED_INPUT_KEYS.has(key))) throw new Error("INVALID_REQUEST");
  if (!ACTIONS.has(input.action)) throw new Error("INVALID_REQUEST");
  return { action: input.action };
}

export function expensePermissionForAction(action) {
  return "expense.approve";
}

export function employeeOwnsExpense(employee, expense) {
  if (!employee || !expense) return false;
  if (expense.employeeFirestoreId) return String(expense.employeeFirestoreId) === String(employee.id);
  return Boolean(expense.employeeId) && String(expense.employeeId) === String(employee.employeeId || employee.login?.employeeId || "");
}

export function assertExpenseMutationAuthorized(context, action, expense) {
  if (context?.isOwner) return;
  const permission = expensePermissionForAction(action);
  const permissions = Array.isArray(context?.permissions) ? context.permissions : [];
  if (!permissions.includes(permission) && !permissions.includes("expense.manage")) throw new Error("FORBIDDEN");
  const role = String(context?.employee?.access?.roleId || context?.employee?.employment?.role || "employee").toLowerCase();
  if (role === "employee") throw new Error("FORBIDDEN");
}
