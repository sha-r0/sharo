import {
  PURCHASE_ORDER_EDITABLE_STATUSES,
  PURCHASE_ORDER_STATUS_TRANSITIONS,
  formatPurchaseOrderStatusLabel,
  normalizePurchaseOrderStatus,
  purchaseOrderStatusTone,
} from "@/lib/purchase-orders";

export const purchaseOrderStatuses = [
  "all",
  "draft",
  "pending_approval",
  "approved",
  "issued",
  "partially_fulfilled",
  "completed",
  "rejected",
  "cancelled",
];

export function canEditPurchaseOrder(status) {
  return PURCHASE_ORDER_EDITABLE_STATUSES.has(normalizePurchaseOrderStatus(status));
}

export function canSubmitPurchaseOrder(status) {
  return normalizePurchaseOrderStatus(status) === "draft";
}

export function canApprovePurchaseOrder(status) {
  return normalizePurchaseOrderStatus(status) === "pending_approval";
}

export function canIssuePurchaseOrder(status) {
  return normalizePurchaseOrderStatus(status) === "approved";
}

export function canFulfillPurchaseOrder(status) {
  return ["issued", "partially_fulfilled"].includes(normalizePurchaseOrderStatus(status));
}

export function canBillPurchaseOrder(status) {
  return ["issued", "partially_fulfilled", "completed"].includes(normalizePurchaseOrderStatus(status));
}

export function canCancelPurchaseOrder(status, purchaseOrder = null) {
  const normalized = normalizePurchaseOrderStatus(status);
  if (["pending_approval", "approved"].includes(normalized)) return true;
  if (normalized !== "issued") return false;
  const fulfilledAmount = Number(purchaseOrder?.fulfilledAmount || 0);
  const billedAmount = Number(purchaseOrder?.billedAmount || 0);
  const fulfilledQty = Number(purchaseOrder?.fulfilledQty || 0);
  const billedQty = Number(purchaseOrder?.billedQty || 0);
  return fulfilledAmount === 0 && billedAmount === 0 && fulfilledQty === 0 && billedQty === 0;
}

export function canRejectPurchaseOrder(status) {
  return normalizePurchaseOrderStatus(status) === "pending_approval";
}

export function isTerminalPurchaseOrderStatus(status) {
  return ["completed", "rejected", "cancelled"].includes(normalizePurchaseOrderStatus(status));
}

export function nextTransitionStatuses(status) {
  return PURCHASE_ORDER_STATUS_TRANSITIONS[normalizePurchaseOrderStatus(status)] || [];
}

export { formatPurchaseOrderStatusLabel, purchaseOrderStatusTone, normalizePurchaseOrderStatus };
