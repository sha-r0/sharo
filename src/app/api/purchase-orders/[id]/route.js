import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderPayload,
  canEditPurchaseOrderStatus,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderStatus,
  purchaseOrderRef,
  purchaseOrderSettingsRef,
  loadCompanyVendorPayments,
  loadPurchaseOrderLedger,
  summarizePurchaseOrderProgress,
  summarizePurchaseOrderPaymentSummaryFromLedger,
  resolvePurchaseOrderReferences,
  sanitizePurchaseOrderInput,
} from "../_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function GET(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.view");
    const { id } = await params;
    const snapshot = await purchaseOrderRef(context.companyId, id).get();
    if (!snapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
    const settingsSnapshot = await purchaseOrderSettingsRef(context.companyId).get();
    const purchaseOrder = { id: snapshot.id, ...snapshot.data() };
    const progress = summarizePurchaseOrderProgress(purchaseOrder);
    const ledger = await loadPurchaseOrderLedger(context.companyId, id);
    const vendorPayments = await loadCompanyVendorPayments(context.companyId);
    const paymentSummary = summarizePurchaseOrderPaymentSummaryFromLedger(purchaseOrder, vendorPayments, ledger.bills);
    return NextResponse.json({
      company: context.company || null,
      settings: settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null,
      purchaseOrder: {
        ...purchaseOrder,
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
        status: progress.status,
        paymentSummary,
      },
      fulfillments: ledger.fulfillments,
      bills: paymentSummary.bills,
    });
  } catch (error) {
    console.error("Purchase order read failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}

export async function PUT(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.edit");
    const { id } = await params;
    const rawInput = await request.json();
    const input = sanitizePurchaseOrderInput(rawInput);
    if (input.poDate && !isValidPurchaseOrderDate(input.poDate)) throw new Error("INVALID_PO_DATE");
    if (input.expectedDeliveryDate && !isValidPurchaseOrderDate(input.expectedDeliveryDate)) throw new Error("INVALID_EXPECTED_DELIVERY_DATE");
    const ref = purchaseOrderRef(context.companyId, id);
    const existingSnapshot = await ref.get();
    if (!existingSnapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
    const existing = { id: existingSnapshot.id, ...existingSnapshot.data() };
    if (!canEditPurchaseOrderStatus(existing.status)) throw new Error("PURCHASE_ORDER_NOT_EDITABLE");

    const { project, vendor } = await resolvePurchaseOrderReferences(context.companyId, input);
    if (!project) throw new Error("PROJECT_NOT_FOUND");
    if (!vendor) throw new Error("VENDOR_NOT_FOUND");
    const nextPoDate = input.poDate || existing.poDate || "";
    const nextExpectedDeliveryDate = input.expectedDeliveryDate || existing.expectedDeliveryDate || "";
    if (!nextPoDate || !isValidPurchaseOrderDate(nextPoDate)) throw new Error("INVALID_PO_DATE");
    if (nextExpectedDeliveryDate && !isValidPurchaseOrderDate(nextExpectedDeliveryDate)) throw new Error("INVALID_EXPECTED_DELIVERY_DATE");

    const settingsSnapshot = await purchaseOrderSettingsRef(context.companyId).get();
    const settings = settingsSnapshot.exists ? settingsSnapshot.data() : {};
    const payload = buildPurchaseOrderPayload({
      companyId: context.companyId,
      company: context.company,
      settings,
      project,
      vendor,
      actor: context.employee || { uid: context.token.uid, name: context.company?.ownerName || "", roleId: context.isOwner ? "owner" : "employee" },
      status: "draft",
      poNumber: existing.poNumber,
      poSequence: existing.poSequence,
      financialYearKey: existing.financialYearKey,
      existing,
      input: {
        ...input,
        poDate: nextPoDate,
        expectedDeliveryDate: nextExpectedDeliveryDate,
      },
    });

    await adminDb.runTransaction(async (transaction) => {
      transaction.set(ref, {
        ...payload,
        status: existing.status,
        approvedBy: existing.approvedBy || null,
        createdAt: existing.createdAt || FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    return NextResponse.json({
      success: true,
      purchaseOrder: {
        id: existing.id,
        ...payload,
        status: existing.status,
      },
    });
  } catch (error) {
    console.error("Purchase order update failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
