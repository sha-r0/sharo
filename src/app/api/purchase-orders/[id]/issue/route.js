import { transitionPurchaseOrder } from "../../_actions";

export async function POST(request, context) {
  return transitionPurchaseOrder(request, context, {
    permission: "purchase_order.issue",
    targetStatus: "issued",
    action: "issued",
    notes: "PO issued.",
  });
}

