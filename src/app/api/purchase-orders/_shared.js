import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  summarizePurchaseOrderBillPayment,
  summarizePurchaseOrderPaymentSummary,
  summarizeProjectPurchaseOrderFinancials,
} from "@/lib/purchase-order-financials";
import {
  buildPurchaseOrderAuditEntry,
  calculatePurchaseOrderTotals,
  calculatePurchaseOrderLineTotals,
  formatPurchaseOrderNumber,
  getPurchaseOrderFinancialYearKey,
  isAllowedPurchaseOrderTransition,
  canEditPurchaseOrderStatus,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderDate,
  normalizePurchaseOrderQuantity,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  summarizePurchaseOrderProgress,
  purchaseOrderStatusFromAction,
  validatePurchaseOrderBillItems,
  validatePurchaseOrderFulfillmentItems,
  validatePurchaseOrderItems,
} from "@/lib/purchase-orders";

export {
  buildPurchaseOrderAuditEntry,
  calculatePurchaseOrderTotals,
  calculatePurchaseOrderLineTotals,
  formatPurchaseOrderNumber,
  getPurchaseOrderFinancialYearKey,
  canEditPurchaseOrderStatus,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderDate,
  normalizePurchaseOrderQuantity,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  summarizePurchaseOrderProgress,
  purchaseOrderStatusFromAction,
  validatePurchaseOrderBillItems,
  validatePurchaseOrderFulfillmentItems,
  validatePurchaseOrderItems,
  isAllowedPurchaseOrderTransition as canTransitionPurchaseOrderStatus,
};

export const purchaseOrdersRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("PurchaseOrders");

export const purchaseOrderRef = (companyId, purchaseOrderId) =>
  purchaseOrdersRef(companyId).doc(purchaseOrderId);

export const purchaseOrderSettingsRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("PurchaseOrderSettings").doc("default");

export const purchaseOrderSequenceRef = (companyId, financialYearKey) =>
  adminDb.collection("Companies").doc(companyId).collection("PurchaseOrderSequences").doc(financialYearKey);

export const purchaseOrderFulfillmentsRef = (companyId, purchaseOrderId) =>
  purchaseOrderRef(companyId, purchaseOrderId).collection("Fulfillments");

export const purchaseOrderBillsRef = (companyId, purchaseOrderId) =>
  purchaseOrderRef(companyId, purchaseOrderId).collection("Bills");

export const companyVendorPaymentsRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("VendorPayments");

export const purchaseOrderBillIndexRef = (companyId, vendorKey, billNumber) =>
  adminDb.collection("Companies").doc(companyId).collection("PurchaseOrderBillIndex").doc(
    `${encodeURIComponent(normalizePurchaseOrderText(vendorKey))}__${encodeURIComponent(normalizePurchaseOrderText(billNumber).toLowerCase())}`
  );

export const projectCollectionRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("Projectmanagement");

export const vendorCollectionRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("Vendors");

export const companyRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId);

const asPlainObject = (value) => (value && typeof value === "object" ? value : {});

const normalizeProjectSnapshot = (project) => ({
  projectId: normalizePurchaseOrderText(project?.projectId),
  projectFirestoreId: normalizePurchaseOrderText(project?.id),
  projectNumberSnapshot: normalizePurchaseOrderText(project?.projectId || project?.projectNumber || project?.projectCode || project?.projectNo),
  projectNameSnapshot: normalizePurchaseOrderText(project?.projectName || project?.name),
});

const normalizeVendorSnapshot = (vendor) => ({
  vendorId: normalizePurchaseOrderText(vendor?.vendorId || vendor?.id),
  vendorFirestoreId: normalizePurchaseOrderText(vendor?.id),
  vendorCodeSnapshot: normalizePurchaseOrderText(vendor?.vendorId || vendor?.vendorCode || vendor?.code),
  vendorNameSnapshot: normalizePurchaseOrderText(vendor?.vendorName || vendor?.companyName || vendor?.name),
  vendorContactSnapshot: normalizePurchaseOrderText(vendor?.contactPerson || vendor?.phone || vendor?.email),
});

export async function loadProjectByReferences(companyId, input = {}) {
  const firestoreId = normalizePurchaseOrderText(input.projectFirestoreId || input.projectId);
  const projectCode = normalizePurchaseOrderText(input.projectId);
  if (firestoreId) {
    const direct = await projectCollectionRef(companyId).doc(firestoreId).get();
    if (direct.exists) return { id: direct.id, ...direct.data() };
  }
  if (projectCode) {
    const matched = await projectCollectionRef(companyId).where("projectId", "==", projectCode).limit(1).get();
    if (!matched.empty) return { id: matched.docs[0].id, ...matched.docs[0].data() };
  }
  return null;
}

