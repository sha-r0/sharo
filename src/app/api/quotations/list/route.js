import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import { getCompanyQuotationList } from "@/lib/server/quotationList";

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "quotation.view", "quotation.manage");
    const params = new URL(request.url).searchParams;
    const result = await getCompanyQuotationList(adminDb, context.companyId, {
      viewMode: params.get("viewMode") || "all", month: params.get("month") || "",
      search: params.get("search") || "", status: params.get("status") || "All",
      page: params.get("page") || 1, pageSize: params.get("pageSize") || 10,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const code = error?.message || "QUOTATION_LIST_FAILED";
    const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : code.startsWith("INVALID_") ? 400 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
