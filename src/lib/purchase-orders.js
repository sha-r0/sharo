const roundMoney = (value) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
};

export const PURCHASE_ORDER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "issued",
  "partially_fulfilled",
  "completed",
  "rejected",
  "cancelled",
];

export const PURCHASE_ORDER_TERMINAL_STATUSES = new Set([
  "completed",
  "rejected",
  "cancelled",
]);

export const PURCHASE_ORDER_EDITABLE_STATUSES = new Set(["draft"]);

export const PURCHASE_ORDER_STATUS_TRANSITIONS = {
  draft: ["pending_approval"],
  pending_approval: ["approved", "rejected", "cancelled"],
  approved: ["issued", "cancelled"],
  issued: ["partially_fulfilled", "completed"],
  partially_fulfilled: ["completed"],
};

export function normalizePurchaseOrderStatus(value) {
  const status = String(value || "draft").trim().toLowerCase();
  return PURCHASE_ORDER_STATUSES.includes(status) ? status : "draft";
}

export function formatPurchaseOrderStatusLabel(value) {
  const status = normalizePurchaseOrderStatus(value);
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function purchaseOrderStatusTone(value) {
  const status = normalizePurchaseOrderStatus(value);
  switch (status) {
    case "pending_approval":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "approved":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "issued":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "partially_fulfilled":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-violet-50 text-violet-700 border-violet-200";
  }
}

export function canEditPurchaseOrderStatus(value) {
  return PURCHASE_ORDER_EDITABLE_STATUSES.has(normalizePurchaseOrderStatus(value));
}

export function canTransitionPurchaseOrderStatus(fromStatus, toStatus) {
  const from = normalizePurchaseOrderStatus(fromStatus);
  const to = normalizePurchaseOrderStatus(toStatus);
  return Boolean(PURCHASE_ORDER_STATUS_TRANSITIONS[from]?.includes(to));
}

export function getPurchaseOrderFinancialYearKey(dateInput = new Date()) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const current = Number.isNaN(date.getTime()) ? new Date() : date;
  const startYear = current.getMonth() >= 3 ? current.getFullYear() : current.getFullYear() - 1;
  return `${startYear}-${String(startYear + 1).slice(-2)}`;
}

export function getPurchaseOrderFinancialYearDisplay(financialYearKey) {
  const value = String(financialYearKey || "").trim();
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (match) return `${String(match[1]).slice(-2)}-${match[2]}`;
  return value;
}

export function formatPurchaseOrderNumber({
  prefix = "PO",
  financialYearKey,
  sequence,
} = {}) {
  const fiscalKey = String(financialYearKey || getPurchaseOrderFinancialYearKey()).trim();
  const sequenceNumber = Math.max(1, Number(sequence || 1));
  const displayYear = getPurchaseOrderFinancialYearDisplay(fiscalKey);
  return `${String(prefix || "PO").trim().toUpperCase()}-${displayYear}-${String(sequenceNumber).padStart(3, "0")}`;
}

export function normalizePurchaseOrderText(value) {
  return String(value ?? "").trim();
}

export function normalizePurchaseOrderQuantity(value, fallback = 0) {
  const number = Number(value ?? fallback);
  if (!Number.isFinite(number)) return Math.max(0, Number(fallback) || 0);
  return Math.max(0, Math.round((number + Number.EPSILON) * 100) / 100);
}

export function calculatePurchaseOrderLineTotals(quantity = 0, rate = 0, gstRate = 0) {
  const safeQuantity = normalizePurchaseOrderQuantity(quantity);
  const safeRate = Number.isFinite(Number(rate)) ? Math.max(0, Number(rate)) : 0;
  const safeGstRate = Number.isFinite(Number(gstRate)) ? Math.min(100, Math.max(0, Number(gstRate))) : 0;
  const taxableAmount = roundMoney(safeQuantity * safeRate);
  const gstAmount = roundMoney((taxableAmount * safeGstRate) / 100);
  const amount = roundMoney(taxableAmount + gstAmount);
  return {
    taxableAmount,
    gstAmount,
    amount,
  };
}

