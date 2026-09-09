"use strict";

const crypto = require("node:crypto");
const PayoutProvider = require("./PayoutProvider");

class CashfreePayoutProvider extends PayoutProvider {
  constructor(configResolver, fetchImplementation = fetch, options = {}) {
    super(configResolver);
    this.fetchImplementation = fetchImplementation;
    this.nowProvider = typeof options.nowProvider === "function" ? options.nowProvider : () => Math.floor(Date.now() / 1000);
    this.publicEncryptImplementation = typeof options.publicEncryptImplementation === "function" ? options.publicEncryptImplementation : crypto.publicEncrypt;
  }

  async verifyConnection(config, credentials) {
    if (config?.authMode !== "MERCHANT") {
      if (config?.authMode !== "PUBLIC_KEY") {
        return { ok: false, code: "NOT_CONFIGURED", message: "Partner payout connections are not supported." };
      }
    }
    const beneficiaryId = `SHARO_VERIFY_${crypto.randomBytes(4).toString("hex")}`;
    const headers = this.requestHeaders(config, credentials);
    if (headers.error) return { ok: false, code: headers.error, message: headers.message };
    try {
      const response = await this.fetchImplementation(this.beneficiaryUrl(config.environment, beneficiaryId), {
        method: "GET",
        headers: headers.value,
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        return { ok: true, code: "VERIFIED", message: "Cashfree merchant credentials verified." };
      }
      if (response.status === 404 && /beneficiary[_\s-]?not[_\s-]?found/i.test(String(body.code || body.type || body.message || body.subCode || ""))) {
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

  beneficiaryUrl(environment, beneficiaryId) {
    const url = new URL(`${this.beneficiaryBaseUrl(environment)}/beneficiary`);
    if (beneficiaryId) url.searchParams.set("beneficiary_id", beneficiaryId);
    return url;
  }

  publicKeySignature(credentials) {
    const publicKey = String(credentials?.publicKey || "").trim();
    if (!publicKey) throw new Error("INVALID_PUBLIC_KEY");
    const timestamp = String(this.nowProvider());
    const payload = Buffer.from(`${String(credentials.clientId || "").trim()}.${timestamp}`, "utf8");
    const encrypted = this.publicEncryptImplementation({
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    }, payload);
    return Buffer.from(encrypted).toString("base64");
  }

  authHeaders(config, credentials) {
    const headers = {
      accept: "application/json",
      "content-type": "application/json",
      "x-api-version": "2024-01-01",
      "x-client-id": credentials.clientId,
      "x-client-secret": credentials.clientSecret,
    };
    if (config?.authMode === "PUBLIC_KEY") {
      headers["x-cf-signature"] = this.publicKeySignature(credentials);
    }
    return headers;
  }

  requestHeaders(config, credentials) {
    try {
      return { value: this.authHeaders(config, credentials) };
    } catch (error) {
      if (error?.message === "INVALID_PUBLIC_KEY") {
        return { error: "INVALID_PUBLIC_KEY", message: "Cashfree public key is invalid." };
      }
      throw error;
    }
  }

  async getBeneficiary(config, credentials, identifiers) {
    const headers = this.requestHeaders(config, credentials);
    if (headers.error) return { ok: false, found: false, code: headers.error };
    try {
      const url = this.beneficiaryUrl(config.environment, identifiers?.beneficiaryId);
      if (!identifiers?.beneficiaryId) {
        url.searchParams.delete("beneficiary_id");
        url.searchParams.set("bank_account_number", identifiers.accountNumber);
        url.searchParams.set("bank_ifsc", identifiers.ifsc);
      }
      const response = await this.fetchImplementation(url, {
        method: "GET",
        headers: headers.value,
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
    const headers = this.requestHeaders(config, credentials);
    if (headers.error) return { ok: false, duplicate: false, code: headers.error };
    try {
      const response = await this.fetchImplementation(`${this.beneficiaryBaseUrl(config.environment)}/beneficiary`, {
        method: "POST",
        headers: headers.value,
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
    const headers = this.requestHeaders(config, credentials);
    if (headers.error) return { ok: false, certain: true, code: headers.error };
    try {
      const response = await this.fetchImplementation("https://sandbox.cashfree.com/payout/transfers", {
        method: "POST",
        headers: headers.value,
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
    const headers = this.requestHeaders(config, credentials);
    if (headers.error) return { ok: false, found: false, certain: true, code: headers.error };
    try {
      const response = await this.fetchImplementation(url, {
        method: "GET",
        headers: headers.value,
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
    transferUtr: body?.transfer_utr == null ? null : String(body.transfer_utr).slice(0, 100),
  };
}

module.exports = CashfreePayoutProvider;
module.exports.sanitizeTransferResponse = sanitizeTransferResponse;
module.exports.publicKeySignature = function publicKeySignature(credentials, nowProvider = () => Math.floor(Date.now() / 1000), publicEncryptImplementation = crypto.publicEncrypt) {
  const provider = new CashfreePayoutProvider(() => null, async () => { throw new Error("UNUSED"); }, { nowProvider, publicEncryptImplementation });
  return provider.publicKeySignature(credentials);
};
