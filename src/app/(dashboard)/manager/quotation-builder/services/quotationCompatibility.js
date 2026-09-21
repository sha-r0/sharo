import { quotationListComparator } from "../../../../../lib/quotations/quotationNumberOrder.js";

export function normalizeQuotationRecord(id, data = {}) {
  return {
    ...data,
    id,
    quotationNumber: data.quotationNumber || data.meta?.quotationNo || id,
    clientName: data.clientName || data.meta?.clientName || "Unresolved client",
    clientId: data.clientId || "",
    status: data.status || "Draft",
    quotationDate: data.quotationDate || data.date || null,
  };
}

export const compareQuotationNumbersDescending = quotationListComparator();