export function isValidPurchaseOrderDate(value) {
  const text = normalizePurchaseOrderText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export function normalizePurchaseOrderDate(value, fallback = "") {
  const text = normalizePurchaseOrderText(value);
  return isValidPurchaseOrderDate(text) ? text : fallback;
}

export function normalizePurchaseOrderNumber(value) {
  return String(value ?? "").trim().toUpperCase();
}

export function normalizePurchaseOrderItems(items = [], { preserveProgress = false } = {}) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const quantity = normalizePurchaseOrderQuantity(item?.quantity ?? item?.qty ?? 0);
    const rate = Number.isFinite(Number(item?.rate ?? item?.unitPrice ?? 0)) ? Math.max(0, Number(item?.rate ?? item?.unitPrice ?? 0)) : 0;
    const gstRate = Number.isFinite(Number(item?.gstRate ?? item?.gst ?? 0)) ? Math.max(0, Number(item?.gstRate ?? item?.gst ?? 0)) : 0;
    const { taxableAmount, gstAmount, amount } = calculatePurchaseOrderLineTotals(quantity, rate, gstRate);

    return {
      id: item?.id || crypto.randomUUID(),
      lineNo: Number(item?.lineNo || index + 1),
      description: normalizePurchaseOrderText(item?.description),
      hsnSac: normalizePurchaseOrderText(item?.hsnSac || item?.hsn || ""),
      quantity,
      unit: normalizePurchaseOrderText(item?.unit || "Nos") || "Nos",
      rate,
      taxableAmount,
      gstRate,
      gstAmount,
      amount,
      notes: normalizePurchaseOrderText(item?.notes),
      fulfilledQty: preserveProgress ? normalizePurchaseOrderQuantity(item?.fulfilledQty ?? 0) : 0,
      billedQty: preserveProgress ? normalizePurchaseOrderQuantity(item?.billedQty ?? 0) : 0,
    };
  });
}

export function calculatePurchaseOrderTotals(items = []) {
  const normalizedItems = normalizePurchaseOrderItems(items);
  const subtotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0)
  );
  const gstTotal = roundMoney(
    normalizedItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0)
  );
  const grandTotal = roundMoney(subtotal + gstTotal);

  return {
    items: normalizedItems,
    subtotal,
    gstTotal,
    grandTotal,
  };
}

export function summarizePurchaseOrderProgress(purchaseOrder = {}) {
  const rawStatus = normalizePurchaseOrderStatus(purchaseOrder?.status);
  const normalizedItems = normalizePurchaseOrderItems(purchaseOrder?.items, { preserveProgress: true }).map((item) => {
    const orderedQty = normalizePurchaseOrderQuantity(item.quantity);
    const fulfilledQty = Math.min(orderedQty, normalizePurchaseOrderQuantity(item.fulfilledQty));
    const billedQty = Math.min(fulfilledQty, normalizePurchaseOrderQuantity(item.billedQty));
    const orderedTotals = calculatePurchaseOrderLineTotals(orderedQty, item.rate, item.gstRate);
    const fulfilledTotals = calculatePurchaseOrderLineTotals(fulfilledQty, item.rate, item.gstRate);
    const billedTotals = calculatePurchaseOrderLineTotals(billedQty, item.rate, item.gstRate);

    return {
      ...item,
      quantity: orderedQty,
      fulfilledQty,
      billedQty,
      remainingQty: roundMoney(Math.max(0, orderedQty - fulfilledQty)),
      billableQty: roundMoney(Math.max(0, fulfilledQty - billedQty)),
      orderedAmount: orderedTotals.amount,
      fulfilledAmount: fulfilledTotals.amount,
      billedAmount: billedTotals.amount,
      remainingValue: roundMoney(Math.max(0, orderedTotals.amount - fulfilledTotals.amount)),
      unbilledAmount: roundMoney(Math.max(0, fulfilledTotals.amount - billedTotals.amount)),
    };
  });

  const orderedAmount = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.orderedAmount || 0), 0));
  const fulfilledAmount = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.fulfilledAmount || 0), 0));
  const billedAmount = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.billedAmount || 0), 0));
  const remainingValue = roundMoney(Math.max(0, Number(purchaseOrder?.grandTotal || orderedAmount) - fulfilledAmount));
  const unbilledAmount = roundMoney(Math.max(0, fulfilledAmount - billedAmount));
  const fulfilledQty = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.fulfilledQty || 0), 0));
  const billedQty = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.billedQty || 0), 0));
  const orderedQty = roundMoney(normalizedItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
  const remainingQty = roundMoney(Math.max(0, orderedQty - fulfilledQty));
  const hasFulfillment = normalizedItems.some((item) => Number(item.fulfilledQty || 0) > 0);
  const isFullyFulfilled =
    normalizedItems.length > 0 &&
    normalizedItems.every((item) => Number(item.fulfilledQty || 0) >= Number(item.quantity || 0));

  let derivedStatus = rawStatus;
  if (rawStatus === "rejected" || rawStatus === "cancelled" || rawStatus === "completed") {
    derivedStatus = rawStatus;
  } else if (isFullyFulfilled) {
    derivedStatus = "completed";
  } else if (hasFulfillment) {
    derivedStatus = "partially_fulfilled";
  } else if (rawStatus === "issued" || rawStatus === "partially_fulfilled") {
    derivedStatus = "issued";
  }

  return {
    items: normalizedItems,
    orderedQty,
    fulfilledQty,
    billedQty,
    remainingQty,
    orderedAmount,
    fulfilledAmount,
    billedAmount,
    remainingValue,
    unbilledAmount,
    status: derivedStatus,
    hasFulfillment,
    isFullyFulfilled,
  };
}

