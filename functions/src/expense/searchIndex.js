"use strict";

const MAX_TERMS = 160;
const MIN_PREFIX_LENGTH = 2;
const MAX_PREFIX_LENGTH = 14;

function normalizeExpenseSearch(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function expenseSearchValues(expense = {}) {
  return [
    expense.employeeName,
    expense.employeeId,
    expense.projectName,
    expense.projectId,
    expense.categoryName,
    expense.category,
    expense.description,
    expense.travelFrom,
    expense.travelTo,
    expense.vendorName,
    expense.labourName,
    expense.title,
    expense.remarks,
  ]
    .map(normalizeExpenseSearch)
    .filter(Boolean);
}

function buildExpenseSearchTerms(expense = {}) {
  const terms = new Set();

  for (const value of expenseSearchValues(expense)) {
    const words = value.split(" ").filter(Boolean);

    for (const word of words) {
      terms.add(word);

      const maxLength = Math.min(
        word.length,
        MAX_PREFIX_LENGTH
      );

      for (
        let length = MIN_PREFIX_LENGTH;
        length <= maxLength;
        length += 1
      ) {
        terms.add(word.slice(0, length));

        if (terms.size >= MAX_TERMS) {
          return [...terms];
        }
      }
    }

    if (value.length <= 80) {
      terms.add(value);
    }

    if (terms.size >= MAX_TERMS) {
      return [...terms].slice(0, MAX_TERMS);
    }
  }

  return [...terms].slice(0, MAX_TERMS);
}

function expenseSearchLookupTerm(value) {
  const normalized = normalizeExpenseSearch(value);

  if (normalized.length < MIN_PREFIX_LENGTH) {
    return "";
  }

  const firstWord = normalized.split(" ")[0];

  return firstWord.slice(
    0,
    MAX_PREFIX_LENGTH
  );
}

module.exports = {
  normalizeExpenseSearch,
  expenseSearchValues,
  buildExpenseSearchTerms,
  expenseSearchLookupTerm,
};