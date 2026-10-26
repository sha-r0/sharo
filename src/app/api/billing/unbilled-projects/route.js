import { NextResponse } from "next/server";
import { FieldPath } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";


const PAGE_SIZE = 30;


function normalizeProject(
  snapshot
) {
  const data =
    snapshot.data();

  return {
    id:
      snapshot.id,

    projectId:
      data.projectId || "",

    projectName:
      data.projectName || "",

    clientId:
      data.clientId || "",

    clientName:
      data.clientName || "",

    poNumber:
      data.poNumber ||
      data.projectCode ||
      data.projectId ||
      "",

    status:
      data.status || "",

    contractValue:
      Number(
        data.contractValue ||
          data.poAmount ||
          0
      ) || 0,

    billingInvoiceCount:
      Number(
        data.billingInvoiceCount ||
          0
      ) || 0,

    billingHasInvoice:
      Boolean(
        data.billingHasInvoice
      ),

    completedAt:
      data.completedAt ||
      data.updatedAt ||
      data.endDate ||
      null,

    endDate:
      data.endDate || null,

    updatedAt:
      data.updatedAt || null,
  };
}


export async function GET(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "billing.view",
      "billing.manage"
    );


    const { searchParams } =
      new URL(request.url);

    const cursor =
      String(
        searchParams.get(
          "cursor"
        ) || ""
      ).trim();


    const projectCollection =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "Projectmanagement"
        );


    let query =
      projectCollection
        .where(
          "status",
          "in",
          [
            "completed",
            "Completed",
          ]
        )
        .where(
          "billingHasInvoice",
          "==",
          false
        )
        .orderBy(
          FieldPath.documentId()
        )
        .select(
          "projectId",
          "projectName",
          "clientId",
          "clientName",
          "poNumber",
          "projectCode",
          "status",
          "contractValue",
          "poAmount",
          "billingInvoiceCount",
          "billingHasInvoice",
          "completedAt",
          "updatedAt",
          "endDate"
        );


    if (cursor) {
      query =
        query.startAfter(
          cursor
        );
    }


    /*
     * Read one extra document so we know
     * whether another page exists.
     */
    const snapshot =
      await query
        .limit(
          PAGE_SIZE + 1
        )
        .get();


    const hasMore =
      snapshot.docs.length >
      PAGE_SIZE;


    const pageDocs =
      hasMore
        ? snapshot.docs.slice(
            0,
            PAGE_SIZE
          )
        : snapshot.docs;


    const projects =
      pageDocs.map(
        normalizeProject
      );


    const nextCursor =
      hasMore &&
      pageDocs.length
        ? pageDocs[
            pageDocs.length - 1
          ].id
        : null;


    return NextResponse.json({
      projects,

      count:
        projects.length,

      hasMore,

      nextCursor,

      pageSize:
        PAGE_SIZE,
    });
  } catch (error) {
    console.error(
      "Unbilled projects read failed",
      error
    );

    const code =
      error?.message ||
      "UNBILLED_PROJECTS_FAILED";

    return NextResponse.json(
      {
        error: code,
      },
      {
        status:
          code ===
          "UNAUTHENTICATED"
            ? 401
            : code ===
                "FORBIDDEN"
              ? 403
              : 500,
      }
    );
  }
}