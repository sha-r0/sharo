"use strict";

const crypto = require("node:crypto");

const NOT_FOUND = 5;
const ALREADY_EXISTS = 6;

function credentialPayload(credentials) {
  const clientId = String(credentials?.clientId || "").trim();
  const clientSecret = String(credentials?.clientSecret || "").trim();
  if (!clientId || !clientSecret) throw new Error("INVALID_MERCHANT_CREDENTIALS");
  const publicKey = credentials?.publicKey == null || credentials.publicKey === ""
    ? null
    : String(credentials.publicKey).trim();
  if (credentials?.publicKey != null && !publicKey) throw new Error("INVALID_PUBLIC_KEY");
  if (publicKey && !/BEGIN PUBLIC KEY/.test(publicKey)) throw new Error("INVALID_PUBLIC_KEY");
  if (publicKey && !/END PUBLIC KEY/.test(publicKey)) throw new Error("INVALID_PUBLIC_KEY");
  return publicKey ? { clientId, clientSecret, publicKey } : { clientId, clientSecret };
}

class GoogleSecretManagerStore {
  constructor({ client, projectId }) {
    if (!client) throw new Error("SECRET_MANAGER_CLIENT_REQUIRED");
    if (!projectId) throw new Error("SECRET_MANAGER_PROJECT_REQUIRED");
    this.client = client;
    this.projectId = projectId;
    this.parent = `projects/${projectId}`;
  }

  secretIdForCompany(companyId) {
    const suffix = crypto.createHash("sha256").update(String(companyId)).digest("hex").slice(0, 32);
    return `sharo-payout-${suffix}`;
  }

  secretRefForCompany(companyId) {
    return `${this.parent}/secrets/${this.secretIdForCompany(companyId)}`;
  }

  assertCompanyReference(secretRef, companyId) {
    const expected = this.secretRefForCompany(companyId);
    if (secretRef !== expected) throw new Error("SECRET_COMPANY_MISMATCH");
    return expected;
  }

  async ensureSecret(companyId) {
    const secretRef = this.secretRefForCompany(companyId);
    try {
      await this.client.getSecret({ name: secretRef });
    } catch (error) {
      if (Number(error?.code) !== NOT_FOUND) throw error;
      try {
        await this.client.createSecret({
          parent: this.parent,
          secretId: this.secretIdForCompany(companyId),
          secret: { replication: { automatic: {} } },
        });
      } catch (createError) {
        if (Number(createError?.code) !== ALREADY_EXISTS) throw createError;
      }
    }
    return secretRef;
  }

  async stageCredentials(companyId, credentials) {
    const secretRef = await this.ensureSecret(companyId);
    const payload = credentialPayload(credentials);
    const [version] = await this.client.addSecretVersion({
      parent: secretRef,
      payload: { data: Buffer.from(JSON.stringify(payload), "utf8") },
    });
    await this.client.disableSecretVersion({ name: version.name });
    return { secretRef, versionName: version.name };
  }

  async activateVersion(versionName) {
    await this.client.enableSecretVersion({ name: versionName });
  }

  async discardVersion(versionName) {
    try {
      await this.client.disableSecretVersion({ name: versionName });
    } catch (error) {
      if (Number(error?.code) !== 9) throw error;
    }
  }

  async resolve(secretRef, { companyId } = {}) {
    this.assertCompanyReference(secretRef, companyId);
    const versions = await this.enabledVersions(secretRef);
    const latest = versions
      .sort((a, b) => Number(String(b.name).split("/").pop()) - Number(String(a.name).split("/").pop()))[0];
    if (!latest?.name) return null;
    return this.readCredentialVersion(latest.name);
  }

  async enabledVersions(secretRef) {
    const [versions] = await this.client.listSecretVersions({ parent: secretRef, filter: "state=ENABLED" });
    return versions
      .filter((version) => String(version.state) === "ENABLED" || Number(version.state) === 1)
      .sort((a, b) => Number(String(a.name).split("/").pop()) - Number(String(b.name).split("/").pop()));
  }

  async readCredentialVersion(versionName) {
    const [response] = await this.client.accessSecretVersion({ name: versionName });
    const raw = response.payload?.data?.toString("utf8");
    if (!raw) return null;
    try {
      return credentialPayload(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async resolveAllEnabled(secretRef, { companyId } = {}) {
    this.assertCompanyReference(secretRef, companyId);
    const versions = await this.enabledVersions(secretRef);
    const credentials = [];
    for (const version of versions) {
      const value = await this.readCredentialVersion(version.name);
      if (value) credentials.push(value);
    }
    return credentials;
  }
}

module.exports = { GoogleSecretManagerStore, credentialPayload };
