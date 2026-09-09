const normalize = (value) => String(value || "").trim().toLowerCase();

export function matchesProjectExpense(expense, project) {
  const projectIds = new Set(
    [project?.id, project?.projectId].filter(Boolean).map((value) => String(value).trim())
  );

  if (!projectIds.size) return false;

  return [
    expense?.projectFirestoreId,
    expense?.projectId,
    expense?.project?.id,
    expense?.project?.projectId,
  ]
    .filter(Boolean)
    .some((value) => projectIds.has(String(value).trim()));
}

export function hasProjectExpenseReference(expense) {
  return Boolean(
    expense?.projectFirestoreId ||
      expense?.projectId ||
      expense?.project?.id ||
      expense?.project?.projectId
  );
}
