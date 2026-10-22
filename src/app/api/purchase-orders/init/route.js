import { NextResponse } from "next/server";

import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

import {
  buildPurchaseOrderInitPayload,
  getPurchaseOrderFinancialYearKey,
  loadCompanyPurchaseOrderAssets,
  loadPurchaseOrderSequence,
} from "../_shared";

const jsonError = (error) => {
  const code =
    error?.message ||
    error?.code ||
    "PURCHASE_ORDER_INIT_FAILED";

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

export async function GET(request) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    const params =
      new URL(
        request.url
      ).searchParams;

    const purchaseOrderId =
      String(
        params.get(
          "purchaseOrderId"
        ) || ""
      ).trim();

    const isEdit =
      Boolean(
        purchaseOrderId
      );

    if (isEdit) {
      requireCompanyPermission(
        context,
        "purchase_order.edit"
      );
    } else {
      requireCompanyPermission(
        context,
        "purchase_order.create"
      );
    }

    const financialYearKey =
      getPurchaseOrderFinancialYearKey(
        new Date()
      );

    /*
     * Create mode:
     * assets + sequence are independent,
     * so load them in parallel.
     *
     * Edit mode:
     * existing PO already has its PO number,
     * so there is no reason to read the
     * next sequence document.
     */
    const [
      assets,
      sequence,
    ] = await Promise.all([
      loadCompanyPurchaseOrderAssets(
        context.companyId,
        purchaseOrderId,
        {
          company:
            context.company ||
            null,
        }
      ),

      isEdit
        ? Promise.resolve(
            null
          )
        : loadPurchaseOrderSequence(
            context.companyId,
            financialYearKey
          ),
    ]);

    /*
     * authorizeCompanyRequest already loaded
     * the authoritative company.
     *
     * Prefer that company object rather than
     * requiring downstream code to depend on
     * another company representation.
     */
    const normalizedAssets = {
      ...assets,

      company:
        context.company ||
        assets.company ||
        null,
    };

    return NextResponse.json(
      buildPurchaseOrderInitPayload(
        {
          ...normalizedAssets,

          sequence,

          financialYearKey,
        }
      )
    );
  } catch (error) {
    console.error(
      "Purchase order init failed",
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