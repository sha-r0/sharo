import { transitionPurchaseOrder } from "../../_actions";

export async function POST(request, context) {
  return transitionPurchaseOrder(request, context, {
    permission: "purchase_order.edit",
    targetStatus: "pending_approval",
    action: "submitted",
    notes: "PO submitted for approval.",
  });
}

