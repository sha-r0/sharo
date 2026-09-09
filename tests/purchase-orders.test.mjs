import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  calculatePurchaseOrderTotals,
  formatPurchaseOrderNumber,
  getPurchaseOrderFinancialYearKey,
  isAllowedPurchaseOrderTransition,
  normalizePurchaseOrderStatus,
  purchaseOrderStatusFromAction,
  summarizePurchaseOrderProgress,
  validatePurchaseOrderBillItems,
  validatePurchaseOrderFulfillmentItems,
} from "../src/lib/purchase-orders.js";
import {
  summarizePurchaseOrderBillPayment,
  summarizePurchaseOrderPaymentSummary,
  summarizeProjectPurchaseOrderFinancials,
} from "../src/lib/purchase-order-financials.js";

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), "utf8");

const permissionCatalog = read("../src/app/allservice/rbac/permissionCatalog.js");
const authorizationService = read("../src/app/allservice/rbac/AuthorizationService.js");
const sidebar = read("../src/app/(dashboard)/manager/components/Sidebar.jsx");
const listApi = read("../src/app/api/purchase-orders/route.js");
const initApi = read("../src/app/api/purchase-orders/init/route.js");
const detailApi = read("../src/app/api/purchase-orders/[id]/route.js");
const fulfillApi = read("../src/app/api/purchase-orders/[id]/fulfillments/route.js");
const billApi = read("../src/app/api/purchase-orders/[id]/bills/route.js");
const cancelApi = read("../src/app/api/purchase-orders/[id]/cancel/route.js");
const sharedApi = read("../src/app/api/purchase-orders/_shared.js");
const actionsApi = read("../src/app/api/purchase-orders/_actions.js");
const listPage = read("../src/app/(dashboard)/manager/purchase-orders/page.jsx");
const detailPage = read("../src/app/(dashboard)/manager/purchase-orders/[id]/page.jsx");
const formPage = read("../src/app/(dashboard)/manager/purchase-orders/new/components/PurchaseOrderForm.jsx");
const docComponent = read("../src/app/(dashboard)/manager/purchase-orders/components/PurchaseOrderDocument.jsx");
const exportService = read("../src/app/(dashboard)/manager/purchase-orders/services/PurchaseOrderExportService.js");
const purchaseOrderService = read("../src/app/(dashboard)/manager/purchase-orders/services/PurchaseOrderService.js");
const projectDashboardService = read("../src/app/(dashboard)/manager/projects/services/ProjectDashboardService.js");
const projectIntelligenceHook = read("../src/app/(dashboard)/manager/projects/hooks/useProjectIntelligence.js");
const projectDetailsPage = read("../src/app/(dashboard)/manager/projects/[id]/page.jsx");
const projectAnalyticsService = read("../src/app/(dashboard)/manager/projects/services/ProjectAnalyticsService.js");

test("purchase order financial year and numbering follow April-to-March rules", () => {
  assert.equal(getPurchaseOrderFinancialYearKey(new Date("2026-09-08")), "2026-27");
  assert.equal(getPurchaseOrderFinancialYearKey(new Date("2027-02-10")), "2026-27");
  assert.equal(getPurchaseOrderFinancialYearKey(new Date("2027-04-01")), "2027-28");
  assert.equal(formatPurchaseOrderNumber({ financialYearKey: "2026-27", sequence: 1 }), "PO-26-27-001");
});

test("purchase order totals are server-safe and recomputed from items", () => {
  const totals = calculatePurchaseOrderTotals([
    { description: "Item 1", quantity: 2, rate: 100, gstRate: 18 },
    { description: "Item 2", quantity: 1, rate: 50, gstRate: 5 },
  ]);
  assert.equal(totals.subtotal, 250);
  assert.equal(totals.gstTotal, 38.5);
  assert.equal(totals.grandTotal, 288.5);
});

