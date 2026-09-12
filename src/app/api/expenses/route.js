import { pageExpenses, queryExpenseMatches } from "@/lib/server/expensePageService";
import { logFirestoreFailure } from "@/lib/firestoreDiagnostics";
import { adminDb } from "@/lib/firebase-admin";
import { listExpenses } from "@/lib/server/expenseListService";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { creationError, expenseCreation } from "./_creation";

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    const result = await expenseCreation.create(context, await request.json());
    return Response.json({ success: true, ...result }, { status: result.duplicate ? 200 : 201 });
  } catch (error) { return creationError(error); }
}

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    const url = new URL(request.url);
    const month = url.searchParams.get("month");
    const result = month && url.searchParams.get("mode") === "filter"
      ? await queryExpenseMatches(adminDb, context, month, Object.fromEntries(["search", "status", "category", "project", "employee", "fromDate", "toDate"].map((key) => [key, url.searchParams.get(key) || ""])))
      : month ? await pageExpenses(adminDb, context, month, url.searchParams.get("cursor")) : { expenses: await listExpenses(adminDb, context) };
    return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const forbidden = ["FORBIDDEN", "COMPANY_INACTIVE"].includes(error.message);
    const unauthenticated = error.message === "UNAUTHENTICATED" || String(error.code || "").startsWith("auth/");
    logFirestoreFailure({ feature: "expenses", operation: "GET", path: "/api/expenses", error });
    return Response.json({ error: "Unable to load expenses.", code: error.code ?? (unauthenticated ? "unauthenticated" : forbidden ? "permission-denied" : "unknown"),
      ...(error.path ? { path: error.path, operation: error.operation, query: error.query } : {}),
    }, { status: unauthenticated ? 401 : forbidden ? 403 : error.message?.startsWith("INVALID_") ? 400 : 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
