"use strict";

const roundMoney = (value) =>
  Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

function expenseMonthKey(expense) {
  const date = String(expense?.date || expense?.expenseDate || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return date.slice(0, 7);
}

function expensePolicyExcess(expense) {
  const amount = Number(expense?.amount || 0);
  const allowedAmount = Number(expense?.allowedAmount);

  if (
    !Number.isFinite(amount) ||
    !Number.isFinite(allowedAmount)
  ) {
    return 0;
  }

  return roundMoney(
    Math.max(
      0,
      amount - allowedAmount
    )
  );
}

function expenseSummaryContribution(expense) {
  if (!expense) {
    return {
      totalCount: 0,
      totalExpense: 0,
      approvedExpense: 0,
      pendingExpense: 0,
      rejectedExpense: 0,
      overPolicy: 0,
    };
  }

  const amount = Number(expense.amount);

  const safeAmount =
    Number.isFinite(amount)
      ? amount
      : 0;

  const status =
    String(
      expense.status || ""
    ).toLowerCase();

  return {
    totalCount: 1,

    totalExpense:
      roundMoney(safeAmount),

    approvedExpense:
      status === "approved"
        ? roundMoney(safeAmount)
        : 0,

    pendingExpense:
      status === "pending"
        ? roundMoney(safeAmount)
        : 0,

    rejectedExpense:
      status === "rejected"
        ? roundMoney(safeAmount)
        : 0,

    overPolicy:
      expensePolicyExcess(expense),
  };
}

function expenseSummaryDelta(before, after) {
  const previous =
    expenseSummaryContribution(before);

  const next =
    expenseSummaryContribution(after);

  return {
    totalCount:
      next.totalCount -
      previous.totalCount,

    totalExpense:
      roundMoney(
        next.totalExpense -
        previous.totalExpense
      ),

    approvedExpense:
      roundMoney(
        next.approvedExpense -
        previous.approvedExpense
      ),

    pendingExpense:
      roundMoney(
        next.pendingExpense -
        previous.pendingExpense
      ),

    rejectedExpense:
      roundMoney(
        next.rejectedExpense -
        previous.rejectedExpense
      ),

    overPolicy:
      roundMoney(
        next.overPolicy -
        previous.overPolicy
      ),
  };
}

function emptyExpenseMonthlySummary(month) {
  return {
    month,
    totalCount: 0,
    totalExpense: 0,
    approvedExpense: 0,
    pendingExpense: 0,
    rejectedExpense: 0,
    overPolicy: 0,
  };
}

function applyExpenseSummaryDelta(
  current,
  delta
) {
  return {
    ...current,

    totalCount:
      Math.max(
        0,
        Number(current?.totalCount || 0) +
          Number(delta.totalCount || 0)
      ),

    totalExpense:
      Math.max(
        0,
        roundMoney(
          Number(current?.totalExpense || 0) +
            Number(delta.totalExpense || 0)
        )
      ),

    approvedExpense:
      Math.max(
        0,
        roundMoney(
          Number(current?.approvedExpense || 0) +
            Number(delta.approvedExpense || 0)
        )
      ),

    pendingExpense:
      Math.max(
        0,
        roundMoney(
          Number(current?.pendingExpense || 0) +
            Number(delta.pendingExpense || 0)
        )
      ),

    rejectedExpense:
      Math.max(
        0,
        roundMoney(
          Number(current?.rejectedExpense || 0) +
            Number(delta.rejectedExpense || 0)
        )
      ),

    overPolicy:
      Math.max(
        0,
        roundMoney(
          Number(current?.overPolicy || 0) +
            Number(delta.overPolicy || 0)
        )
      ),
  };
}

module.exports = {
  expenseMonthKey,
  expensePolicyExcess,
  expenseSummaryContribution,
  expenseSummaryDelta,
  emptyExpenseMonthlySummary,
  applyExpenseSummaryDelta,
};