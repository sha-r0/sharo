import { transitionPurchaseOrder } from "../../_actions";

export async function POST(request, context) {
  return transitionPurchaseOrder(request, context, {
    permission: "purchase_order.approve",
    targetStatus: "rejected",
    action: "rejected",
    notes: "PO rejected.",
  });
}

