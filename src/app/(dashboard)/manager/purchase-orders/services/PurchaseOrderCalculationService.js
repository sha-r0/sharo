import { calculatePurchaseOrderTotals, summarizePurchaseOrderProgress } from "@/lib/purchase-orders";

export default class PurchaseOrderCalculationService {
  static calculate(form = {}) {
    return calculatePurchaseOrderTotals(form.items || []);
  }

  static summarizeProgress(purchaseOrder = {}) {
    return summarizePurchaseOrderProgress(purchaseOrder);
  }
}
