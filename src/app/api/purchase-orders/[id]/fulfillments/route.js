import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderAuditEntry,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  purchaseOrderRef,
  purchaseOrderFulfillmentsRef,
  summarizePurchaseOrderProgress,
  validatePurchaseOrderFulfillmentItems,
} from "../../_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function POST(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.fulfill");

    const { id } = await params;
    const ref = purchaseOrderRef(context.companyId, id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");

    const purchaseOrder = { id: snapshot.id, ...snapshot.data() };
    const currentStatus = normalizePurchaseOrderStatus(purchaseOrder.status);
    if (!["issued", "partially_fulfilled"].includes(currentStatus)) {
      throw new Error("PURCHASE_ORDER_FULFILLMENT_NOT_ALLOWED");
    }

    const body = await request.json();
    const fulfillmentDate = normalizePurchaseOrderText(body?.fulfillmentDate);
    const referenceNumber = normalizePurchaseOrderText(body?.referenceNumber);
    const notes = normalizePurchaseOrderText(body?.notes);
    const requestedItems = Array.isArray(body?.items) ? body.items : [];
    if (!fulfillmentDate || !isValidPurchaseOrderDate(fulfillmentDate)) {
      throw new Error("INVALID_FULFILLMENT_DATE");
    }

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
      if (!["issued", "partially_fulfilled"].includes(latestStatus)) {
        throw new Error("PURCHASE_ORDER_FULFILLMENT_NOT_ALLOWED");
      }

      const latestProgress = summarizePurchaseOrderProgress(latestPurchaseOrder);
      const validatedLatest = validatePurchaseOrderFulfillmentItems(latestPurchaseOrder, requestedItems);
      const fulfillmentMap = new Map(validatedLatest.items.map((item) => [item.poItemId, item.quantity]));
      const nextItems = latestProgress.items.map((item) => {
        const add = fulfillmentMap.get(item.id) || 0;
        if (!add) return item;
        return {
          ...item,
          fulfilledQty: Math.min(Number(item.quantity || 0), Number(item.fulfilledQty || 0) + add),
        };
      });

      const nextProgress = summarizePurchaseOrderProgress({
        ...latestPurchaseOrder,
        items: nextItems,
      });
      const nextStatus = nextProgress.status;
      const auditTrail = [
        ...(Array.isArray(latestPurchaseOrder.auditTrail) ? latestPurchaseOrder.auditTrail : []),
        buildPurchaseOrderAuditEntry("fulfillment_recorded", actor, "Fulfillment recorded."),
      ];
      if (nextStatus !== latestStatus && ["partially_fulfilled", "completed"].includes(nextStatus)) {
        auditTrail.push(
          buildPurchaseOrderAuditEntry(
            nextStatus,
            actor,
            nextStatus === "completed" ? "PO completed by fulfillment." : "PO partially fulfilled."
          )
        );
      }

      const fulfillmentRef = purchaseOrderFulfillmentsRef(context.companyId, id).doc();
      transaction.set(fulfillmentRef, {
        id: fulfillmentRef.id,
        fulfillmentDate,
        items: validatedLatest.items,
        referenceNumber,
        notes,
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
        status: nextStatus,
        auditTrail,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      responsePayload = {
        fulfillment: {
          id: fulfillmentRef.id,
          fulfillmentDate,
          items: validatedLatest.items,
          referenceNumber,
          notes,
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
          status: nextStatus,
          auditTrail,
        },
      };
    });

    return NextResponse.json({ success: true, ...responsePayload });
  } catch (error) {
    console.error("Purchase order fulfillment failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