export function validatePurchaseOrderFulfillmentItems(purchaseOrder = {}, items = []) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("PURCHASE_ORDER_FULFILLMENT_ITEMS_REQUIRED");
  }

  const progress = summarizePurchaseOrderProgress(purchaseOrder);
  const lookup = new Map(progress.items.map((item) => [item.id, item]));
  const grouped = new Map();

  items.forEach((item, index) => {
    const poItemId = normalizePurchaseOrderText(item?.poItemId);
    const quantity = Number(item?.quantity ?? 0);
    if (!poItemId) throw new Error(`PURCHASE_ORDER_FULFILLMENT_ITEM_ID_REQUIRED_${index + 1}`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`PURCHASE_ORDER_FULFILLMENT_QUANTITY_INVALID_${index + 1}`);
    grouped.set(poItemId, roundMoney((grouped.get(poItemId) || 0) + quantity));
  });

  const validated = [...grouped.entries()].map(([poItemId, quantity]) => {
    const current = lookup.get(poItemId);
    if (!current) throw new Error(`PURCHASE_ORDER_FULFILLMENT_ITEM_NOT_FOUND_${poItemId}`);
    const remaining = roundMoney(Math.max(0, Number(current.quantity || 0) - Number(current.fulfilledQty || 0)));
    if (quantity > remaining + 0.0001) {
      throw new Error(`PURCHASE_ORDER_FULFILLMENT_OVERFLOW_${poItemId}`);
    }
    return { poItemId, quantity: roundMoney(quantity) };
  });

  return { progress, items: validated };
}

export function validatePurchaseOrderBillItems(purchaseOrder = {}, items = []) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("PURCHASE_ORDER_BILL_ITEMS_REQUIRED");
  }

  const progress = summarizePurchaseOrderProgress(purchaseOrder);
  const lookup = new Map(progress.items.map((item) => [item.id, item]));
  const grouped = new Map();

  items.forEach((item, index) => {
    const poItemId = normalizePurchaseOrderText(item?.poItemId);
    const quantity = Number(item?.quantity ?? 0);
    if (!poItemId) throw new Error(`PURCHASE_ORDER_BILL_ITEM_ID_REQUIRED_${index + 1}`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`PURCHASE_ORDER_BILL_QUANTITY_INVALID_${index + 1}`);
    grouped.set(poItemId, roundMoney((grouped.get(poItemId) || 0) + quantity));
  });

  const validated = [...grouped.entries()].map(([poItemId, quantity]) => {
    const current = lookup.get(poItemId);
    if (!current) throw new Error(`PURCHASE_ORDER_BILL_ITEM_NOT_FOUND_${poItemId}`);
    const available = roundMoney(Math.max(0, Number(current.fulfilledQty || 0) - Number(current.billedQty || 0)));
    if (quantity > available + 0.0001) {
      throw new Error(`PURCHASE_ORDER_BILL_OVERFLOW_${poItemId}`);
    }
    return { poItemId, quantity: roundMoney(quantity) };
  });

  return { progress, items: validated };
}

export function validatePurchaseOrderItems(items = []) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("PURCHASE_ORDER_ITEMS_REQUIRED");
  }

  items.forEach((item, index) => {
    const description = normalizePurchaseOrderText(item?.description);
    const quantity = Number(item?.quantity ?? item?.qty ?? 0);
    const rate = Number(item?.rate ?? item?.unitPrice ?? 0);
    const gstRate = Number(item?.gstRate ?? item?.gst ?? 0);

    if (!description) throw new Error(`PURCHASE_ORDER_ITEM_DESCRIPTION_REQUIRED_${index + 1}`);
    if (!Number.isFinite(quantity) || quantity <= 0) throw new Error(`PURCHASE_ORDER_ITEM_QUANTITY_INVALID_${index + 1}`);
    if (!Number.isFinite(rate) || rate < 0) throw new Error(`PURCHASE_ORDER_ITEM_RATE_INVALID_${index + 1}`);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) throw new Error(`PURCHASE_ORDER_ITEM_GST_INVALID_${index + 1}`);
  });
}

export function buildPurchaseOrderAuditEntry(action, actor = {}, notes = "") {
  return {
    action,
    byUid: actor.uid || actor.id || "",
    byName: actor.name || actor.displayName || "System",
    at: new Date().toISOString(),
    notes: normalizePurchaseOrderText(notes),
  };
}

export function isAllowedPurchaseOrderTransition(fromStatus, toStatus) {
  return canTransitionPurchaseOrderStatus(fromStatus, toStatus);
}

export function purchaseOrderStatusFromAction(action) {
  switch (String(action || "").trim().toLowerCase()) {
    case "submit":
      return "pending_approval";
    case "approve":
      return "approved";
    case "issue":
      return "issued";
    case "reject":
      return "rejected";
    case "cancel":
      return "cancelled";
    default:
      return null;
  }
}
