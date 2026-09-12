export const expenseKey = (expense, field) => String(expense[`${field}FirestoreId`] || expense[`${field}Id`] || expense[`${field}Name`] || expense[field] || "");
export const policyExcess = (expense) => typeof expense.allowedAmount === "number" && Number.isFinite(expense.allowedAmount)
  ? Math.round(Math.max(0, Number(expense.amount || 0) - expense.allowedAmount) * 100) / 100 : 0;
export function expenseOptions(expenses, field) {
  return [...new Map(expenses.map((expense) => [expenseKey(expense, field), {
    id: expenseKey(expense, field), name: expense[`${field}Name`] || expense[field] || expenseKey(expense, field),
  }])).values()].filter((item) => item.id).sort((a, b) => a.name.localeCompare(b.name));
}
export function filterExpenses(expenses, filters) {
  const search = filters.search.trim().toLowerCase();
  return expenses.filter((expense) => (!filters.fromDate || expense.date >= filters.fromDate)
    && (!filters.toDate || expense.date <= filters.toDate)
    && ["employee", "project", "category"].every((field) => !filters[field] || expenseKey(expense, field) === filters[field])
    && (!filters.status || expense.status === filters.status)
    && (!search || [expense.employeeName, expense.employeeId, expense.projectName, expense.description].some((value) => String(value || "").toLowerCase().includes(search))));
}
export function summarizeExpenses(expenses) {
  const summary = { totalExpense: 0, approvedExpense: 0, pendingExpense: 0, rejectedExpense: 0, overPolicy: 0 };
  for (const expense of expenses) {
    const amount = Number(expense.amount);
    if (!Number.isFinite(amount)) continue;
    summary.totalExpense += amount;
    if (["approved", "pending", "rejected"].includes(expense.status)) summary[`${expense.status}Expense`] += amount;
    summary.overPolicy += policyExcess(expense);
  }
  return Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Math.round(value * 100) / 100]));
}
