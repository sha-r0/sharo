import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  isVendorPaymentActiveAllocation,
  isVendorPaymentFinanciallyPaid,
  isVendorPaymentInactive,
} from "../src/app/(dashboard)/manager/vendors/services/VendorPaymentPolicy.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

const repo = read("../src/app/(dashboard)/manager/vendors/services/VendorRepository.js");
const route = read("../src/app/api/vendor-payments/po-bill/route.js");
const rules = read("../firestore.rules");

test("vendor payment status semantics are explicit", () => {
  assert.equal(isVendorPaymentFinanciallyPaid({ status: "paid" }), true);
  assert.equal(isVendorPaymentFinanciallyPaid({ status: "completed" }), true);
  assert.equal(isVendorPaymentFinanciallyPaid({ status: "approved" }), true);
  assert.equal(isVendorPaymentFinanciallyPaid({ status: "pending" }), false);
  assert.equal(isVendorPaymentFinanciallyPaid({ status: "missing" }), false);

  assert.equal(isVendorPaymentActiveAllocation({ status: "paid" }), true);
  assert.equal(isVendorPaymentActiveAllocation({ status: "completed" }), true);
  assert.equal(isVendorPaymentActiveAllocation({ status: "approved" }), true);
  assert.equal(isVendorPaymentActiveAllocation({ status: "pending" }), true);
  assert.equal(isVendorPaymentActiveAllocation({ status: "processing" }), true);
  assert.equal(isVendorPaymentActiveAllocation({ status: "failed" }), false);
  assert.equal(isVendorPaymentActiveAllocation({ status: "" }), false);
  assert.equal(isVendorPaymentInactive({ status: "cancelled" }), true);
  assert.equal(isVendorPaymentInactive({ status: "rejected" }), true);
});

test("PO-linked vendor payments are routed to the server API", () => {
  assert.match(repo, /async createPurchaseOrderBillPayment\(companyId, input, approver\)/);
  assert.match(repo, /\/api\/vendor-payments\/po-bill/);
  assert.match(repo, /if \(linkedPurchaseOrderId \|\| linkedPurchaseOrderBillId\) \{/);
  assert.match(repo, /return this\.createPurchaseOrderBillPayment\(companyId, input, approver\);/);
});

test("PO bill payment API is tenant-scoped and validates canonical links", () => {
  assert.match(route, /authorizeCompanyRequest\(request\)/);
  assert.match(route, /requireCompanyPermission\(context, "vendors\.create"\)/);
  assert.match(route, /purchaseOrderRef\(context\.companyId, purchaseOrderId\)/);
  assert.match(route, /purchaseOrderBillsRef\(context\.companyId, purchaseOrderId\)\.doc\(purchaseOrderBillId\)/);
  assert.match(route, /companyVendorPaymentsRef\(context\.companyId\)[\s\S]*where\("purchaseOrderBillId", "==", purchaseOrderBillId\)/);
  assert.match(route, /companyVendorPaymentsRef\(context\.companyId\)[\s\S]*where\("purchaseOrderId", "==", purchaseOrderId\)/);
  assert.match(route, /evaluateVendorPayment\(/);
  assert.match(route, /paymentSource: "purchase_order_bill"/);
  assert.match(route, /approvedBy:/);
  assert.match(route, /createdBy:/);
  assert.match(route, /transaction\.set\(paymentRef, payment\)/);
});

test("Firestore rules block browser-forged PO-linked vendor payments", () => {
  assert.match(rules, /function validVendorPaymentClientWrite\(\)/);
  assert.match(rules, /paymentSource == 'project_vendor'/);
  assert.match(rules, /purchaseOrderId/);
  assert.match(rules, /purchaseOrderBillId/);
  assert.match(rules, /allow create, update: if canWrite\(companyId, 'vendors'\) && validVendorPaymentClientWrite\(\);/);
});
