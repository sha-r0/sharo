import { NextResponse } from "next/server";

import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  buildPurchaseOrderInitPayload,
  getPurchaseOrderFinancialYearKey,
  loadCompanyPurchaseOrderAssets,
  loadPurchaseOrderSequence,
} from "../_shared";

const jsonError = (error) => {
  const code = error?.message || error?.code || "PURCHASE_ORDER_INIT_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    const params = new URL(request.url).searchParams;
    const purchaseOrderId = params.get("purchaseOrderId") || "";

    if (purchaseOrderId) {
      requireCompanyPermission(context, "purchase_order.edit");
    } else {
      requireCompanyPermission(context, "purchase_order.create");
    }

    const assets = await loadCompanyPurchaseOrderAssets(context.companyId, purchaseOrderId);
    const financialYearKey = getPurchaseOrderFinancialYearKey(new Date());
    const sequence = await loadPurchaseOrderSequence(context.companyId, financialYearKey);

    return NextResponse.json(
      buildPurchaseOrderInitPayload({
        ...assets,
        sequence,
        financialYearKey,
      })
    );
  } catch (error) {
    console.error("Purchase order init failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}

