"use strict";

function validCredentials(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length);
}

class PayoutCredentialResolver {
  constructor({ partnerCredentialProvider, merchantSecretStore }) {
    this.partnerCredentialProvider = partnerCredentialProvider;
    this.merchantSecretStore = merchantSecretStore;
  }

  async resolve(settings, context = {}) {
    if (settings.authMode === "PARTNER") {
      if (!settings.merchantId) return { configured: false, code: "MERCHANT_ID_REQUIRED" };
      const credentials = await this.partnerCredentialProvider?.getCredentials?.();
      if (!validCredentials(credentials)) return { configured: false, code: "PARTNER_SECRET_NOT_CONFIGURED" };
      return { configured: true, authMode: "PARTNER", merchantId: settings.merchantId, credentials };
    }

    if (settings.authMode === "MERCHANT") {
      if (!settings.secretRef) return { configured: false, code: "MERCHANT_SECRET_REF_REQUIRED" };
      const credentials = await this.merchantSecretStore?.resolve?.(settings.secretRef, context);
      if (!validCredentials(credentials)) return { configured: false, code: "MERCHANT_SECRET_NOT_CONFIGURED" };
      return { configured: true, authMode: "MERCHANT", merchantId: settings.merchantId || null, credentials };
    }

    if (settings.authMode === "PUBLIC_KEY") {
      if (!settings.secretRef) return { configured: false, code: "PUBLIC_KEY_SECRET_REF_REQUIRED" };
      const credentials = await this.merchantSecretStore?.resolve?.(settings.secretRef, context);
      if (!validCredentials(credentials) || !String(credentials.publicKey || "").trim()) {
        return { configured: false, code: "PUBLIC_KEY_SECRET_NOT_CONFIGURED" };
      }
      return { configured: true, authMode: "PUBLIC_KEY", merchantId: settings.merchantId || null, credentials };
    }

    return { configured: false, code: "AUTH_MODE_REQUIRED" };
  }
}

class EnvironmentPartnerCredentialProvider {
  constructor(readSecret) {
    this.readSecret = readSecret;
  }

  async getCredentials() {
    try {
      const raw = this.readSecret?.();
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return validCredentials(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
}

class UnconfiguredMerchantSecretStore {
  async resolve() {
    return null;
  }
}

module.exports = {
  EnvironmentPartnerCredentialProvider,
  PayoutCredentialResolver,
  UnconfiguredMerchantSecretStore,
};
