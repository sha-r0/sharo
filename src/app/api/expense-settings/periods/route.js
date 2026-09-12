import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { readExpensePeriod, setExpensePeriod } from "@/lib/server/expensePeriodService";
import { requireCompanyPermission } from "@/lib/server/companyPermission";

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "expense.view", "expense.create", "expense.manage");
    const period = new URL(request.url).searchParams.get("period");
    return Response.json(await readExpensePeriod(adminDb, context.companyId, period), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const status = error.message === "UNAUTHENTICATED" ? 401 : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(error.message) ? 403 : 400;
    return Response.json({ error: error.message || "Unable to read expense period." }, { status });
  }
}

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    const body = await request.json();
    const result = await setExpensePeriod(adminDb, context, body.period, body.action, body.reason, () => FieldValue.serverTimestamp());
    return Response.json({ success: true, period: result });
  } catch (error) {
    const status = error.message === "UNAUTHENTICATED" ? 401 : ["FORBIDDEN", "COMPANY_INACTIVE"].includes(error.message) ? 403 : error.message?.startsWith("PERIOD_") ? 409 : 400;
    return Response.json({ error: error.message || "Unable to update expense period." }, { status });
  }
}
