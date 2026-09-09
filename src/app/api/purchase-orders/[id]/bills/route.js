import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderAuditEntry,
  calculatePurchaseOrderLineTotals,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  purchaseOrderBillIndexRef,
  purchaseOrderBillsRef,
  purchaseOrderRef,
  summarizePurchaseOrderProgress,
  validatePurchaseOrderBillItems,
} from "../../_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function POST(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.bill");

    const { id } = await params;
    const ref = purchaseOrderRef(context.companyId, id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");

    const purchaseOrder = { id: snapshot.id, ...snapshot.data() };
    const currentStatus = normalizePurchaseOrderStatus(purchaseOrder.status);
    if (!["issued", "partially_fulfilled", "completed"].includes(currentStatus)) {
      throw new Error("PURCHASE_ORDER_BILL_NOT_ALLOWED");
    }

    const body = await request.json();
    const billNumber = normalizePurchaseOrderText(body?.billNumber);
    const billDate = normalizePurchaseOrderText(body?.billDate);
    const attachmentUrl = normalizePurchaseOrderText(body?.attachmentUrl);
    const remarks = normalizePurchaseOrderText(body?.remarks);
    const requestedItems = Array.isArray(body?.items) ? body.items : [];
    if (!billNumber) throw new Error("PURCHASE_ORDER_BILL_NUMBER_REQUIRED");
    if (!billDate || !isValidPurchaseOrderDate(billDate)) throw new Error("INVALID_BILL_DATE");

    const actor = {
      uid: context.employee?.uid || context.token.uid,
      name: context.employee?.name || context.employee?.displayName || context.company?.ownerName || "System",
      role: context.employee?.roleId || context.employee?.role || (context.isOwner ? "owner" : "employee"),
    };

    let responsePayload = null;

    await adminDb.runTransaction(async (transaction) => {
      const latest = await transaction.get(ref);
      if (!latest.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
      const latestPurchaseOrder = { id: latest.id, ...latest.data() };
      const latestStatus = normalizePurchaseOrderStatus(latestPurchaseOrder.status);
      if (!["issued", "partially_fulfilled", "completed"].includes(latestStatus)) {
        throw new Error("PURCHASE_ORDER_BILL_NOT_ALLOWED");
      }

      const latestProgress = summarizePurchaseOrderProgress(latestPurchaseOrder);
      const validatedLatest = validatePurchaseOrderBillItems(latestPurchaseOrder, requestedItems);
      const billMap = new Map(validatedLatest.items.map((item) => [item.poItemId, item.quantity]));
      const nextItems = latestProgress.items.map((item) => {
        const add = billMap.get(item.id) || 0;
        if (!add) return item;
        return {
          ...item,
          billedQty: Math.min(Number(item.fulfilledQty || 0), Number(item.billedQty || 0) + add),
        };
      });
      const nextProgress = summarizePurchaseOrderProgress({
        ...latestPurchaseOrder,
        items: nextItems,
      });

      const vendorKey = latestPurchaseOrder.vendorFirestoreId || latestPurchaseOrder.vendorId;
      const indexRef = purchaseOrderBillIndexRef(context.companyId, vendorKey, billNumber);
      const indexSnapshot = await transaction.get(indexRef);
      if (indexSnapshot.exists) {
        throw new Error("PURCHASE_ORDER_DUPLICATE_BILL_NUMBER");
      }

      const billRef = purchaseOrderBillsRef(context.companyId, id).doc();
      const billItems = validatedLatest.items.map((item) => {
        const poItem = latestProgress.items.find((entry) => entry.id === item.poItemId);
        const totals = calculatePurchaseOrderLineTotals(item.quantity, poItem?.rate || 0, poItem?.gstRate || 0);
        return {
          id: crypto.randomUUID(),
          poItemId: item.poItemId,
          quantity: item.quantity,
          description: poItem?.description || "",
          taxableAmount: totals.taxableAmount,
          gstAmount: totals.gstAmount,
          totalAmount: totals.amount,
        };
      });
      const subtotal = billItems.reduce((sum, item) => sum + Number(item.taxableAmount || 0), 0);
      const gstTotal = billItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
      const grandTotal = billItems.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);
      const auditTrail = [
        ...(Array.isArray(latestPurchaseOrder.auditTrail) ? latestPurchaseOrder.auditTrail : []),
        buildPurchaseOrderAuditEntry("bill_recorded", actor, "Vendor bill recorded."),
      ];

      if (nextProgress.status !== latestStatus && ["partially_fulfilled", "completed"].includes(nextProgress.status)) {
        auditTrail.push(
          buildPurchaseOrderAuditEntry(
            nextProgress.status,
            actor,
            nextProgress.status === "completed" ? "PO completed by fulfillment." : "PO partially fulfilled."
          )
        );
      }

      transaction.set(indexRef, {
        id: indexRef.id,
        companyId: context.companyId,
        vendorFirestoreId: latestPurchaseOrder.vendorFirestoreId || "",
        vendorId: latestPurchaseOrder.vendorId || "",
        billNumber,
        purchaseOrderId: id,
        billId: billRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(billRef, {
        id: billRef.id,
        billNumber,
        billDate,
        purchaseOrderId: id,
        purchaseOrderNumber: latestPurchaseOrder.poNumber || "",
        vendorId: latestPurchaseOrder.vendorId || "",
        vendorFirestoreId: latestPurchaseOrder.vendorFirestoreId || "",
        projectId: latestPurchaseOrder.projectId || "",
        projectFirestoreId: latestPurchaseOrder.projectFirestoreId || "",
        items: billItems,
        subtotal,
        gstTotal,
        grandTotal,
        paidAmount: 0,
        outstandingAmount: grandTotal,
        paymentStatus: grandTotal > 0 ? "unpaid" : "paid",
        attachmentUrl,
        remarks,
        status: "recorded",
        createdBy: {
          uid: actor.uid,
          name: actor.name,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      transaction.set(ref, {
        items: nextItems,
        fulfilledAmount: nextProgress.fulfilledAmount,
        billedAmount: nextProgress.billedAmount,
        remainingValue: nextProgress.remainingValue,
        unbilledAmount: nextProgress.unbilledAmount,
        status: nextProgress.status,
        auditTrail,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      responsePayload = {
        bill: {
          id: billRef.id,
          billNumber,
          billDate,
          purchaseOrderId: id,
          purchaseOrderNumber: latestPurchaseOrder.poNumber || "",
          vendorId: latestPurchaseOrder.vendorId || "",
          vendorFirestoreId: latestPurchaseOrder.vendorFirestoreId || "",
          projectId: latestPurchaseOrder.projectId || "",
          projectFirestoreId: latestPurchaseOrder.projectFirestoreId || "",
          items: billItems,
          subtotal,
          gstTotal,
          grandTotal,
          paidAmount: 0,
          outstandingAmount: grandTotal,
          paymentStatus: grandTotal > 0 ? "unpaid" : "paid",
          attachmentUrl,
          remarks,
          status: "recorded",
          createdBy: {
            uid: actor.uid,
            name: actor.name,
          },
        },
        purchaseOrder: {
          id: latestPurchaseOrder.id,
          ...latestPurchaseOrder,
          items: nextProgress.items,
          fulfilledAmount: nextProgress.fulfilledAmount,
          billedAmount: nextProgress.billedAmount,
          remainingValue: nextProgress.remainingValue,
          unbilledAmount: nextProgress.unbilledAmount,
          status: nextProgress.status,
          auditTrail,
        },
      };
    });

    return NextResponse.json({ success: true, ...responsePayload });
  } catch (error) {
    console.error("Purchase order bill failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