export async function loadVendorByReferences(companyId, input = {}) {
  const firestoreId = normalizePurchaseOrderText(input.vendorFirestoreId || input.vendorId);
  const vendorCode = normalizePurchaseOrderText(input.vendorId);
  if (firestoreId) {
    const direct = await vendorCollectionRef(companyId).doc(firestoreId).get();
    if (direct.exists) return { id: direct.id, ...direct.data() };
  }
  if (vendorCode) {
    const matched = await vendorCollectionRef(companyId).where("vendorId", "==", vendorCode).limit(1).get();
    if (!matched.empty) return { id: matched.docs[0].id, ...matched.docs[0].data() };
  }
  return null;
}

export async function loadCompanyPurchaseOrderAssets(companyId, purchaseOrderId = "") {
  const [companySnapshot, settingsSnapshot, purchaseOrderSnapshot, projectsSnapshot, vendorsSnapshot] = await Promise.all([
    companyRef(companyId).get(),
    purchaseOrderSettingsRef(companyId).get(),
    purchaseOrderId ? purchaseOrderRef(companyId, purchaseOrderId).get() : Promise.resolve(null),
    projectCollectionRef(companyId).get(),
    vendorCollectionRef(companyId).get(),
  ]);

  const company = companySnapshot.exists ? { id: companySnapshot.id, ...companySnapshot.data() } : null;
  const settings = settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null;
  const purchaseOrder = purchaseOrderSnapshot?.exists ? { id: purchaseOrderSnapshot.id, ...purchaseOrderSnapshot.data() } : null;
  const projects = projectsSnapshot.docs
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .sort((left, right) => String(left.projectName || left.projectId || "").localeCompare(String(right.projectName || right.projectId || ""), "en", { sensitivity: "base" }));
  const vendors = vendorsSnapshot.docs
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
    .sort((left, right) => String(left.vendorName || left.companyName || left.name || left.vendorId || "").localeCompare(String(right.vendorName || right.companyName || right.name || right.vendorId || ""), "en", { sensitivity: "base" }));

  return { company, settings, purchaseOrder, projects, vendors };
}

export async function loadPurchaseOrderSequence(companyId, financialYearKey) {
  const snapshot = await purchaseOrderSequenceRef(companyId, financialYearKey).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function loadPurchaseOrderLedger(companyId, purchaseOrderId) {
  const [fulfillmentsSnapshot, billsSnapshot] = await Promise.all([
    purchaseOrderFulfillmentsRef(companyId, purchaseOrderId).orderBy("createdAt", "asc").get(),
    purchaseOrderBillsRef(companyId, purchaseOrderId).orderBy("createdAt", "asc").get(),
  ]);

  return {
    fulfillments: fulfillmentsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })),
    bills: billsSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })),
  };
}

