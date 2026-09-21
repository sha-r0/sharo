import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { normalizeQuotationRecord } from "../src/app/(dashboard)/manager/quotation-builder/services/quotationCompatibility.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");
const service = read("../src/app/(dashboard)/manager/quotation-builder/services/QuotationService.js");
const setupService = read("../src/app/(dashboard)/manager/quotation-builder/services/QuotationSetupService.js");
const page = read("../src/app/(dashboard)/manager/quotation-builder/page.jsx");
const api = read("../src/app/api/quotations/route.js");
const newQuotationForm = read("../src/app/(dashboard)/manager/quotation-builder/new/components/QuotationForm.jsx");

test("migrated quotation without createdBy remains visible and normalized", () => {
  const quotation = normalizeQuotationRecord("legacy-id", { meta: { quotationNo: "QTN-OLD", clientName: "Legacy Client" }, date: "2026-01-15" });
  assert.equal(quotation.quotationNumber, "QTN-OLD");
  assert.equal(quotation.clientName, "Legacy Client");
  assert.equal(quotation.clientId, "");
  assert.equal(quotation.quotationDate, "2026-01-15");
  assert.equal("createdBy" in quotation, false);
});

test("quotation with unresolved client link still has safe display values", () => {
  const quotation = normalizeQuotationRecord("QTN-1", { quotationNumber: "QTN-1", clientName: "Stored Client", clientId: "" });
  assert.equal(quotation.clientName, "Stored Client");
  assert.equal(quotation.clientId, "");
});

test("quotation dashboard uses company-scoped collections without owner filtering", () => {
  assert.match(service, /"Companies",\s*companyId,\s*"Quotations"/);
  assert.match(service, /fetch\(`\/api\/quotations\/list/);
  assert.doesNotMatch(service, /orderBy\("(?:createdAt|quotationDate)"/);
  assert.doesNotMatch(service, /where\("createdBy"/);
  assert.doesNotMatch(service, /collection\(\s*db,\s*"quotations"/);
});

test("page loads settings through authenticated API with no browser settings write", () => {
  assert.match(page, /QuotationSetupService\.load\(company\.id\)/);
  assert.match(setupService, /fetch\("\/api\/quotations"/);
  assert.doesNotMatch(setupService, /setDoc\(|updateDoc\(|getDoc\(/);
});

test("settings and quotation counter writes are server-authorized", () => {
  assert.match(api, /authorizeCompanyRequest\(request\)/);
  assert.match(api, /requireCompanyPermission\(context, "quotation\.manage"\)/);
  assert.match(api, /requireCompanyPermission\(context, "quotation\.create", "quotation\.manage"\)/);
  assert.match(api, /runTransaction/);
  assert.match(api, /nextQuotationNumber: FieldValue\.increment\(1\)/);
  assert.doesNotMatch(service, /runTransaction\(|transaction\.update\(/);
});

test("new quotation uses dedicated server initialization without dashboard or browser Firestore reads", () => {
  assert.match(newQuotationForm, /QuotationService\.getNewQuotationData\(company\.id/);
  assert.doesNotMatch(newQuotationForm, /getDashboard\(|getQuotation\(|generateQuotationNumber\(/);
  assert.doesNotMatch(newQuotationForm, /getDoc\(|getDocs\(|collection\(|doc\(/);
  assert.match(service, /static async getNewQuotationData/);
  assert.match(api, /nextQuotationNumber: formatNextQuotationNumber\(settings\)/);
  assert.match(api, /companyRef\.collection\("Clients"\)\.orderBy\("companyName"\)/);
  assert.doesNotMatch(api, /collection\("Quotations"\)\.get\(\)/);
});

test("new quotation creation still posts to the authenticated quotation API", () => {
  assert.match(service, /fetch\("\/api\/quotations", \{ method: "POST"/);
  assert.match(newQuotationForm, /QuotationService\.createQuotation\(company\.id, payload\)/);
});
