import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderPayload,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  loadCompanyVendorPayments,
  purchaseOrdersRef,
  purchaseOrderSequenceRef,
  purchaseOrderSettingsRef,
  resolvePurchaseOrderReferences,
  sanitizePurchaseOrderInput,
  getPurchaseOrderFinancialYearKey,
  formatPurchaseOrderNumber,
  summarizePurchaseOrderProgress,
  summarizePurchaseOrderPaymentSummaryFromLedger,
} from "./_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

const toRow = (snapshot) => ({ id: snapshot.id, ...snapshot.data() });

const matchSearch = (order, search) => {
  if (!search) return true;
  const haystack = [
    order.poNumber,
    order.projectNameSnapshot,
    order.projectNumberSnapshot,
    order.vendorNameSnapshot,
    order.vendorCodeSnapshot,
    order.scope,
    order.remarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
};

function summarizePurchaseOrders(orders) {
  return orders.reduce((summary, order) => {
    summary.total += 1;
    const status = normalizePurchaseOrderStatus(order.status);
    if (status === "draft") summary.draft += 1;
    if (status === "pending_approval") summary.pendingApproval += 1;
    if (status === "approved") summary.approved += 1;
    if (status === "issued") summary.issued += 1;
    if (status === "partially_fulfilled") summary.partiallyFulfilled += 1;
    if (status === "completed") summary.completed += 1;
    if (status === "rejected") summary.rejected += 1;
    if (status === "cancelled") summary.cancelled += 1;
    summary.grandTotal += Number(order.grandTotal || 0);
    return summary;
  }, {
    total: 0,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    issued: 0,
    partiallyFulfilled: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    grandTotal: 0,
  });
}

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.view");

    const companyId = context.companyId;
    const searchParams = new URL(request.url).searchParams;
    const rawStatusFilter = String(searchParams.get("status") || "all").trim().toLowerCase();
    const statusFilter = rawStatusFilter === "all" ? "all" : normalizePurchaseOrderStatus(rawStatusFilter);
    const search = normalizePurchaseOrderText(searchParams.get("search") || "");

    const snapshot = await purchaseOrdersRef(companyId).orderBy("createdAt", "desc").get();
    const vendorPayments = await loadCompanyVendorPayments(companyId);
    const orders = snapshot.docs.map((doc) => {
      const order = toRow(doc);
      const progress = summarizePurchaseOrderProgress(order);
      const paymentSummary = summarizePurchaseOrderPaymentSummaryFromLedger(order, vendorPayments);
      return {
        ...order,
        items: progress.items,
        fulfilledQty: progress.fulfilledQty,
        billedQty: progress.billedQty,
        remainingQty: progress.remainingQty,
        fulfilledAmount: progress.fulfilledAmount,
        billedAmount: progress.billedAmount,
        remainingValue: progress.remainingValue,
        unbilledAmount: progress.unbilledAmount,
        paidAmount: paymentSummary.paidAmount,
        outstandingAmount: paymentSummary.outstandingAmount,
        billOutstandingAmount: paymentSummary.billOutstandingAmount,
        paymentCount: paymentSummary.paymentCount,
        bills: paymentSummary.bills,
        progress,
        status: progress.status,
      };
    });
    const summary = summarizePurchaseOrders(orders);
    const filteredOrders = orders.filter((order) => {
      const status = normalizePurchaseOrderStatus(order.status);
      return (statusFilter === "all" || status === statusFilter)
        && matchSearch(order, search);
    });

    return NextResponse.json({
      company: context.company || null,
      summary,
      purchaseOrders: filteredOrders,
    });
  } catch (error) {
    console.error("Purchase order list failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.create");

    const rawInput = await request.json();
    const input = sanitizePurchaseOrderInput(rawInput);
    const status = normalizePurchaseOrderStatus(input.status);
    if (!["draft", "pending_approval"].includes(status)) {
      throw new Error("INVALID_INITIAL_STATUS");
    }
    if (!input.poDate) input.poDate = new Date().toISOString().slice(0, 10);
    if (!isValidPurchaseOrderDate(input.poDate)) throw new Error("INVALID_PO_DATE");
    if (input.expectedDeliveryDate && !isValidPurchaseOrderDate(input.expectedDeliveryDate)) throw new Error("INVALID_EXPECTED_DELIVERY_DATE");
    if (!input.projectFirestoreId && !input.projectId) throw new Error("PROJECT_REQUIRED");
    if (!input.vendorFirestoreId && !input.vendorId) throw new Error("VENDOR_REQUIRED");

    const { project, vendor } = await resolvePurchaseOrderReferences(context.companyId, input);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (!vendor) throw new Error("VENDOR_NOT_FOUND");

    const financialYearKey = getPurchaseOrderFinancialYearKey(input.poDate || new Date());
    const settingsRef = purchaseOrderSettingsRef(context.companyId);
    const settingsSnapshot = await purchaseOrderSettingsRef(context.companyId).get();
    const settings = settingsSnapshot.exists ? settingsSnapshot.data() : {};
    const poRef = purchaseOrdersRef(context.companyId).doc();
    const sequenceRef = purchaseOrderSequenceRef(context.companyId, financialYearKey);
    let createdPayload = null;

    await adminDb.runTransaction(async (transaction) => {
      const sequenceSnapshot = await transaction.get(sequenceRef);
      const sequence = Number(sequenceSnapshot.exists ? sequenceSnapshot.data()?.nextSequence || 1 : 1);
      const poNumber = formatPurchaseOrderNumber({
        prefix: normalizePurchaseOrderText(settings?.poPrefix || settings?.purchaseOrderPrefix || "PO") || "PO",
        financialYearKey,
        sequence,
      });

      createdPayload = buildPurchaseOrderPayload({
        companyId: context.companyId,
        company: context.company,
        settings,
        input,
        project,
        vendor,
        actor: context.employee || { uid: context.token.uid, name: context.company?.ownerName || "" , roleId: context.isOwner ? "owner" : "employee" },
        status,
        poNumber,
        poSequence: sequence,
        financialYearKey,
      });

      transaction.set(poRef, {
        ...createdPayload,
        id: poRef.id,
      });
      transaction.set(sequenceRef, {
        financialYearKey,
        nextSequence: sequence + 1,
        updatedAt: FieldValue.serverTimestamp(),
        ...(sequenceSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
      if (!settingsSnapshot.exists) {
        transaction.set(settingsRef, {
          poPrefix: "PO",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    return NextResponse.json({
      success: true,
      id: poRef.id,
      purchaseOrder: {
        id: poRef.id,
        ...createdPayload,
      },
    });
  } catch (error) {
    console.error("Purchase order create failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
