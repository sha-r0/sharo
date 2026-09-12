import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { categories, categoryError } from "./_shared";

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    return Response.json({ categories: await categories.list(context) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return categoryError(error); }
}

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    return Response.json(await categories.save(context, await request.json()), { status: 201 });
  } catch (error) { return categoryError(error); }
}
