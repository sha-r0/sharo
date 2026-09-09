import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderAuditEntry,
  normalizePurchaseOrderStatus,
  purchaseOrderRef,
  summarizePurchaseOrderProgress,
} from "../../_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function POST(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "purchase_order.cancel");

    const { id } = await params;
    const ref = purchaseOrderRef(context.companyId, id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");

    const purchaseOrder = { id: snapshot.id, ...snapshot.data() };
    const currentStatus = normalizePurchaseOrderStatus(purchaseOrder.status);
    if (!["pending_approval", "approved", "issued"].includes(currentStatus)) {
      throw new Error("PURCHASE_ORDER_CANCEL_NOT_ALLOWED");
    }

    const progress = summarizePurchaseOrderProgress(purchaseOrder);
    if (currentStatus === "issued" && (progress.fulfilledAmount > 0 || progress.billedAmount > 0)) {
      throw new Error("PURCHASE_ORDER_CANCEL_NOT_ALLOWED_AFTER_PROGRESS");
    }

    const actor = {
      uid: context.employee?.uid || context.token.uid,
      name: context.employee?.name || context.employee?.displayName || context.company?.ownerName || "System",
      role: context.employee?.roleId || context.employee?.role || (context.isOwner ? "owner" : "employee"),
    };

    await adminDb.runTransaction(async (transaction) => {
      const latest = await transaction.get(ref);
      if (!latest.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
      const latestStatus = normalizePurchaseOrderStatus(latest.data()?.status);
      const latestProgress = summarizePurchaseOrderProgress(latest.data());
      if (!["pending_approval", "approved", "issued"].includes(latestStatus)) {
        throw new Error("PURCHASE_ORDER_CANCEL_NOT_ALLOWED");
      }
      if (latestStatus === "issued" && (latestProgress.fulfilledAmount > 0 || latestProgress.billedAmount > 0)) {
        throw new Error("PURCHASE_ORDER_CANCEL_NOT_ALLOWED_AFTER_PROGRESS");
      }
      transaction.set(ref, {
        status: "cancelled",
        auditTrail: [
          ...(Array.isArray(latest.data()?.auditTrail) ? latest.data().auditTrail : []),
          buildPurchaseOrderAuditEntry("cancelled", actor, "PO cancelled."),
        ],
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    const updated = await ref.get();
    return NextResponse.json({ success: true, purchaseOrder: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Purchase order cancel failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
