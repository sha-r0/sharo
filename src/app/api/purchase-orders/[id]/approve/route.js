import { transitionPurchaseOrder } from "../../_actions";

export async function POST(request, context) {
  return transitionPurchaseOrder(request, context, {
    permission: "purchase_order.approve",
    targetStatus: "approved",
    action: "approved",
    notes: "PO approved.",
    setApprovedBy: true,
  });
}

