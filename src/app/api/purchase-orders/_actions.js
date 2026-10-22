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

export async function transitionPurchaseOrder(
  request,
  { params },
  {
    permission,
    targetStatus,
    action,
    notes,
    extraMutations = {},
    setApprovedBy = false,
  }
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      permission
    );

    const { id } = await params;

    const ref =
      purchaseOrderRef(
        context.companyId,
        id
      );

    const normalizedTarget =
      normalizePurchaseOrderStatus(
        targetStatus
      );

    const preparedBy = {
      uid:
        context.employee?.uid ||
        context.token.uid,

      name:
        context.employee?.name ||
        context.employee?.displayName ||
        context.company?.ownerName ||
        "System",

      role:
        context.employee?.roleId ||
        context.employee?.role ||
        (context.isOwner
          ? "owner"
          : "employee"),
    };

    let updatedPurchaseOrder = null;
    let idempotent = false;

    await adminDb.runTransaction(
      async (transaction) => {
        const latest =
          await transaction.get(ref);

        if (!latest.exists) {
          throw new Error(
            "PURCHASE_ORDER_NOT_FOUND"
          );
        }

        const purchaseOrder = {
          id: latest.id,
          ...latest.data(),
        };

        const currentStatus =
          normalizePurchaseOrderStatus(
            purchaseOrder.status
          );

        if (
          currentStatus ===
          normalizedTarget
        ) {
          idempotent = true;
          updatedPurchaseOrder =
            purchaseOrder;
          return;
        }

        if (
          !canTransitionPurchaseOrderStatus(
            currentStatus,
            normalizedTarget
          )
        ) {
          throw new Error(
            "PURCHASE_ORDER_STATUS_TRANSITION_NOT_ALLOWED"
          );
        }

        const auditTrail = [
          ...(
            Array.isArray(
              purchaseOrder.auditTrail
            )
              ? purchaseOrder.auditTrail
              : []
          ),
          buildPurchaseOrderAuditEntry(
            action,
            preparedBy,
            notes
          ),
        ];

        const next = {
          status:
            normalizedTarget,

          auditTrail,

          updatedAt:
            FieldValue.serverTimestamp(),

          ...extraMutations,
        };

        if (setApprovedBy) {
          next.approvedBy =
            preparedBy;
        }

        transaction.set(
          ref,
          next,
          {
            merge: true,
          }
        );

        /*
         * Build response locally.
         * Avoid another Firestore read.
         */
        updatedPurchaseOrder = {
          ...purchaseOrder,
          ...next,

          /*
           * Do not expose unresolved
           * serverTimestamp sentinel.
           */
          updatedAt:
            purchaseOrder.updatedAt,
        };
      }
    );

    return NextResponse.json({
      success: true,
      id,
      purchaseOrder:
        updatedPurchaseOrder,
      ...(idempotent
        ? { idempotent: true }
        : {}),
    });
  } catch (error) {
    console.error(
      "Purchase order transition failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(error);
  }
}

