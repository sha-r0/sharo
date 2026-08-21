"use strict";

class PayoutProvider {
  constructor(configResolver) {
    this.configResolver = configResolver;
  }

  getConfig(companyId) {
    return this.configResolver(companyId);
  }

  async verifyConnection() {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message: "Provider connection verification is not configured.",
    };
  }

  createBeneficiary() {
    throw new Error("PAYOUT_PROVIDER_NOT_IMPLEMENTED");
  }

  getBeneficiary() {
    throw new Error("PAYOUT_PROVIDER_NOT_IMPLEMENTED");
  }

  createTransfer() {
    throw new Error("PAYOUT_PROVIDER_NOT_IMPLEMENTED");
  }

  getTransferStatus() {
    throw new Error("PAYOUT_PROVIDER_NOT_IMPLEMENTED");
  }

  verifyWebhook() {
    throw new Error("PAYOUT_PROVIDER_NOT_IMPLEMENTED");
  }
}

module.exports = PayoutProvider;
