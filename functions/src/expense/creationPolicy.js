"use strict";
const BASES = { per_expense: true, per_day: true, per_person: true, per_unit: true };
const CALCULATION_TYPES = { fixed_limit: true, per_unit: true, actual: true };

const invalid = (message) => { throw new Error(`INVALID_EXPENSE: ${message}`); };
const id = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const requiresQuantity = (category, rule) => category?.calculationType === "per_unit" && rule?.basis !== "per_expense";

function validateExpenseInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) invalid("Invalid request.");
  // Policy values may be sent by older clients but are never used as authority.
  const permitted = new Set(["requestId", "projectFirestoreId", "categoryId", "date", "description", "locationType", "gstType", "quantity", "amount", "billUrl", "travelFrom", "travelTo", "configuredRate", "configuredLimit", "allowedAmount", "policyExceeded", "excessAmount"]);
  if (Object.keys(input).some((key) => !permitted.has(key))) invalid("Unsupported or protected fields supplied.");
  if (typeof input.requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(input.requestId)) invalid("Invalid submission identifier.");
  if (!id(input.projectFirestoreId)) invalid("Select a project.");
  if (!id(input.categoryId)) invalid("Select a category.");
  if (typeof input.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(`${input.date}T00:00:00Z`)) || new Date(`${input.date}T00:00:00Z`).toISOString().slice(0, 10) !== input.date) invalid("Enter a valid expense date.");
  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0 || !Number.isSafeInteger(Math.round(input.amount * 100)) || money(input.amount) !== input.amount) invalid("Amount must be greater than zero with at most two decimal places.");
  if (input.description !== undefined && (typeof input.description !== "string" || input.description.length > 2000)) invalid("Description must be at most 2000 characters.");
  if (input.billUrl !== undefined && (typeof input.billUrl !== "string" || input.billUrl.length > 2048)) invalid("Invalid receipt URL.");
  const billUrl = (input.billUrl || "").trim();
  if (billUrl) {
    let url;
    try { url = new URL(billUrl); } catch { invalid("Enter a valid HTTPS receipt URL."); }
    if (url.protocol !== "https:" || url.username || url.password) invalid("Enter a valid HTTPS receipt URL.");
  }
  for (const key of ["locationType", "gstType"]) {
    if (input[key] !== undefined && (typeof input[key] !== "string" || input[key].length > 100)) invalid("Invalid expense conditions.");
  }
  if (input.quantity !== undefined && (typeof input.quantity !== "number" || !Number.isFinite(input.quantity) || input.quantity <= 0 || input.quantity > 1e9)) invalid("Quantity must be greater than zero.");
  return {
    requestId: input.requestId, projectFirestoreId: input.projectFirestoreId, categoryId: input.categoryId,
    date: input.date, description: (input.description || "").trim(), amount: input.amount, billUrl,
    ...(input.travelFrom !== undefined ? { travelFrom: input.travelFrom } : {}),
    ...(input.travelTo !== undefined ? { travelTo: input.travelTo } : {}),
    ...(input.locationType !== undefined ? { locationType: input.locationType } : {}),
    ...(input.gstType !== undefined ? { gstType: input.gstType } : {}),
    ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
  };
}

function resolveExpenseRule(category, selection) {
  if (!category || category.active !== true) invalid("Category is unavailable or disabled. Reload categories.");
  if (typeof category.calculationType !== "string" || !Object.hasOwn(CALCULATION_TYPES, category.calculationType)) invalid("Category calculation is not configured correctly.");
  const conditions = category.conditions;
  if (typeof conditions?.locationEnabled !== "boolean" || typeof conditions?.gstEnabled !== "boolean") invalid("Category conditions are not configured correctly.");
  for (const [enabled, options, field] of [[conditions.locationEnabled, category.locationOptions, "locationType"], [conditions.gstEnabled, category.gstOptions, "gstType"]]) {
    if (enabled && (!Array.isArray(options) || !options.includes(selection[field]))) invalid(`Select a valid ${field === "locationType" ? "location" : "GST type"}.`);
    if (!enabled && selection[field] !== undefined) invalid("An unconfigured condition was supplied.");
  }
  const matches = (category.rules || []).filter((rule) => rule.locationType === (conditions.locationEnabled ? selection.locationType : null) && rule.gstType === (conditions.gstEnabled ? selection.gstType : null));
  if (matches.length !== 1) invalid("No unique category rule matches these conditions.");
  const rule = matches[0];
  if (typeof rule.basis !== "string" || !Object.hasOwn(BASES, rule.basis) || typeof rule.id !== "string" || !rule.id || typeof rule.amount !== "number" || !Number.isFinite(rule.amount) || rule.amount < 0) invalid("Category rule is not configured correctly.");
  return rule;
}

function calculateExpensePolicy(category, selection) {
  const rule = resolveExpenseRule(category, selection);
  const result = { calculationType: category.calculationType, ruleId: rule.id, ruleBasis: rule.basis, policyExceeded: false, excessAmount: 0 };
  if (category.conditions.locationEnabled) result.locationType = selection.locationType;
  if (category.conditions.gstEnabled) result.gstType = selection.gstType;
  if (requiresQuantity(category, rule)) {
    if (typeof selection.quantity !== "number" || !Number.isFinite(selection.quantity) || selection.quantity <= 0 || selection.quantity > 1e9) invalid("Enter a quantity greater than zero.");
    if (rule.basis === "per_person" && !Number.isInteger(selection.quantity)) invalid("Number of persons must be a whole number.");
  } else if (selection.quantity !== undefined && !(category.calculationType === "per_unit" && selection.quantity === 1)) invalid("Quantity does not apply to this rule.");
  if (category.calculationType === "actual") return result;
  if (category.calculationType === "fixed_limit") {
    result.configuredLimit = rule.amount;
    result.allowedAmount = money(rule.amount);
  } else {
    result.quantity = requiresQuantity(category, rule) ? selection.quantity : 1;
    result.configuredRate = rule.amount;
    result.allowedAmount = money(result.quantity * rule.amount);
  }
  if (!Number.isSafeInteger(Math.round(result.allowedAmount * 100))) invalid("Calculated allowance is too large.");
  result.excessAmount = money(Math.max(0, selection.amount - result.allowedAmount));
  result.policyExceeded = result.excessAmount > 0;
  return result;
}

module.exports = { money, requiresQuantity, validateExpenseInput, resolveExpenseRule, calculateExpensePolicy };
