import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

const jsonError = (error) => {
  const code = error?.message || "PROJECT_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : code === "NOT_FOUND" ? 404 : 400;
  return NextResponse.json({ error: code }, { status });
};

export async function DELETE(request, { params }) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "projects.delete", "projects.manage");

    const { projectId } = await params;
    if (!projectId || typeof projectId !== "string") throw new Error("INVALID_REQUEST");

    const projectRef = adminDb.collection("Companies").doc(context.companyId).collection("Projectmanagement").doc(projectId);
    const snapshot = await projectRef.get();
    if (!snapshot.exists) throw new Error("NOT_FOUND");
    const project = snapshot.data() || {};
    if (project.companyId && project.companyId !== context.companyId) throw new Error("FORBIDDEN");

    await projectRef.delete();
    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    console.error("Project deletion failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
