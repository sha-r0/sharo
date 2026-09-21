import { normalizeQuotationRecord } from "../../app/(dashboard)/manager/quotation-builder/services/quotationCompatibility.js";

import { quotationListComparator } from "./quotationNumberOrder.js";
export { quotationListComparator } from "./quotationNumberOrder.js";

export function buildQuotationList(records, options = {}, prefix = "QT") {
  const { viewMode = "all", month = "", search = "", status = "All" } = options;
  const page = Number(options.page ?? 1), pageSize = Number(options.pageSize ?? 10);
  if (!["all", "month"].includes(viewMode) || viewMode === "month" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("INVALID_QUOTATION_MONTH");
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error("INVALID_QUOTATION_PAGE");
  if (!["all", "draft", "sent", "approved", "rejected"].includes(String(status).toLowerCase())) throw new Error("INVALID_QUOTATION_STATUS");
  const quotations = records.map(({ id, ...data }) => normalizeQuotationRecord(id, data))
    .filter((row) => viewMode !== "month" || String(row.quotationDate || "").startsWith(`${month}-`))
    .sort(quotationListComparator(prefix));
  const summary = quotations.reduce((result, row) => { result.total++; const state = String(row.status).trim().toLowerCase(); if (state in result && state !== "total") result[state]++; return result; }, { total: 0, draft: 0, sent: 0, approved: 0, rejected: 0 });
  const term = String(search).trim().toLowerCase();
  const matches = quotations.filter((row) => (!term || row.quotationNumber.toLowerCase().includes(term) || row.clientName.toLowerCase().includes(term)) && (String(status).toLowerCase() === "all" || String(row.status).toLowerCase() === String(status).toLowerCase()));
  const total = matches.length, totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  return { quotations: matches.slice((currentPage - 1) * pageSize, currentPage * pageSize), total, totalPages, page: currentPage, pageSize, summary };
}
