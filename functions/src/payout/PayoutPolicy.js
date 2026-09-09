"use strict";

const ALLOWED_PROVIDERS = new Set(["cashfree"]);
const ALLOWED_ENVIRONMENTS = new Set(["sandbox", "production"]);
const ALLOWED_AUTH_MODES = new Set(["PARTNER", "MERCHANT", "PUBLIC_KEY"]);
const ALLOWED_INPUT_FIELDS = new Set(["provider", "environment", "authMode", "merchantId"]);
const SECRET_FIELDS = new Set(["secretRef", "clientSecret", "clientId", "apiKey", "apiSecret", "credentials", "secret", "publicKey"]);

function canManagePayoutSettings(actor) {
  return Boolean(actor?.isOwner || actor?.permissions?.includes("company.manage"));
}

function isCashfreePayoutAuthMode(authMode) {
  return authMode === "MERCHANT" || authMode === "PUBLIC_KEY";
}

function authorizePayoutSettings(actor) {
  if (!actor?.uid) throw new Error("UNAUTHENTICATED");
  if (!actor.companyId || !canManagePayoutSettings(actor)) throw new Error("FORBIDDEN");
  return actor.companyId;
}

function assertCompanyScope(actor, requestedCompanyId) {
  authorizePayoutSettings(actor);
  if (requestedCompanyId !== undefined) throw new Error("BROWSER_COMPANY_ID_FORBIDDEN");
  return actor.companyId;
}

function validatePayoutSettingsInput(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("INVALID_PAYOUT_SETTINGS");
  const keys = Object.keys(input);
  if (keys.some((key) => SECRET_FIELDS.has(key))) throw new Error("SECRET_FIELD_FORBIDDEN");
  if (keys.some((key) => !ALLOWED_INPUT_FIELDS.has(key))) throw new Error("INVALID_PAYOUT_FIELD");

  const provider = String(input.provider || "cashfree").trim().toLowerCase();
  const environment = String(input.environment || "sandbox").trim().toLowerCase();
  const authMode = input.authMode == null || input.authMode === "" ? null : String(input.authMode).trim().toUpperCase();
  const merchantId = input.merchantId == null || input.merchantId === "" ? null : String(input.merchantId).trim();
  if (!ALLOWED_PROVIDERS.has(provider)) throw new Error("INVALID_PAYOUT_PROVIDER");
  if (!ALLOWED_ENVIRONMENTS.has(environment)) throw new Error("INVALID_PAYOUT_ENVIRONMENT");
  if (authMode && !ALLOWED_AUTH_MODES.has(authMode)) throw new Error("INVALID_PAYOUT_AUTH_MODE");
  if (merchantId && (merchantId.length > 128 || !/^[A-Za-z0-9._-]+$/.test(merchantId))) throw new Error("INVALID_MERCHANT_ID");

  return { provider, environment, authMode, merchantId };
}

module.exports = {
  ALLOWED_AUTH_MODES,
  assertCompanyScope,
  authorizePayoutSettings,
  canManagePayoutSettings,
  validatePayoutSettingsInput,
  isCashfreePayoutAuthMode,
};
