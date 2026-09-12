import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { creationError, expenseCreation } from "../_creation";

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    return Response.json(await expenseCreation.references(context), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return creationError(error); }
}
