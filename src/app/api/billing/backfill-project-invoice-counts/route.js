import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
} from "@/lib/server/authorizeCompanyRequest";


const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


export async function POST(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    /*
     * This is a one-time maintenance
     * operation. Owner only.
     */
    if (!context.isOwner) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
        },
        {
          status: 403,
        }
      );
    }


    const companyRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        );


    const [
      projectSnapshot,
      invoiceSnapshot,
    ] =
      await Promise.all([
        companyRef
          .collection(
            "Projectmanagement"
          )
          .select(
            "projectId",
            "projectName"
          )
          .get(),

        companyRef
          .collection(
            "Invoices"
          )
          .select(
            "projectId",
            "projectFirestoreId",
            "projectBusinessId",
            "projectName"
          )
          .get(),
      ]);


    /*
     * Build lookup maps for existing
     * and legacy invoice formats.
     */
    const projectById =
      new Map();

    const projectByName =
      new Map();


    for (
      const document of
        projectSnapshot.docs
    ) {
      const data =
        document.data();

      const identifiers =
        [
          document.id,
          data.projectId,
        ]
          .filter(Boolean)
          .map(String);

      for (
        const identifier of
          identifiers
      ) {
        projectById.set(
          identifier,
          document.id
        );
      }


      const name =
        lower(
          data.projectName
        );

      if (name) {
        if (
          !projectByName.has(
            name
          )
        ) {
          projectByName.set(
            name,
            []
          );
        }

        projectByName
          .get(name)
          .push(
            document.id
          );
      }
    }


    const counts =
      new Map(
        projectSnapshot.docs.map(
          (document) => [
            document.id,
            0,
          ]
        )
      );


    let matchedInvoices = 0;
    let unmatchedInvoices = 0;

    const unmatchedInvoiceDetails = [];


    for (
      const document of
        invoiceSnapshot.docs
    ) {
      const invoice =
        document.data();

      const invoiceIds =
        [
          invoice.projectId,
          invoice.projectFirestoreId,
          invoice.projectBusinessId,
        ]
          .filter(Boolean)
          .map(String);


      let matchedProjectId =
        "";

      for (
        const identifier of
          invoiceIds
      ) {
        const found =
          projectById.get(
            identifier
          );

        if (found) {
          matchedProjectId =
            found;

          break;
        }
      }


      /*
       * Legacy fallback:
       * only use project name when it
       * maps to exactly one project.
       */
      if (
        !matchedProjectId
      ) {
        const name =
          lower(
            invoice.projectName
          );

        const matches =
          name
            ? projectByName.get(
                name
              )
            : null;

        if (
          matches?.length === 1
        ) {
          matchedProjectId =
            matches[0];
        }
      }


      if (
        !matchedProjectId
      ) {
        unmatchedInvoices += 1;
      
        unmatchedInvoiceDetails.push({
          invoiceId:
            document.id,
      
          invoiceNumber:
            invoice.invoiceNumber ||
            "",
      
          projectId:
            invoice.projectId ||
            "",
      
          projectFirestoreId:
            invoice.projectFirestoreId ||
            "",
      
          projectBusinessId:
            invoice.projectBusinessId ||
            "",
      
          projectName:
            invoice.projectName ||
            "",
        });
      
        continue;
      }


      counts.set(
        matchedProjectId,
        (
          counts.get(
            matchedProjectId
          ) || 0
        ) + 1
      );

      matchedInvoices += 1;
    }


    /*
     * Firestore batch limit is 500.
     * Keep some margin.
     */
    const projects =
      projectSnapshot.docs;

    const BATCH_SIZE =
      400;

    let updatedProjects =
      0;


    for (
      let index = 0;
      index <
      projects.length;
      index +=
        BATCH_SIZE
    ) {
      const chunk =
        projects.slice(
          index,
          index +
            BATCH_SIZE
        );

      const batch =
        adminDb.batch();


      for (
        const document of
          chunk
      ) {
        const count =
          counts.get(
            document.id
          ) || 0;

        batch.set(
          document.ref,
          {
            billingInvoiceCount:
              count,

            billingHasInvoice:
              count > 0,
          },
          {
            merge: true,
          }
        );

        updatedProjects += 1;
      }


      await batch.commit();
    }


    return NextResponse.json({
      success: true,

      projects:
        projectSnapshot.size,

      invoices:
        invoiceSnapshot.size,

      matchedInvoices,

      unmatchedInvoices,

      unmatchedInvoiceDetails,

      updatedProjects,

      projectsWithInvoices:
        [...counts.values()]
          .filter(
            (count) =>
              count > 0
          )
          .length,

      projectsWithoutInvoices:
        [...counts.values()]
          .filter(
            (count) =>
              count === 0
          )
          .length,
    });
  } catch (error) {
    console.error(
      "Project invoice count backfill failed",
      error
    );

    const code =
      error?.message ||
      "BACKFILL_FAILED";

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