export async function loadCompanyVendorPayments(companyId) {
  const snapshot = await companyVendorPaymentsRef(companyId).orderBy("createdAt", "asc").get();
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export function summarizePurchaseOrderPaymentSummaryFromLedger(purchaseOrder = {}, vendorPayments = [], bills = []) {
  return summarizePurchaseOrderPaymentSummary(purchaseOrder, vendorPayments, bills);
}

export function summarizeProjectPurchaseOrderFinancialsFromLedger(payload = {}) {
  return summarizeProjectPurchaseOrderFinancials(payload);
}

export { summarizePurchaseOrderBillPayment };

export function buildPurchaseOrderInitPayload({
  company,
  settings,
  purchaseOrder,
  projects,
  vendors,
  sequence = null,
  financialYearKey = getPurchaseOrderFinancialYearKey(),
}) {
  const prefix = normalizePurchaseOrderText(settings?.poPrefix || settings?.purchaseOrderPrefix || "PO") || "PO";
  const nextSequence = Number(sequence?.nextSequence || 1);

  return {
    company,
    settings,
    purchaseOrder,
    projects: projects.map((project) => ({
      ...project,
      ...normalizeProjectSnapshot(project),
    })),
    vendors: vendors.map((vendor) => ({
      ...vendor,
      ...normalizeVendorSnapshot(vendor),
    })),
    nextPurchaseOrderNumber: formatPurchaseOrderNumber({
      prefix,
      financialYearKey,
      sequence: nextSequence,
    }),
    financialYearKey,
  };
}

export function sanitizePurchaseOrderInput(input = {}) {
  const payload = asPlainObject(input);
  return {
    poDate: normalizePurchaseOrderText(payload.poDate),
    expectedDeliveryDate: normalizePurchaseOrderText(payload.expectedDeliveryDate),
    projectFirestoreId: normalizePurchaseOrderText(payload.projectFirestoreId),
    projectId: normalizePurchaseOrderText(payload.projectId),
    vendorFirestoreId: normalizePurchaseOrderText(payload.vendorFirestoreId),
    vendorId: normalizePurchaseOrderText(payload.vendorId),
    paymentTerms: normalizePurchaseOrderText(payload.paymentTerms),
    scope: normalizePurchaseOrderText(payload.scope),
    remarks: normalizePurchaseOrderText(payload.remarks),
    termsAndConditions: normalizePurchaseOrderText(payload.termsAndConditions),
    items: Array.isArray(payload.items) ? payload.items : [],
    status: normalizePurchaseOrderStatus(payload.status),
    preparedBy: asPlainObject(payload.preparedBy),
  };
}

export async function resolvePurchaseOrderReferences(companyId, input = {}) {
  const project = await loadProjectByReferences(companyId, input);
  const vendor = await loadVendorByReferences(companyId, input);

  return { project, vendor };
}

export function buildPreparedBy(actor = {}, company = {}) {
  return {
    uid: actor.uid || actor.id || "",
    name: actor.name || actor.displayName || company.ownerName || "System",
    role: actor.roleId || actor.role || (actor.accountType === "owner" ? "owner" : "employee"),
  };
}

export function buildPurchaseOrderPayload({
  companyId,
  company,
  settings,
  input,
  project,
  vendor,
  actor,
  status = "draft",
  poNumber,
  poSequence,
  financialYearKey,
  existing = null,
}) {
  validatePurchaseOrderItems(input.items);
  const totals = calculatePurchaseOrderTotals(input.items);
  const preparedBy = buildPreparedBy(actor, company);
  const existingAudit = Array.isArray(existing?.auditTrail) ? existing.auditTrail : [];
  const now = FieldValue.serverTimestamp();
  const createdAudit = buildPurchaseOrderAuditEntry(
    existing ? "updated" : "created",
    preparedBy,
    existing ? "PO draft updated." : "PO draft created."
  );
  const submittedAudit = !existing && normalizePurchaseOrderStatus(status) === "pending_approval"
    ? buildPurchaseOrderAuditEntry("submitted", preparedBy, "PO submitted for approval.")
    : null;
  const auditTrail = existing
    ? [...existingAudit, createdAudit]
    : submittedAudit
      ? [createdAudit, submittedAudit]
      : [createdAudit];

  return {
    id: existing?.id || null,
    companyId,
    poNumber,
    poSequence,
    financialYearKey,
    poPrefix: normalizePurchaseOrderText(settings?.poPrefix || settings?.purchaseOrderPrefix || "PO") || "PO",
    status: normalizePurchaseOrderStatus(status),
    projectId: project?.projectId || normalizePurchaseOrderText(input.projectId),
    projectFirestoreId: project?.id || normalizePurchaseOrderText(input.projectFirestoreId),
    projectNumberSnapshot: normalizePurchaseOrderText(project?.projectId || project?.projectNumber || project?.projectCode || ""),
    projectNameSnapshot: normalizePurchaseOrderText(project?.projectName || project?.name || ""),
    vendorId: vendor?.vendorId || normalizePurchaseOrderText(input.vendorId),
    vendorFirestoreId: vendor?.id || normalizePurchaseOrderText(input.vendorFirestoreId),
    vendorCodeSnapshot: normalizePurchaseOrderText(vendor?.vendorId || vendor?.vendorCode || vendor?.code || ""),
    vendorNameSnapshot: normalizePurchaseOrderText(vendor?.vendorName || vendor?.companyName || vendor?.name || ""),
    vendorContactSnapshot: normalizePurchaseOrderText(vendor?.contactPerson || vendor?.phone || vendor?.email || ""),
    items: totals.items,
    subtotal: totals.subtotal,
    gstTotal: totals.gstTotal,
    grandTotal: totals.grandTotal,
    fulfilledAmount: 0,
    billedAmount: 0,
    remainingValue: totals.grandTotal,
    unbilledAmount: 0,
    poDate: normalizePurchaseOrderText(input.poDate),
    expectedDeliveryDate: normalizePurchaseOrderText(input.expectedDeliveryDate),
    paymentTerms: normalizePurchaseOrderText(input.paymentTerms),
    scope: normalizePurchaseOrderText(input.scope),
    remarks: normalizePurchaseOrderText(input.remarks),
    termsAndConditions: normalizePurchaseOrderText(input.termsAndConditions),
    preparedBy,
    approvedBy: existing?.approvedBy || null,
    auditTrail,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

export function canTransitionPurchaseOrder(fromStatus, toStatus) {
  return isAllowedPurchaseOrderTransition(fromStatus, toStatus);
}

export function normalizePurchaseOrderAction(action) {
  return purchaseOrderStatusFromAction(action);
}
