import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";


const number = (value) =>
  Number(value ?? 0) || 0;

const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


function validPayment(payment) {
  return ![
    "failed",
    "cancelled",
    "rejected",
    "void",
    "reversed",
  ].includes(
    lower(payment?.status)
  );
}


function normalizeProject(snapshot) {
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
      number(
        data.contractValue ||
          data.poAmount
      ),

    billingHasInvoice:
      Boolean(
        data.billingHasInvoice
      ),

    billingInvoiceCount:
      number(
        data.billingInvoiceCount
      ),
  };
}


function invoiceMatchesProject(
  invoice,
  project
) {
  const projectIds =
    new Set(
      [
        project.id,
        project.projectId,
      ]
        .filter(Boolean)
        .map(String)
    );

  const invoiceIds =
    [
      invoice.projectId,
      invoice.projectFirestoreId,
      invoice.projectBusinessId,
    ]
      .filter(Boolean)
      .map(String);

  if (
    invoiceIds.some(
      (id) =>
        projectIds.has(id)
    )
  ) {
    return true;
  }

  return Boolean(
    project.projectName &&
      invoice.projectName &&
      lower(project.projectName) ===
        lower(invoice.projectName)
  );
}


function paymentMatchesProject(
  payment,
  project
) {
  const projectIds =
    new Set(
      [
        project.id,
        project.projectId,
      ]
        .filter(Boolean)
        .map(String)
    );

  const paymentIds =
    [
      payment.projectId,
      payment.projectFirestoreId,
      payment.projectBusinessId,
    ]
      .filter(Boolean)
      .map(String);

  if (
    paymentIds.some(
      (id) =>
        projectIds.has(id)
    )
  ) {
    return true;
  }

  return Boolean(
    project.projectName &&
      payment.projectName &&
      lower(project.projectName) ===
        lower(payment.projectName)
  );
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


    const companyRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        );


    const projectSnapshot =
      await companyRef
        .collection(
          "Projectmanagement"
        )
        .where(
          "billingHasInvoice",
          "==",
          true
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
          "billingHasInvoice",
          "billingInvoiceCount"
        )
        .get();


    const projects =
      projectSnapshot.docs
        .map(
          normalizeProject
        )
        .filter(
          (project) =>
            lower(
              project.status
            ) !==
            "cancelled"
        );


    if (!projects.length) {
      return NextResponse.json({
        projects: [],
        count: 0,
      });
    }


    const [
      invoiceSnapshot,
      paymentSnapshot,
    ] =
      await Promise.all([
        companyRef
          .collection(
            "Invoices"
          )
          .select(
            "projectId",
            "projectFirestoreId",
            "projectBusinessId",
            "projectName",
            "invoiceStatus",
            "status",
            "taxableValue",
            "invoiceAmount",
            "receivable",
            "pendingAmount",
            "paidAmount",
            "isCreditNote",
            "documentType"
          )
          .get(),

        companyRef
          .collection(
            "Payments"
          )
          .select(
            "projectId",
            "projectFirestoreId",
            "projectBusinessId",
            "projectName",
            "amount",
            "status"
          )
          .get(),
      ]);


    const invoices =
      invoiceSnapshot.docs.map(
        (document) => ({
          id:
            document.id,
          ...document.data(),
        })
      );

    const payments =
      paymentSnapshot.docs.map(
        (document) => ({
          id:
            document.id,
          ...document.data(),
        })
      );


    const paidProjects =
      projects
        .map(
          (project) => {
            const projectInvoices =
              invoices.filter(
                (invoice) =>
                  invoiceMatchesProject(
                    invoice,
                    project
                  )
              );


            const issuedInvoices =
              projectInvoices.filter(
                (invoice) => {
                  const status =
                    lower(
                      invoice.invoiceStatus ||
                        invoice.status
                    );

                  const isCredit =
                    invoice.isCreditNote ===
                      true ||
                    lower(
                      invoice.documentType
                    ) ===
                      "credit_note";

                  return (
                    status !== "draft" &&
                    status !==
                      "cancelled" &&
                    !isCredit
                  );
                }
              );


            const creditNotes =
              projectInvoices.filter(
                (invoice) =>
                  invoice.isCreditNote ===
                    true ||
                  lower(
                    invoice.documentType
                  ) ===
                    "credit_note"
              );


            const billed =
              issuedInvoices.reduce(
                (
                  total,
                  invoice
                ) =>
                  total +
                  number(
                    invoice.taxableValue ??
                      invoice.invoiceAmount ??
                      invoice.receivable
                  ),
                0
              ) -
              creditNotes.reduce(
                (
                  total,
                  invoice
                ) =>
                  total +
                  number(
                    invoice.taxableValue ??
                      invoice.invoiceAmount ??
                      invoice.receivable
                  ),
                0
              );


            const invoiceOutstanding =
              issuedInvoices.reduce(
                (
                  total,
                  invoice
                ) =>
                  total +
                  number(
                    invoice.pendingAmount !=
                      null
                      ? invoice.pendingAmount
                      : Math.max(
                          0,
                          number(
                            invoice.receivable ??
                              invoice.invoiceAmount
                          ) -
                            number(
                              invoice.paidAmount
                            )
                        )
                  ),
                0
              );


            const creditOutstanding =
              creditNotes.reduce(
                (
                  total,
                  invoice
                ) =>
                  total +
                  number(
                    invoice.pendingAmount
                  ),
                0
              );


            const outstanding =
              Math.max(
                0,
                invoiceOutstanding -
                  creditOutstanding
              );


            const received =
              payments
                .filter(
                  (payment) =>
                    validPayment(
                      payment
                    ) &&
                    paymentMatchesProject(
                      payment,
                      project
                    )
                )
                .reduce(
                  (
                    total,
                    payment
                  ) =>
                    total +
                    number(
                      payment.amount
                    ),
                  0
                );


            const contract =
              number(
                project.contractValue
              );


            const remainingBillable =
              Math.max(
                0,
                contract -
                  billed
              );


            return {
              ...project,

              billedAmount:
                Math.max(
                  0,
                  billed
                ),

              receivedAmount:
                Math.max(
                  0,
                  received
                ),

              outstandingAmount:
                outstanding,

              pendingAmount:
                outstanding,

              remainingBillable,
            };
          }
        )
        .filter(
          (project) =>
            project.billedAmount >
              0.01 &&
            project.remainingBillable <=
              0.01 &&
            project.outstandingAmount <=
              0.01
        );


    return NextResponse.json({
      projects:
        paidProjects,

      count:
        paidProjects.length,
    });
  } catch (error) {
    console.error(
      "Fully paid projects read failed",
      error
    );

    const code =
      error?.message ||
      "PAID_PROJECTS_FAILED";

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