test("purchase order statuses remain controlled", () => {
  assert.equal(normalizePurchaseOrderStatus("draft"), "draft");
  assert.equal(normalizePurchaseOrderStatus("pending_approval"), "pending_approval");
  assert.equal(normalizePurchaseOrderStatus("issued"), "issued");
  assert.equal(purchaseOrderStatusFromAction("submit"), "pending_approval");
  assert.equal(purchaseOrderStatusFromAction("approve"), "approved");
  assert.equal(purchaseOrderStatusFromAction("issue"), "issued");
  assert.equal(purchaseOrderStatusFromAction("reject"), "rejected");
  assert.equal(purchaseOrderStatusFromAction("cancel"), "cancelled");
  assert.equal(isAllowedPurchaseOrderTransition("draft", "pending_approval"), true);
  assert.equal(isAllowedPurchaseOrderTransition("pending_approval", "approved"), true);
  assert.equal(isAllowedPurchaseOrderTransition("pending_approval", "rejected"), true);
  assert.equal(isAllowedPurchaseOrderTransition("pending_approval", "cancelled"), true);
  assert.equal(isAllowedPurchaseOrderTransition("approved", "issued"), true);
  assert.equal(isAllowedPurchaseOrderTransition("approved", "cancelled"), true);
  assert.equal(isAllowedPurchaseOrderTransition("draft", "approved"), false);
  assert.equal(isAllowedPurchaseOrderTransition("draft", "issued"), false);
  assert.equal(isAllowedPurchaseOrderTransition("pending_approval", "issued"), false);
  assert.equal(isAllowedPurchaseOrderTransition("approved", "rejected"), false);
  assert.equal(isAllowedPurchaseOrderTransition("issued", "approved"), false);
  assert.equal(isAllowedPurchaseOrderTransition("rejected", "draft"), false);
  assert.equal(isAllowedPurchaseOrderTransition("cancelled", "approved"), false);
  assert.equal(isAllowedPurchaseOrderTransition("issued", "partially_fulfilled"), true);
  assert.equal(isAllowedPurchaseOrderTransition("issued", "completed"), true);
  assert.equal(isAllowedPurchaseOrderTransition("partially_fulfilled", "completed"), true);
});

test("purchase order progress calculations derive fulfillment and billing state", () => {
  const progress = summarizePurchaseOrderProgress({
    status: "issued",
    grandTotal: 100,
    items: [
      { id: "a", description: "Item A", quantity: 10, fulfilledQty: 4, billedQty: 0, rate: 10, gstRate: 0 },
      { id: "b", description: "Item B", quantity: 2, fulfilledQty: 2, billedQty: 1, rate: 20, gstRate: 5 },
    ],
  });
  assert.equal(progress.status, "partially_fulfilled");
  assert.equal(progress.fulfilledQty, 6);
  assert.equal(progress.billedQty, 1);
  assert.equal(progress.remainingQty, 6);
  assert.equal(progress.fulfilledAmount, 82);
  assert.equal(progress.billedAmount, 21);
  assert.equal(progress.remainingValue, 18);
  assert.equal(progress.unbilledAmount, 61);
});

test("purchase order payment summaries derive paid and outstanding values from vendor payments", () => {
  const purchaseOrder = {
    id: "po1",
    projectId: "PRJ001",
    projectFirestoreId: "project-1",
    status: "issued",
    grandTotal: 100000,
    items: [
      { id: "po-item-1", quantity: 10, fulfilledQty: 8, billedQty: 6, rate: 10000, gstRate: 0 },
    ],
  };
  const bills = [
    { id: "bill-a", grandTotal: 30000, purchaseOrderId: "po1" },
    { id: "bill-b", grandTotal: 30000, purchaseOrderId: "po1" },
  ];
  const vendorPayments = [
    { id: "pay-1", status: "paid", amount: 20000, purchaseOrderId: "po1", purchaseOrderBillId: "bill-a" },
    { id: "pay-2", status: "completed", amount: 30000, purchaseOrderId: "po1", purchaseOrderBillId: "bill-b" },
    { id: "pay-3", status: "pending", amount: 10000, purchaseOrderId: "po1", purchaseOrderBillId: "bill-b" },
  ];

  const billSummary = summarizePurchaseOrderBillPayment(bills[0], vendorPayments);
  const poSummary = summarizePurchaseOrderPaymentSummary(purchaseOrder, vendorPayments, bills);
  const projectSummary = summarizeProjectPurchaseOrderFinancials({
    project: { id: "project-1", projectId: "PRJ001" },
    purchaseOrders: [purchaseOrder],
    vendorPayments,
  });

  assert.equal(billSummary.paidAmount, 20000);
  assert.equal(billSummary.outstandingAmount, 10000);
  assert.equal(billSummary.paymentStatus, "partially_paid");
  assert.equal(poSummary.paidAmount, 50000);
  assert.equal(poSummary.outstandingAmount, 10000);
  assert.equal(projectSummary.summary.committedValue, 100000);
  assert.equal(projectSummary.summary.fulfilledValue, 80000);
  assert.equal(projectSummary.summary.billedValue, 60000);
  assert.equal(projectSummary.summary.paidValue, 50000);
  assert.equal(projectSummary.summary.outstandingValue, 10000);
  assert.equal(projectSummary.summary.remainingCommitment, 20000);
});

