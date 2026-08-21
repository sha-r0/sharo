"use strict";

const PayoutProvider = require("./PayoutProvider");

class CashfreePayoutProvider extends PayoutProvider {
  constructor(configResolver, fetchImplementation = fetch) {
    super(configResolver);
    this.fetchImplementation = fetchImplementation;
  }

  async verifyConnection(config, credentials) {
    if (config?.authMode !== "MERCHANT") {
      return { ok: false, code: "NOT_CONFIGURED", message: "Partner payout connections are not supported." };
    }
    const endpoint = config.environment === "production"
      ? "https://payout-api.cashfree.com/api/v1/credentials/verify"
      : "https://payout-gamma.cashfree.com/api/v1/credentials/verify";
    try {
      const response = await this.fetchImplementation(endpoint, {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Client-Id": credentials.clientId,
          "X-Client-Secret": credentials.clientSecret,
        },
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      const successfulBody = String(body.status || "").toUpperCase() === "SUCCESS" || String(body.subCode || "") === "200";
      if (response.ok && successfulBody) {
        return { ok: true, code: "VERIFIED", message: "Cashfree merchant credentials verified." };
      }
      const invalid = response.status === 401 || response.status === 403;
      return { ok: false, code: invalid ? "INVALID_CREDENTIALS" : "PROVIDER_ERROR", message: invalid ? "Cashfree rejected the merchant credentials." : "Cashfree credential verification failed." };
    } catch {
      return { ok: false, code: "PROVIDER_UNAVAILABLE", message: "Cashfree credential verification is unavailable." };
    }
  }

  beneficiaryBaseUrl(environment) {
    return environment === "production"
      ? "https://api.cashfree.com/payout"
      : "https://sandbox.cashfree.com/payout";
  }

  beneficiaryHeaders(credentials) {
    return {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-version": "2024-01-01",
      "x-client-id": credentials.clientId,
      "x-client-secret": credentials.clientSecret,
    };
  }

  async getBeneficiary(config, credentials, identifiers) {
    const url = new URL(`${this.beneficiaryBaseUrl(config.environment)}/beneficiary`);
    if (identifiers?.beneficiaryId) {
      url.searchParams.set("beneficiary_id", identifiers.beneficiaryId);
    } else {
      url.searchParams.set("bank_account_number", identifiers.accountNumber);
      url.searchParams.set("bank_ifsc", identifiers.ifsc);
    }
    try {
      const response = await this.fetchImplementation(url, {
        method: "GET",
        headers: this.beneficiaryHeaders(credentials),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, found: true, beneficiary: body };
      if (response.status === 404) return { ok: false, found: false, code: "BENEFICIARY_NOT_FOUND" };
      return { ok: false, found: false, code: "BENEFICIARY_LOOKUP_FAILED" };
    } catch {
      return { ok: false, found: false, code: "PROVIDER_UNAVAILABLE" };
    }
  }

  async createBeneficiary(config, credentials, beneficiary) {
    try {
      const response = await this.fetchImplementation(`${this.beneficiaryBaseUrl(config.environment)}/beneficiary`, {
        method: "POST",
        headers: this.beneficiaryHeaders(credentials),
        body: JSON.stringify({
          beneficiary_id: beneficiary.beneficiaryId,
          beneficiary_name: beneficiary.accountHolderName,
          beneficiary_instrument_details: {
            bank_account_number: beneficiary.accountNumber,
            bank_ifsc: beneficiary.ifsc,
          },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, beneficiary: body };
      if (response.status === 409) return { ok: false, duplicate: true, code: String(body.type || body.code || "BENEFICIARY_ALREADY_EXISTS") };
      return { ok: false, duplicate: false, code: "BENEFICIARY_CREATE_FAILED" };
    } catch {
      return { ok: false, duplicate: false, code: "PROVIDER_UNAVAILABLE" };
    }
  }

  async createTransfer(config, credentials, transfer) {
    if (config?.environment !== "sandbox") return { ok: false, certain: true, code: "PRODUCTION_DISPATCH_BLOCKED" };
    try {
      const response = await this.fetchImplementation("https://sandbox.cashfree.com/payout/transfers", {
        method: "POST",
        headers: this.beneficiaryHeaders(credentials),
        body: JSON.stringify({
          transfer_id: transfer.transferId,
          transfer_amount: transfer.amount,
          beneficiary_details: { beneficiary_id: transfer.beneficiaryId },
        }),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, result: sanitizeTransferResponse(body) };
      return { ok: false, certain: response.status < 500, code: transferFailureCode(body, response.status) };
    } catch {
      return { ok: false, certain: false, code: "TRANSFER_OUTCOME_UNKNOWN" };
    }
  }

  async getTransferStatus(config, credentials, transferId) {
    if (config?.environment !== "sandbox") return { ok: false, found: false, certain: true, code: "PRODUCTION_DISPATCH_BLOCKED" };
    const url = new URL("https://sandbox.cashfree.com/payout/transfers");
    url.searchParams.set("transfer_id", transferId);
    try {
      const response = await this.fetchImplementation(url, {
        method: "GET",
        headers: this.beneficiaryHeaders(credentials),
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) return { ok: true, found: true, result: sanitizeTransferResponse(body) };
      if (response.status === 404) return { ok: false, found: false, certain: true, code: "TRANSFER_NOT_FOUND" };
      return { ok: false, found: false, certain: response.status < 500, code: transferFailureCode(body, response.status) };
    } catch {
      return { ok: false, found: false, certain: false, code: "TRANSFER_STATUS_UNKNOWN" };
    }
  }
}

function transferFailureCode(body, status) {
  const value = String(body?.type || body?.code || body?.status_code || `HTTP_${status}`).toUpperCase();
  return value.replace(/[^A-Z0-9_-]/g, "_").slice(0, 80) || "PROVIDER_ERROR";
}

function sanitizeTransferResponse(body) {
  return {
    transferId: String(body?.transfer_id || "").slice(0, 40),
    cfTransferId: body?.cf_transfer_id == null ? null : String(body.cf_transfer_id).slice(0, 100),
    providerStatus: String(body?.status || "UNKNOWN").toUpperCase().slice(0, 50),
    providerStatusCode: String(body?.status_code || "").toUpperCase().slice(0, 80) || null,
  };
}

module.exports = CashfreePayoutProvider;
module.exports.sanitizeTransferResponse = sanitizeTransferResponse;
