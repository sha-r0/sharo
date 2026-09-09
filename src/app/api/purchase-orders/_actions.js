import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderAuditEntry,
  canTransitionPurchaseOrderStatus,
  normalizePurchaseOrderStatus,
  purchaseOrderRef,
} from "./_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function transitionPurchaseOrder(request, { params }, {
  permission,
  targetStatus,
  action,
  notes,
  extraMutations = {},
  setApprovedBy = false,
}) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, permission);

    const { id } = await params;
    const ref = purchaseOrderRef(context.companyId, id);
    const snapshot = await ref.get();
    if (!snapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");

    const purchaseOrder = { id: snapshot.id, ...snapshot.data() };
    const currentStatus = normalizePurchaseOrderStatus(purchaseOrder.status);
    const normalizedTarget = normalizePurchaseOrderStatus(targetStatus);
    const preparedBy = {
      uid: context.employee?.uid || context.token.uid,
      name: context.employee?.name || context.employee?.displayName || context.company?.ownerName || "System",
      role: context.employee?.roleId || context.employee?.role || (context.isOwner ? "owner" : "employee"),
    };

    if (currentStatus === normalizedTarget) {
      return NextResponse.json({
        success: true,
        purchaseOrder,
        id: purchaseOrder.id,
        idempotent: true,
      });
    }

    if (!canTransitionPurchaseOrderStatus(currentStatus, normalizedTarget)) {
      throw new Error("PURCHASE_ORDER_STATUS_TRANSITION_NOT_ALLOWED");
    }

    const auditTrail = [
      ...(Array.isArray(purchaseOrder.auditTrail) ? purchaseOrder.auditTrail : []),
      buildPurchaseOrderAuditEntry(action, preparedBy, notes),
    ];

    await adminDb.runTransaction(async (transaction) => {
      const latest = await transaction.get(ref);
      if (!latest.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
      const latestStatus = normalizePurchaseOrderStatus(latest.data()?.status);
      if (latestStatus === normalizedTarget) return;
      if (!canTransitionPurchaseOrderStatus(latestStatus, normalizedTarget)) {
        throw new Error("PURCHASE_ORDER_STATUS_TRANSITION_NOT_ALLOWED");
      }
      const next = {
        status: normalizedTarget,
        auditTrail,
        updatedAt: FieldValue.serverTimestamp(),
        ...extraMutations,
      };
      if (setApprovedBy) {
        next.approvedBy = preparedBy;
      }
      transaction.set(ref, next, { merge: true });
    });

    const updatedSnapshot = await ref.get();
    return NextResponse.json({
      success: true,
      id: updatedSnapshot.id,
      purchaseOrder: { id: updatedSnapshot.id, ...updatedSnapshot.data() },
    });
  } catch (error) {
    console.error("Purchase order transition failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}