test("purchase order payment summaries ignore cached paidAmount fields and use vendor payment ledger only", () => {
  const purchaseOrder = {
    id: "po1",
    projectId: "PRJ001",
    projectFirestoreId: "project-1",
    status: "issued",
    grandTotal: 100000,
    paidAmount: 99999,
    billedAmount: 50000,
    items: [
      { id: "po-item-1", quantity: 10, fulfilledQty: 8, billedQty: 6, rate: 10000, gstRate: 0 },
    ],
  };
  const bill = {
    id: "bill-a",
    grandTotal: 30000,
    paidAmount: 30000,
    purchaseOrderId: "po1",
  };

  const billSummary = summarizePurchaseOrderBillPayment(bill, []);
  const poSummary = summarizePurchaseOrderPaymentSummary(purchaseOrder, [], [bill]);

  assert.equal(billSummary.paidAmount, 0);
  assert.equal(billSummary.outstandingAmount, 30000);
  assert.equal(poSummary.paidAmount, 0);
  assert.equal(poSummary.outstandingAmount, 60000);
});

test("fulfillment and billing validators prevent overruns and invalid entries", () => {
  const purchaseOrder = {
    status: "issued",
    items: [
      { id: "a", quantity: 10, fulfilledQty: 4, billedQty: 2, rate: 10, gstRate: 0 },
    ],
  };
  assert.throws(() => validatePurchaseOrderFulfillmentItems(purchaseOrder, []), /PURCHASE_ORDER_FULFILLMENT_ITEMS_REQUIRED/);
  assert.throws(() => validatePurchaseOrderFulfillmentItems(purchaseOrder, [{ poItemId: "a", quantity: 0 }]), /PURCHASE_ORDER_FULFILLMENT_QUANTITY_INVALID/);
  assert.throws(() => validatePurchaseOrderFulfillmentItems(purchaseOrder, [{ poItemId: "a", quantity: 7 }]), /PURCHASE_ORDER_FULFILLMENT_OVERFLOW/);
  assert.throws(() => validatePurchaseOrderBillItems(purchaseOrder, []), /PURCHASE_ORDER_BILL_ITEMS_REQUIRED/);
  assert.throws(() => validatePurchaseOrderBillItems(purchaseOrder, [{ poItemId: "a", quantity: 0 }]), /PURCHASE_ORDER_BILL_QUANTITY_INVALID/);
  assert.throws(() => validatePurchaseOrderBillItems(purchaseOrder, [{ poItemId: "a", quantity: 5 }]), /PURCHASE_ORDER_BILL_OVERFLOW/);
});

test("permission catalog and sidebar expose purchase order permissions and route", () => {
  assert.match(permissionCatalog, /purchase_order/);
  assert.match(permissionCatalog, /purchase_order\.issue/);
  assert.match(permissionCatalog, /purchase_order\.cancel/);
  assert.match(permissionCatalog, /purchase_order\.fulfill/);
  assert.match(permissionCatalog, /purchase_order\.bill/);
  assert.match(permissionCatalog, /\["\/manager\/purchase-orders\/new", "purchase_order\.create"\]/);
  assert.match(permissionCatalog, /\["\/manager\/purchase-orders", "purchase_order\.view"\]/);
  assert.match(sidebar, /Purchase Orders/);
  assert.match(sidebar, /\/manager\/purchase-orders\/new/);
  assert.match(authorizationService, /\/manager\/purchase-orders/);
});

