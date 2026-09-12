import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { categories, categoryError } from "../_shared";

export async function PUT(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    const { id } = await params;
    return Response.json(await categories.save(context, await request.json(), id));
  } catch (error) { return categoryError(error); }
}
