import { NextResponse } from "next/server";

import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import { buildPerformanceDashboardResponse, loadPerformanceDataset, parsePerformanceQuery } from "./_shared";

const jsonError = (error) => {
  const known = ["UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "INVALID_PERFORMANCE_PERIOD", "COMPANY_INACTIVE"];
  const code = known.includes(error?.message) ? error.message : String(error?.code || "").startsWith("auth/") ? "UNAUTHENTICATED" : "PERFORMANCE_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(code) ? 403 : code === "NOT_FOUND" ? 404 : code === "INVALID_PERFORMANCE_PERIOD" ? 400 : 500;
  return NextResponse.json({ error: code }, { status });
};

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "performance.view");
    const query = parsePerformanceQuery(new URL(request.url).searchParams);
    const data = await loadPerformanceDataset(context.companyId);
    const payload = buildPerformanceDashboardResponse(data, query);
    return NextResponse.json({
      ...payload,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Performance dashboard failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}