test("purchase order APIs are company-authorized and sequence controlled", () => {
  assert.match(listApi, /authorizeCompanyRequest\(request\)/);
  assert.match(listApi, /requireCompanyPermission\(context, "purchase_order\.view"\)/);
  assert.match(listApi, /purchaseOrderSequenceRef/);
  assert.match(listApi, /runTransaction/);
  assert.match(listApi, /formatPurchaseOrderNumber/);
  assert.match(listApi, /purchaseOrderSettingsRef/);
  assert.match(listApi, /poPrefix: "PO"/);
  assert.match(listApi, /loadCompanyVendorPayments/);
  assert.match(listApi, /paidAmount: paymentSummary\.paidAmount/);
  assert.match(initApi, /requireCompanyPermission\(context, "purchase_order\.create"\)/);
  assert.match(initApi, /loadPurchaseOrderSequence/);
  assert.match(detailApi, /requireCompanyPermission\(context, "purchase_order\.view"\)/);
  assert.match(detailApi, /requireCompanyPermission\(context, "purchase_order\.edit"\)/);
  assert.match(detailApi, /loadCompanyVendorPayments/);
  assert.match(detailApi, /paymentSummary/);
  assert.match(fulfillApi, /requireCompanyPermission\(context, "purchase_order\.fulfill"\)/);
  assert.match(billApi, /requireCompanyPermission\(context, "purchase_order\.bill"\)/);
  assert.match(cancelApi, /PURCHASE_ORDER_CANCEL_NOT_ALLOWED_AFTER_PROGRESS/);
  assert.match(sharedApi, /resolvePurchaseOrderReferences/);
  assert.match(sharedApi, /validatePurchaseOrderItems/);
  assert.match(sharedApi, /validatePurchaseOrderFulfillmentItems/);
  assert.match(sharedApi, /validatePurchaseOrderBillItems/);
  assert.match(sharedApi, /summarizePurchaseOrderPaymentSummaryFromLedger/);
  assert.match(sharedApi, /summarizeProjectPurchaseOrderFinancialsFromLedger/);
  assert.match(actionsApi, /transitionPurchaseOrder/);
  assert.match(projectDashboardService, /PurchaseOrderService\.getList\(firebaseUser\)/);
  assert.match(projectAnalyticsService, /purchaseOrder: purchaseOrders\.summary/);
  assert.match(projectIntelligenceHook, /ProjectDashboardService\.load\(companyId, projectId, force, firebaseUser\)/);
  assert.match(projectIntelligenceHook, /ProjectDashboardService\.subscribe\(companyId, projectId, firebaseUser/);
  assert.match(projectDetailsPage, /useProjectIntelligence\(company\?\.id, id, firebaseUser\)/);
});

test("purchase order pages use the dedicated service and do not read Firestore directly", () => {
  assert.match(listPage, /PurchaseOrderService\.getList/);
  assert.match(formPage, /PurchaseOrderService\.getInit/);
  assert.match(formPage, /PurchaseOrderService\.create/);
  assert.match(formPage, /PurchaseOrderService\.update/);
  assert.match(formPage, /PurchaseOrderService\.submit/);
  assert.match(docComponent, /Purchase Order/);
  assert.doesNotMatch(formPage, /getDocs\(/);
  assert.doesNotMatch(formPage, /getDoc\(/);
  assert.doesNotMatch(formPage, /setDoc\(/);
  assert.doesNotMatch(formPage, /updateDoc\(/);
});

test("purchase order detail print uses the dedicated print-root flow and fresh fetches", () => {
  assert.match(detailPage, /PurchaseOrderExportService\.printDocument/);
  assert.match(detailPage, /ref=\{documentRef\}/);
  assert.match(detailPage, /PurchaseOrderService\.approve\(user, purchaseOrderId\)/);
  assert.match(detailPage, /PurchaseOrderService\.reject\(user, purchaseOrderId\)/);
  assert.match(detailPage, /PurchaseOrderService\.issue\(user, purchaseOrderId\)/);
  assert.match(detailPage, /PurchaseOrderService\.cancel\(user, purchaseOrderId\)/);
  assert.match(purchaseOrderService, /cache: "no-store"/);
  assert.match(docComponent, /purchase-order-document/);
  assert.match(docComponent, /purchase-order-print-root/);
  assert.match(docComponent, /purchase-order-pdf-print/);
  assert.match(exportService, /purchase-order-print-root/);
  assert.match(exportService, /window\.print\(\)/);
});

test("purchase order list uses bound service invocations for transitions", () => {
  assert.match(listPage, /PurchaseOrderService\.approve\(user, purchaseOrderId\)/);
  assert.match(listPage, /PurchaseOrderService\.reject\(user, purchaseOrderId\)/);
  assert.match(listPage, /PurchaseOrderService\.issue\(user, purchaseOrderId\)/);
  assert.match(listPage, /PurchaseOrderService\.cancel\(user, purchaseOrderId\)/);
  assert.match(listPage, /PurchaseOrderService\.submit\(user, purchaseOrderId\)/);
});
