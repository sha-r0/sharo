import {
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  summarizePurchaseOrderProgress,
} from "./purchase-orders.js";

const roundMoney = (value) => {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
};

const lower = (value) => String(value || "").trim().toLowerCase();

const completedVendorPaymentStatuses = new Set(["paid", "completed", "approved"]);
const committedPurchaseOrderStatuses = new Set(["approved", "issued", "partially_fulfilled", "completed"]);

const paymentMatchesPurchaseOrder = (payment = {}, purchaseOrder = {}) => {
  const purchaseOrderIds = new Set(
    [
      purchaseOrder?.id,
      purchaseOrder?.firestoreId,
      purchaseOrder?.purchaseOrderId,
      purchaseOrder?.purchaseOrderFirestoreId,
    ]
      .filter(Boolean)
      .map((value) => normalizePurchaseOrderText(value)),
  );

  if (!purchaseOrderIds.size) return false;

  return [
    payment?.purchaseOrderId,
    payment?.purchaseOrderFirestoreId,
    payment?.purchaseOrder?.id,
    payment?.purchaseOrder?.firestoreId,
  ]
    .filter(Boolean)
    .map((value) => normalizePurchaseOrderText(value))
    .some((value) => purchaseOrderIds.has(value));
};

const paymentMatchesBill = (payment = {}, bill = {}) => {
  const billIds = new Set(
    [bill?.id, bill?.billId, bill?.purchaseOrderBillId]
      .filter(Boolean)
      .map((value) => normalizePurchaseOrderText(value)),
  );

  if (!billIds.size) return false;

  return [
    payment?.purchaseOrderBillId,
    payment?.purchaseOrderBill?.id,
    payment?.billId,
  ]
    .filter(Boolean)
    .map((value) => normalizePurchaseOrderText(value))
    .some((value) => billIds.has(value));
};

export function isCompletedVendorPayment(payment = {}) {
  const status = lower(payment?.status);
  return completedVendorPaymentStatuses.has(status);
}

export function summarizePurchaseOrderBillPayment(bill = {}, vendorPayments = []) {
  const billTotal = roundMoney(Number(bill?.grandTotal || bill?.billTotal || 0));
  const linkedPayments = (Array.isArray(vendorPayments) ? vendorPayments : []).filter((payment) =>
    isCompletedVendorPayment(payment) && paymentMatchesBill(payment, bill)
  );
  const paidAmount = roundMoney(linkedPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0));
  const outstandingAmount = roundMoney(Math.max(0, billTotal - paidAmount));

  return {
    ...bill,
    billTotal,
    paidAmount,
    outstandingAmount,
    paymentStatus:
      outstandingAmount <= 0 && billTotal > 0
        ? "paid"
        : paidAmount > 0
          ? "partially_paid"
          : "unpaid",
    paymentCount: linkedPayments.length,
  };
}

export function summarizePurchaseOrderPaymentSummary(purchaseOrder = {}, vendorPayments = [], bills = []) {
  const progress = summarizePurchaseOrderProgress(purchaseOrder);
  const paymentList = (Array.isArray(vendorPayments) ? vendorPayments : []).filter(
    (payment) => isCompletedVendorPayment(payment) && paymentMatchesPurchaseOrder(payment, purchaseOrder)
  );
  const billSummaries = (Array.isArray(bills) ? bills : []).map((bill) =>
    summarizePurchaseOrderBillPayment(bill, vendorPayments)
  );
  const paidAmount = paymentList.length
    ? roundMoney(paymentList.reduce((sum, payment) => sum + Number(payment.amount || 0), 0))
    : roundMoney(billSummaries.reduce((sum, bill) => sum + Number(bill.paidAmount || 0), 0));
  const billOutstandingAmount = roundMoney(
    Math.max(0, Number(progress.billedAmount || 0) - paidAmount)
  );

  return {
    ...progress,
    paidAmount,
    outstandingAmount: billOutstandingAmount,
    billOutstandingAmount,
    paymentCount: paymentList.length || billSummaries.reduce((sum, bill) => sum + Number(bill.paymentCount || 0), 0),
    bills: billSummaries,
  };
}

export function summarizeProjectPurchaseOrderFinancials({ project = {}, purchaseOrders = [], vendorPayments = [] } = {}) {
  const projectIds = new Set(
    [project?.id, project?.projectId]
      .filter(Boolean)
      .map((value) => normalizePurchaseOrderText(value))
  );

  const orders = (Array.isArray(purchaseOrders) ? purchaseOrders : [])
    .filter((order) =>
      [
        order?.projectFirestoreId,
        order?.projectId,
        order?.project?.id,
        order?.project?.projectId,
      ]
        .filter(Boolean)
        .map((value) => normalizePurchaseOrderText(value))
        .some((value) => projectIds.has(value))
    )
    .map((order) => {
      const progress = summarizePurchaseOrderProgress(order);
      const paymentSummary = summarizePurchaseOrderPaymentSummary(order, vendorPayments);
      const committedValue = committedPurchaseOrderStatuses.has(normalizePurchaseOrderStatus(order?.status))
        ? roundMoney(Number(order?.grandTotal || progress.orderedAmount || 0))
        : 0;

      return {
        ...progress,
        committedValue,
        paidAmount: paymentSummary.paidAmount,
        outstandingAmount: paymentSummary.outstandingAmount,
        billOutstandingAmount: paymentSummary.billOutstandingAmount,
        paymentCount: paymentSummary.paymentCount,
      };
    });

  const committedValue = roundMoney(orders.reduce((sum, order) => sum + Number(order.committedValue || 0), 0));
  const fulfilledValue = roundMoney(orders.reduce((sum, order) => sum + Number(order.fulfilledAmount || 0), 0));
  const billedValue = roundMoney(orders.reduce((sum, order) => sum + Number(order.billedAmount || 0), 0));
  const paidValue = roundMoney(orders.reduce((sum, order) => sum + Number(order.paidAmount || 0), 0));
  const outstandingValue = roundMoney(Math.max(0, billedValue - paidValue));
  const remainingCommitment = roundMoney(Math.max(0, committedValue - fulfilledValue));

  return {
    summary: {
      committedValue,
      fulfilledValue,
      billedValue,
      paidValue,
      outstandingValue,
      remainingCommitment,
      purchaseOrderCount: orders.length,
      committedCount: orders.filter((order) => Number(order.committedValue || 0) > 0).length,
    },
    orders,
  };
}
