import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

import {
  buildPurchaseOrderPayload,
  formatPurchaseOrderNumber,
  getPurchaseOrderFinancialYearKey,
  isValidPurchaseOrderDate,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  purchaseOrdersRef,
  purchaseOrderSequenceRef,
  purchaseOrderSettingsRef,
  resolvePurchaseOrderReferences,
  sanitizePurchaseOrderInput,
  summarizePurchaseOrderProgress,
} from "./_shared";

/* =========================================================
   Error Response
========================================================= */

const jsonError = (error) => {
  const code =
    error?.message ||
    error?.code ||
    "PURCHASE_ORDER_REQUEST_FAILED";

  const status =
    code === "UNAUTHENTICATED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : 400;

  return NextResponse.json(
    {
      error: code,
    },
    {
      status,
    }
  );
};

/* =========================================================
   Helpers
========================================================= */

const toRow = (snapshot) => ({
  id: snapshot.id,
  ...snapshot.data(),
});

const roundMoney = (value) => {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return (
    Math.round(
      (number + Number.EPSILON) * 100
    ) / 100
  );
};

const matchSearch = (
  order,
  search
) => {
  if (!search) {
    return true;
  }

  const query =
    String(search)
      .trim()
      .toLowerCase();

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

  return haystack.includes(query);
};

/* =========================================================
   List Summary
========================================================= */

function summarizePurchaseOrders(
  orders
) {
  return orders.reduce(
    (summary, order) => {
      summary.total += 1;

      const status =
        normalizePurchaseOrderStatus(
          order.status
        );

      if (status === "draft") {
        summary.draft += 1;
      }

      if (
        status ===
        "pending_approval"
      ) {
        summary.pendingApproval += 1;
      }

      if (
        status === "approved"
      ) {
        summary.approved += 1;
      }

      if (
        status === "issued"
      ) {
        summary.issued += 1;
      }

      if (
        status ===
        "partially_fulfilled"
      ) {
        summary.partiallyFulfilled += 1;
      }

      if (
        status === "completed"
      ) {
        summary.completed += 1;
      }

      if (
        status === "rejected"
      ) {
        summary.rejected += 1;
      }

      if (
        status === "cancelled"
      ) {
        summary.cancelled += 1;
      }

      summary.grandTotal =
        roundMoney(
          summary.grandTotal +
            Number(
              order.grandTotal || 0
            )
        );

      return summary;
    },
    {
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
    }
  );
}

/* =========================================================
   Purchase Order List
========================================================= */

export async function GET(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "purchase_order.view"
    );

    const companyId =
      context.companyId;

    const searchParams =
      new URL(
        request.url
      ).searchParams;

    const rawStatusFilter =
      String(
        searchParams.get(
          "status"
        ) || "all"
      )
        .trim()
        .toLowerCase();

    const statusFilter =
      rawStatusFilter === "all"
        ? "all"
        : normalizePurchaseOrderStatus(
            rawStatusFilter
          );

    const search =
      normalizePurchaseOrderText(
        searchParams.get(
          "search"
        ) || ""
      );

    /*
     * One collection read only.
     *
     * VendorPayments are NOT loaded here anymore.
     *
     * paidAmount and outstandingAmount are maintained
     * directly on the PurchaseOrder document by the
     * PO bill payment transaction.
     */
    const snapshot =
      await purchaseOrdersRef(
        companyId
      )
        .orderBy(
          "createdAt",
          "desc"
        )
        .get();

    const orders =
      snapshot.docs.map(
        (doc) => {
          const order =
            toRow(doc);

          /*
           * Fulfillment / billing progress can be
           * calculated from the PO document itself.
           */
          const progress =
            summarizePurchaseOrderProgress(
              order
            );

          const fulfilledAmount =
            roundMoney(
              Number(
                progress.fulfilledAmount ??
                  order.fulfilledAmount ??
                  0
              )
            );

          const billedAmount =
            roundMoney(
              Number(
                progress.billedAmount ??
                  order.billedAmount ??
                  0
              )
            );

          const paidAmount =
            roundMoney(
              Number(
                order.paidAmount || 0
              )
            );

          /*
           * Use billed amount as the authoritative
           * outstanding-payment basis.
           */
          const outstandingAmount =
            roundMoney(
              Math.max(
                0,
                billedAmount -
                  paidAmount
              )
            );

          return {
            ...order,

            /*
             * Keep list response lightweight.
             *
             * We do not attach payment-ledger arrays,
             * bills, or complete progress objects here.
             */
            fulfilledQty:
              progress.fulfilledQty,

            billedQty:
              progress.billedQty,

            remainingQty:
              progress.remainingQty,

            fulfilledAmount,

            billedAmount,

            remainingValue:
              roundMoney(
                Number(
                  progress.remainingValue ??
                    order.remainingValue ??
                    0
                )
              ),

            unbilledAmount:
              roundMoney(
                Number(
                  progress.unbilledAmount ??
                    order.unbilledAmount ??
                    0
                )
              ),

            paidAmount,

            outstandingAmount,

            status:
              progress.status,
          };
        }
      );

    /*
     * Summary is based on the complete PO list,
     * not the currently filtered result.
     */
    const summary =
      summarizePurchaseOrders(
        orders
      );

    /*
     * Filtering remains in memory.
     *
     * This means search/status changes on the client
     * do not require new Firestore reads.
     */
    const filteredOrders =
      orders.filter(
        (order) => {
          const status =
            normalizePurchaseOrderStatus(
              order.status
            );

          return (
            (
              statusFilter ===
                "all" ||
              status ===
                statusFilter
            ) &&
            matchSearch(
              order,
              search
            )
          );
        }
      );

    return NextResponse.json(
      {
        company:
          context.company ||
          null,

        summary,

        purchaseOrders:
          filteredOrders,
      }
    );
  } catch (error) {
    console.error(
      "Purchase order list failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(
      error
    );
  }
}

