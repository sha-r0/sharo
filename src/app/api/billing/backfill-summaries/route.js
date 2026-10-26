import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
} from "@/lib/server/authorizeCompanyRequest";


const INVALID_PAYMENT_STATUSES =
  new Set([
    "failed",
    "cancelled",
    "rejected",
    "void",
    "reversed",
  ]);


const number = (value) =>
  Number(value ?? 0) || 0;


const money = (value) =>
  Math.round(
    (
      number(value) +
      Number.EPSILON
    ) * 100
  ) / 100;


const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


function parseDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(
      value
    )
  ) {
    const [
      year,
      month,
      day,
    ] = value
      .slice(0, 10)
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}


function monthKey(value) {
  const date =
    parseDate(value);

  if (!date) {
    return "";
  }

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}


function invoiceStatus(invoice) {
  const explicit =
    lower(
      invoice.invoiceStatus
    );

  if (
    [
      "draft",
      "issued",
      "cancelled",
    ].includes(explicit)
  ) {
    return explicit;
  }

  const legacy =
    lower(invoice.status);

  if (legacy === "draft") {
    return "draft";
  }

  if (
    legacy === "cancelled"
  ) {
    return "cancelled";
  }

  return "issued";
}


function paymentStatus(invoice) {
  const stored =
    lower(
      invoice.paymentStatus
    );

  if (
    [
      "paid",
      "partial",
      "unpaid",
    ].includes(stored)
  ) {
    return stored;
  }

  const total =
    number(
      invoice.receivable ??
        invoice.invoiceAmount
    );

  const paid =
    Math.max(
      0,
      number(
        invoice.paidAmount
      )
    );

  const pending =
    invoice.pendingAmount != null
      ? Math.max(
          0,
          number(
            invoice.pendingAmount
          )
        )
      : Math.max(
          0,
          total - paid
        );

  if (
    pending === 0 &&
    total > 0
  ) {
    return "paid";
  }

  if (paid > 0) {
    return "partial";
  }

  return "unpaid";
}


function emptyMonth(
  companyId,
  month
) {
  return {
    companyId,
    month,

    invoiceCount: 0,

    draftCount: 0,
    issuedCount: 0,
    cancelledCount: 0,

    paidCount: 0,
    partialCount: 0,
    unpaidCount: 0,

    totalInvoiced: 0,
    outstanding: 0,

    paymentCount: 0,
    totalReceived: 0,
  };
}


function getMonth(
  summaries,
  companyId,
  month
) {
  if (
    !summaries.has(month)
  ) {
    summaries.set(
      month,
      emptyMonth(
        companyId,
        month
      )
    );
  }

  return summaries.get(
    month
  );
}


function addInvoice(
  summaries,
  companyId,
  invoice
) {
  const month =
    monthKey(
      invoice.invoiceDate ||
        invoice.createdAt
    );

  if (!month) {
    return;
  }

  const summary =
    getMonth(
      summaries,
      companyId,
      month
    );

  const status =
    invoiceStatus(
      invoice
    );

  const payStatus =
    paymentStatus(
      invoice
    );

  const total =
    money(
      invoice.receivable ??
        invoice.invoiceAmount
    );

  const pending =
    money(
      invoice.pendingAmount != null
        ? invoice.pendingAmount
        : Math.max(
            0,
            total -
              number(
                invoice.paidAmount
              )
          )
    );

  summary.invoiceCount += 1;

  if (
    status === "draft"
  ) {
    summary.draftCount += 1;
    return;
  }

  if (
    status === "cancelled"
  ) {
    summary.cancelledCount += 1;
    return;
  }

  summary.issuedCount += 1;

  summary.totalInvoiced =
    money(
      summary.totalInvoiced +
        total
    );

  summary.outstanding =
    money(
      summary.outstanding +
        pending
    );

  if (
    payStatus === "paid"
  ) {
    summary.paidCount += 1;
  } else if (
    payStatus === "partial"
  ) {
    summary.partialCount += 1;
  } else {
    summary.unpaidCount += 1;
  }
}


function addPayment(
  summaries,
  companyId,
  payment
) {
  if (
    INVALID_PAYMENT_STATUSES.has(
      lower(payment.status)
    )
  ) {
    return;
  }

  const month =
    monthKey(
      payment.paymentDate ||
        payment.createdAt
    );

  if (!month) {
    return;
  }

  const summary =
    getMonth(
      summaries,
      companyId,
      month
    );

  summary.paymentCount += 1;

  summary.totalReceived =
    money(
      summary.totalReceived +
        number(
          payment.amount
        )
    );
}


export async function POST(
  request
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    /*
     * Backfill is intentionally
     * OWNER-ONLY.
     */
    if (!context?.isOwner) {
      return NextResponse.json(
        {
          error:
            "OWNER_REQUIRED",
        },
        {
          status: 403,
        }
      );
    }

    const companyId =
      context.companyId;

    const companyRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(companyId);

    const [
      invoiceSnapshot,
      paymentSnapshot,
    ] =
      await Promise.all([
        companyRef
          .collection(
            "Invoices"
          )
          .get(),

        companyRef
          .collection(
            "Payments"
          )
          .get(),
      ]);

    const summaries =
      new Map();

    for (
      const document of
      invoiceSnapshot.docs
    ) {
      addInvoice(
        summaries,
        companyId,
        document.data()
      );
    }

    for (
      const document of
      paymentSnapshot.docs
    ) {
      addPayment(
        summaries,
        companyId,
        document.data()
      );
    }

    /*
     * Delete old summary docs first so
     * rerunning the backfill produces an
     * exact rebuild rather than merging
     * stale months.
     */

    const existingSummarySnapshot =
      await companyRef
        .collection(
          "BillingMonthlySummaries"
        )
        .get();

    const operations = [];

    for (
      const document of
      existingSummarySnapshot.docs
    ) {
      operations.push({
        type: "delete",
        ref: document.ref,
      });
    }

    for (
      const [
        month,
        summary,
      ] of summaries.entries()
    ) {
      operations.push({
        type: "set",

        ref: companyRef
          .collection(
            "BillingMonthlySummaries"
          )
          .doc(month),

        data: {
          ...summary,

          rebuiltAt:
            new Date(),
        },
      });
    }

    /*
     * Firestore batches support max
     * 500 writes. Use 400 to leave
     * comfortable room.
     */

    const BATCH_SIZE = 400;

    for (
      let index = 0;
      index <
      operations.length;
      index += BATCH_SIZE
    ) {
      const batch =
        adminDb.batch();

      for (
        const operation of
        operations.slice(
          index,
          index +
            BATCH_SIZE
        )
      ) {
        if (
          operation.type ===
          "delete"
        ) {
          batch.delete(
            operation.ref
          );
        } else {
          batch.set(
            operation.ref,
            operation.data
          );
        }
      }

      await batch.commit();
    }

    return NextResponse.json({
      ok: true,

      companyId,

      invoices:
        invoiceSnapshot.size,

      payments:
        paymentSnapshot.size,

      months:
        summaries.size,

      summaries:
        [...summaries.values()]
          .sort(
            (a, b) =>
              a.month.localeCompare(
                b.month
              )
          ),
    });
  } catch (error) {
    console.error(
      "Billing summary backfill failed",
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
            : 500,
      }
    );
  }
}