import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";


const INVALID_PAYMENT_STATUSES = new Set([
  "failed",
  "cancelled",
  "rejected",
  "void",
  "reversed",
]);

const PAGE_SIZE = 30;


const number = (value) =>
  Number(value ?? 0) || 0;


const money = (value) =>
  Math.round(
    (number(value) + Number.EPSILON) * 100
  ) / 100;


const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


function validDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
}


function parseDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value?.toDate === "function"
  ) {
    return value.toDate();
  }

  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}/.test(value)
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


function dateKey(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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


function todayKey() {
  return dateKey(
    new Date()
  );
}


function invoiceState(
  invoice,
  now = new Date()
) {
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

  let paymentStatus =
    lower(
      invoice.paymentStatus
    );

  if (
    ![
      "paid",
      "partial",
      "unpaid",
    ].includes(paymentStatus)
  ) {
    paymentStatus =
      pending === 0 &&
      total > 0
        ? "paid"
        : paid > 0
          ? "partial"
          : "unpaid";
  }

  const legacyStatus =
    lower(
      invoice.status
    );

  const invoiceStatus =
    lower(
      invoice.invoiceStatus
    ) ||
    (
      legacyStatus === "cancelled"
        ? "cancelled"
        : legacyStatus === "draft"
          ? "draft"
          : "issued"
    );

  const due =
    parseDate(
      invoice.dueDate
    );

  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const dueDay =
    due
      ? new Date(
          due.getFullYear(),
          due.getMonth(),
          due.getDate()
        )
      : null;

  const overdue =
    invoiceStatus === "issued" &&
    pending > 0 &&
    dueDay &&
    dueDay < today;

  const displayStatus =
    invoiceStatus === "cancelled"
      ? "cancelled"
      : invoiceStatus === "draft"
        ? "draft"
        : paymentStatus === "paid"
          ? "paid"
          : overdue
            ? "overdue"
            : paymentStatus === "partial"
              ? "partial"
              : "running";

  return {
    total,
    paid,
    pending,
    paymentStatus,
    invoiceStatus,
    overdue:
      Boolean(overdue),
    overdueAmount:
      overdue
        ? pending
        : 0,
    displayStatus,
  };
}


function normalizeInvoice(
  snapshot
) {
  const invoice = {
    id: snapshot.id,
    ...snapshot.data(),
  };

  return {
    ...invoice,
    ...invoiceState(
      invoice
    ),
  };
}


function buildDateQuery(
  collectionRef,
  field,
  from,
  to
) {
  let query =
    collectionRef;

  if (from) {
    query =
      query.where(
        field,
        ">=",
        from
      );
  }

  if (to) {
    query =
      query.where(
        field,
        "<=",
        to
      );
  }

  return query;
}


function isValidPayment(
  payment
) {
  return !INVALID_PAYMENT_STATUSES.has(
    lower(
      payment.status
    )
  );
}


function summarizeInvoices(
  invoices
) {
  const summary = {
    totalInvoiced: 0,
    outstanding: 0,
    overdue: 0,

    draft: 0,
    running: 0,
    partial: 0,
    paid: 0,
    overdueInvoices: 0,
    cancelled: 0,
  };

  for (
    const invoice of invoices
  ) {
    const state =
      invoiceState(
        invoice
      );

    if (
      state.invoiceStatus ===
      "issued"
    ) {
      summary.totalInvoiced =
        money(
          summary.totalInvoiced +
            state.total
        );

      summary.outstanding =
        money(
          summary.outstanding +
            state.pending
        );

      summary.overdue =
        money(
          summary.overdue +
            state.overdueAmount
        );
    }

    switch (
      state.displayStatus
    ) {
      case "draft":
        summary.draft += 1;
        break;

      case "running":
        summary.running += 1;
        break;

      case "partial":
        summary.partial += 1;
        break;

      case "paid":
        summary.paid += 1;
        break;

      case "overdue":
        summary.overdueInvoices += 1;
        break;

      case "cancelled":
        summary.cancelled += 1;
        break;

      default:
        break;
    }
  }

  return summary;
}


function lastDayOfMonthKey(
  value
) {
  const [
    year,
    month,
  ] = value
    .split("-")
    .map(Number);

  return dateKey(
    new Date(
      year,
      month,
      0
    )
  );
}


function fullMonthRange(
  from,
  to
) {
  /*
   * No date filter = All Time.
   * Monthly summaries can handle it.
   */
  if (
    !from &&
    !to
  ) {
    return true;
  }

  /*
   * Partial/open ranges use the
   * legacy exact calculation.
   */
  if (
    !from ||
    !to
  ) {
    return false;
  }

  if (
    from.slice(8, 10) !==
    "01"
  ) {
    return false;
  }

  return (
    to ===
    lastDayOfMonthKey(
      to
    )
  );
}


function monthKeysBetween(
  from,
  to
) {
  if (
    !from ||
    !to
  ) {
    return [];
  }

  const start =
    parseDate(from);

  const end =
    parseDate(to);

  if (
    !start ||
    !end
  ) {
    return [];
  }

  const cursor =
    new Date(
      start.getFullYear(),
      start.getMonth(),
      1
    );

  const last =
    new Date(
      end.getFullYear(),
      end.getMonth(),
      1
    );

  const result = [];

  while (
    cursor <= last
  ) {
    result.push(
      `${cursor.getFullYear()}-${String(
        cursor.getMonth() + 1
      ).padStart(2, "0")}`
    );

    cursor.setMonth(
      cursor.getMonth() + 1
    );
  }

  return result;
}


function invoiceWithinRange(
  invoice,
  from,
  to
) {
  const key =
    typeof invoice.invoiceDate ===
    "string"
      ? invoice.invoiceDate.slice(
          0,
          10
        )
      : invoice.invoiceDate
        ? dateKey(
            parseDate(
              invoice.invoiceDate
            )
          )
        : "";

  if (!key) {
    return false;
  }

  if (
    from &&
    key < from
  ) {
    return false;
  }

  if (
    to &&
    key > to
  ) {
    return false;
  }

  return true;
}


async function readMonthlySummaries({
  companyRef,
  from,
  to,
}) {
  const collection =
    companyRef.collection(
      "BillingMonthlySummaries"
    );

  /*
   * All Time:
   * read only one document per
   * historical billing month.
   */
  if (
    !from &&
    !to
  ) {
    const snapshot =
      await collection.get();

    return snapshot.docs.map(
      (document) =>
        document.data()
    );
  }

  const months =
    monthKeysBetween(
      from,
      to
    );

  if (!months.length) {
    return [];
  }

  const snapshots =
    await Promise.all(
      months.map(
        (month) =>
          collection
            .doc(month)
            .get()
      )
    );

  return snapshots
    .filter(
      (snapshot) =>
        snapshot.exists
    )
    .map(
      (snapshot) =>
        snapshot.data()
    );
}


function combineMonthlySummaries(
  summaries
) {
  const result = {
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

  for (
    const summary of summaries
  ) {
    result.invoiceCount +=
      number(
        summary.invoiceCount
      );

    result.draftCount +=
      number(
        summary.draftCount
      );

    result.issuedCount +=
      number(
        summary.issuedCount
      );

    result.cancelledCount +=
      number(
        summary.cancelledCount
      );

    result.paidCount +=
      number(
        summary.paidCount
      );

    result.partialCount +=
      number(
        summary.partialCount
      );

    result.unpaidCount +=
      number(
        summary.unpaidCount
      );

    result.totalInvoiced =
      money(
        result.totalInvoiced +
          number(
            summary.totalInvoiced
          )
      );

    result.outstanding =
      money(
        result.outstanding +
          number(
            summary.outstanding
          )
      );

    result.paymentCount +=
      number(
        summary.paymentCount
      );

    result.totalReceived =
      money(
        result.totalReceived +
          number(
            summary.totalReceived
          )
      );
  }

  return result;
}


async function readLiveOverdue({
  invoiceCollection,
  from,
  to,
}) {
  /*
   * Overdue cannot be trusted from a
   * stored monthly summary because it
   * changes automatically as dates pass.
   *
   * So only potentially overdue invoices
   * are read live.
   */

  const today =
    todayKey();

  const snapshot =
    await invoiceCollection
      .where(
        "dueDate",
        "<",
        today
      )
      .select(
        "invoiceDate",
        "dueDate",

        "invoiceStatus",
        "status",

        "paymentStatus",
        "paidAmount",
        "pendingAmount",

        "invoiceAmount",
        "receivable"
      )
      .get();

  let overdueAmount = 0;
  let overdueCount = 0;

  let overduePartial = 0;
  let overdueUnpaid = 0;

  for (
    const document of
    snapshot.docs
  ) {
    const invoice =
      document.data();

    if (
      !invoiceWithinRange(
        invoice,
        from,
        to
      )
    ) {
      continue;
    }

    const state =
      invoiceState(
        invoice
      );

    if (
      !state.overdue
    ) {
      continue;
    }

    overdueCount += 1;

    overdueAmount =
      money(
        overdueAmount +
          state.pending
      );

    if (
      state.paymentStatus ===
      "partial"
    ) {
      overduePartial += 1;
    } else {
      overdueUnpaid += 1;
    }
  }

  return {
    overdueAmount,
    overdueCount,
    overduePartial,
    overdueUnpaid,
  };
}


async function readInvoicePage({
  invoiceCollection,
  from,
  to,
}) {
  let query =
    buildDateQuery(
      invoiceCollection,
      "invoiceDate",
      from,
      to
    );

  query =
    query
      .orderBy(
        "invoiceDate",
        "desc"
      )
      .limit(
        PAGE_SIZE
      )
      .select(
        "invoiceNumber",
        "invoiceDate",
        "dueDate",

        "clientId",
        "clientName",
        "clientSnapshot",

        "projectId",
        "projectFirestoreId",
        "projectName",

        "poNumber",

        "invoiceAmount",
        "receivable",

        "paidAmount",
        "pendingAmount",
        "paymentStatus",

        "invoiceStatus",
        "status",

        "type",

        "createdAt",
        "updatedAt"
      );

  const snapshot =
    await query.get();

  return snapshot.docs.map(
    normalizeInvoice
  );
}


async function legacyExactDashboard({
  invoiceCollection,
  paymentCollection,
  from,
  to,
}) {
  /*
   * Used only for custom date ranges
   * that start/end in the middle of
   * a month.
   *
   * This preserves exact accounting
   * without pretending a whole monthly
   * summary belongs to a partial month.
   */

  const [
    invoiceSnapshot,
    paymentSnapshot,
  ] =
    await Promise.all([
      buildDateQuery(
        invoiceCollection,
        "invoiceDate",
        from,
        to
      )
        .select(
          "invoiceNumber",
          "invoiceDate",
          "dueDate",

          "clientId",
          "clientName",
          "clientSnapshot",

          "projectId",
          "projectFirestoreId",
          "projectName",

          "poNumber",

          "invoiceAmount",
          "receivable",

          "paidAmount",
          "pendingAmount",
          "paymentStatus",

          "invoiceStatus",
          "status",

          "type",

          "createdAt",
          "updatedAt"
        )
        .get(),

      buildDateQuery(
        paymentCollection,
        "paymentDate",
        from,
        to
      )
        .select(
          "amount",
          "status",
          "paymentDate"
        )
        .get(),
    ]);

  const invoices =
    invoiceSnapshot.docs.map(
      normalizeInvoice
    );

  invoices.sort(
    (a, b) =>
      String(
        b.invoiceDate || ""
      ).localeCompare(
        String(
          a.invoiceDate || ""
        )
      )
  );

  const invoiceSummary =
    summarizeInvoices(
      invoices
    );

  const totalReceived =
    money(
      paymentSnapshot.docs.reduce(
        (
          total,
          document
        ) => {
          const payment =
            document.data();

          if (
            !isValidPayment(
              payment
            )
          ) {
            return total;
          }

          return (
            total +
            number(
              payment.amount
            )
          );
        },
        0
      )
    );

  return {
    summary: {
      totalInvoiced:
        invoiceSummary.totalInvoiced,

      totalReceived,

      outstanding:
        invoiceSummary.outstanding,

      overdue:
        invoiceSummary.overdue,

      collectionRate:
        invoiceSummary.totalInvoiced
          ? (
              totalReceived /
              invoiceSummary.totalInvoiced
            ) * 100
          : 0,
    },

    statusCounts: {
      draft:
        invoiceSummary.draft,

      running:
        invoiceSummary.running,

      partial:
        invoiceSummary.partial,

      paid:
        invoiceSummary.paid,

      overdue:
        invoiceSummary.overdueInvoices,

      cancelled:
        invoiceSummary.cancelled,
    },

    invoices:
      invoices.slice(
        0,
        PAGE_SIZE
      ),

    totalCount:
      invoices.length,

    hasMore:
      invoices.length >
      PAGE_SIZE,

    source:
      "exact-custom-range",
  };
}


function jsonError(error) {
  const code =
    error?.message ||
    "BILLING_DASHBOARD_FAILED";

  const status =
    code === "UNAUTHENTICATED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : [
            "INVALID_FROM_DATE",
            "INVALID_TO_DATE",
            "INVALID_DATE_RANGE",
          ].includes(code)
          ? 400
          : 500;

  return NextResponse.json(
    {
      error: code,
    },
    {
      status,
    }
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

    const {
      searchParams,
    } =
      new URL(
        request.url
      );

    const from =
      searchParams.get(
        "from"
      ) || "";

    const to =
      searchParams.get(
        "to"
      ) || "";

    if (
      from &&
      !validDateString(
        from
      )
    ) {
      throw new Error(
        "INVALID_FROM_DATE"
      );
    }

    if (
      to &&
      !validDateString(
        to
      )
    ) {
      throw new Error(
        "INVALID_TO_DATE"
      );
    }

    if (
      from &&
      to &&
      from > to
    ) {
      throw new Error(
        "INVALID_DATE_RANGE"
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

    const invoiceCollection =
      companyRef.collection(
        "Invoices"
      );

    const paymentCollection =
      companyRef.collection(
        "Payments"
      );

    /*
     * Partial custom range:
     * use exact legacy calculation.
     */
    if (
      !fullMonthRange(
        from,
        to
      )
    ) {
      const exact =
        await legacyExactDashboard({
          invoiceCollection,
          paymentCollection,
          from,
          to,
        });

      return NextResponse.json({
        period: {
          from:
            from || null,

          to:
            to || null,
        },

        ...exact,
      });
    }

    /*
     * Optimized path:
     *
     * 1. Monthly summaries
     * 2. Only overdue invoices live
     * 3. Only first 30 invoice rows
     */

    const [
      monthlyDocuments,
      overdue,
      invoices,
    ] =
      await Promise.all([
        readMonthlySummaries({
          companyRef,
          from,
          to,
        }),

        readLiveOverdue({
          invoiceCollection,
          from,
          to,
        }),

        readInvoicePage({
          invoiceCollection,
          from,
          to,
        }),
      ]);

    const monthly =
      combineMonthlySummaries(
        monthlyDocuments
      );

    /*
     * Monthly counts store the stable
     * payment state.
     *
     * Overdue takes precedence in the UI,
     * so overdue invoices must be removed
     * from partial/running.
     */

    const running =
      Math.max(
        0,
        monthly.unpaidCount -
          overdue.overdueUnpaid
      );

    const partial =
      Math.max(
        0,
        monthly.partialCount -
          overdue.overduePartial
      );

    const collectionRate =
      monthly.totalInvoiced
        ? (
            monthly.totalReceived /
            monthly.totalInvoiced
          ) * 100
        : 0;

    return NextResponse.json({
      period: {
        from:
          from || null,

        to:
          to || null,
      },

      summary: {
        totalInvoiced:
          monthly.totalInvoiced,

        totalReceived:
          monthly.totalReceived,

        outstanding:
          monthly.outstanding,

        overdue:
          overdue.overdueAmount,

        collectionRate,
      },

      statusCounts: {
        draft:
          monthly.draftCount,

        running,

        partial,

        paid:
          monthly.paidCount,

        overdue:
          overdue.overdueCount,

        cancelled:
          monthly.cancelledCount,
      },

      invoices,

      totalCount:
        monthly.invoiceCount,

      hasMore:
        monthly.invoiceCount >
        invoices.length,

      source:
        "monthly-summary",
    });
  } catch (error) {
    console.error(
      "Billing dashboard read failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(
      error
    );
  }
}