/* =========================================================
   Create Purchase Order
========================================================= */

export async function POST(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "purchase_order.create"
    );

    const rawInput =
      await request.json();

    const input =
      sanitizePurchaseOrderInput(
        rawInput
      );

    const status =
      normalizePurchaseOrderStatus(
        input.status
      );

    if (
      ![
        "draft",
        "pending_approval",
      ].includes(status)
    ) {
      throw new Error(
        "INVALID_INITIAL_STATUS"
      );
    }

    if (!input.poDate) {
      input.poDate =
        new Date()
          .toISOString()
          .slice(0, 10);
    }

    if (
      !isValidPurchaseOrderDate(
        input.poDate
      )
    ) {
      throw new Error(
        "INVALID_PO_DATE"
      );
    }

    if (
      input.expectedDeliveryDate &&
      !isValidPurchaseOrderDate(
        input.expectedDeliveryDate
      )
    ) {
      throw new Error(
        "INVALID_EXPECTED_DELIVERY_DATE"
      );
    }

    if (
      !input.projectFirestoreId &&
      !input.projectId
    ) {
      throw new Error(
        "PROJECT_REQUIRED"
      );
    }

    if (
      !input.vendorFirestoreId &&
      !input.vendorId
    ) {
      throw new Error(
        "VENDOR_REQUIRED"
      );
    }

    /*
     * Project and Vendor reference lookup now runs
     * in parallel inside resolvePurchaseOrderReferences().
     */
    const {
      project,
      vendor,
    } =
      await resolvePurchaseOrderReferences(
        context.companyId,
        input
      );

    if (!project) {
      throw new Error(
        "PROJECT_NOT_FOUND"
      );
    }

    if (!vendor) {
      throw new Error(
        "VENDOR_NOT_FOUND"
      );
    }

    const financialYearKey =
      getPurchaseOrderFinancialYearKey(
        input.poDate ||
          new Date()
      );

    const settingsRef =
      purchaseOrderSettingsRef(
        context.companyId
      );

    /*
     * Reuse the same document reference.
     */
    const settingsSnapshot =
      await settingsRef.get();

    const settings =
      settingsSnapshot.exists
        ? settingsSnapshot.data()
        : {};

    const poRef =
      purchaseOrdersRef(
        context.companyId
      ).doc();

    const sequenceRef =
      purchaseOrderSequenceRef(
        context.companyId,
        financialYearKey
      );

    let createdPayload =
      null;

    await adminDb.runTransaction(
      async (
        transaction
      ) => {
        const sequenceSnapshot =
          await transaction.get(
            sequenceRef
          );

        const sequence =
          Number(
            sequenceSnapshot.exists
              ? sequenceSnapshot.data()
                  ?.nextSequence ||
                  1
              : 1
          );

        const poNumber =
          formatPurchaseOrderNumber(
            {
              prefix:
                normalizePurchaseOrderText(
                  settings?.poPrefix ||
                    settings?.purchaseOrderPrefix ||
                    "PO"
                ) ||
                "PO",

              financialYearKey,

              sequence,
            }
          );

        createdPayload =
          buildPurchaseOrderPayload(
            {
              companyId:
                context.companyId,

              company:
                context.company,

              settings,

              input,

              project,

              vendor,

              actor:
                context.employee ||
                {
                  uid:
                    context
                      .token.uid,

                  name:
                    context
                      .company
                      ?.ownerName ||
                    "",

                  roleId:
                    context.isOwner
                      ? "owner"
                      : "employee",
                },

              status,

              poNumber,

              poSequence:
                sequence,

              financialYearKey,
            }
          );

        /*
         * PO creation.
         */
        transaction.set(
          poRef,
          {
            ...createdPayload,
            id: poRef.id,
          }
        );

        /*
         * Atomic PO sequence update.
         */
        transaction.set(
          sequenceRef,
          {
            financialYearKey,

            nextSequence:
              sequence + 1,

            updatedAt:
              FieldValue.serverTimestamp(),

            ...(sequenceSnapshot.exists
              ? {}
              : {
                  createdAt:
                    FieldValue.serverTimestamp(),
                }),
          },
          {
            merge: true,
          }
        );

        /*
         * Create default settings only if this
         * company does not have settings yet.
         */
        if (
          !settingsSnapshot.exists
        ) {
          transaction.set(
            settingsRef,
            {
              poPrefix:
                "PO",

              createdAt:
                FieldValue.serverTimestamp(),

              updatedAt:
                FieldValue.serverTimestamp(),
            },
            {
              merge: true,
            }
          );
        }
      }
    );

    return NextResponse.json(
      {
        success: true,

        id:
          poRef.id,

        purchaseOrder: {
          id:
            poRef.id,
          ...createdPayload,
        },
      }
    );
  } catch (error) {
    console.error(
      "Purchase order create failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(
      error
    );
  }
}