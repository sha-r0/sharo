"use strict";

const crypto = require("crypto");
const { FieldValue } = require("firebase-admin/firestore");

const INVALID_PAYMENT_STATUSES = new Set([
  "failed",
  "cancelled",
  "rejected",
  "void",
  "reversed",
]);

const number = (value) =>
  Number(value ?? 0) || 0;

const roundMoney = (value) =>
  Math.round(
    (number(value) + Number.EPSILON) * 100
  ) / 100;

const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


function dateValue(value) {
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
    dateValue(value);

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
      invoice?.invoiceStatus
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
    lower(
      invoice?.status
    );

  if (
    legacy === "draft"
  ) {
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
      invoice?.paymentStatus
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
      invoice?.receivable ??
        invoice?.invoiceAmount
    );

  const paid =
    Math.max(
      0,
      number(
        invoice?.paidAmount
      )
    );

  const pending =
    invoice?.pendingAmount !=
    null
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

  if (
    paid > 0
  ) {
    return "partial";
  }

  return "unpaid";
}

function invoiceProjectId(
  invoice
) {
  if (!invoice) {
    return "";
  }

  return String(
    invoice.projectId ||
      invoice.projectFirestoreId ||
      ""
  ).trim();
}


function invoiceContribution(
  invoice
) {
  if (!invoice) {
    return null;
  }

  const month =
    monthKey(
      invoice.invoiceDate ||
        invoice.createdAt
    );

  if (!month) {
    return null;
  }

  const status =
    invoiceStatus(
      invoice
    );

  const payStatus =
    paymentStatus(
      invoice
    );

  const total =
    roundMoney(
      invoice.receivable ??
        invoice.invoiceAmount
    );

  const pending =
    roundMoney(
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

  const issued =
    status === "issued";

  return {
    month,

    invoiceCount: 1,

    draftCount:
      status === "draft"
        ? 1
        : 0,

    issuedCount:
      issued
        ? 1
        : 0,

    cancelledCount:
      status === "cancelled"
        ? 1
        : 0,

    paidCount:
      issued &&
      payStatus === "paid"
        ? 1
        : 0,

    partialCount:
      issued &&
      payStatus === "partial"
        ? 1
        : 0,

    unpaidCount:
      issued &&
      payStatus === "unpaid"
        ? 1
        : 0,

    totalInvoiced:
      issued
        ? total
        : 0,

    outstanding:
      issued
        ? pending
        : 0,
  };
}


function validPayment(
  payment
) {
  return (
    payment &&
    !INVALID_PAYMENT_STATUSES.has(
      lower(payment.status)
    )
  );
}


function paymentContribution(
  payment
) {
  if (
    !payment ||
    !validPayment(payment)
  ) {
    return null;
  }

  const month =
    monthKey(
      payment.paymentDate ||
        payment.createdAt
    );

  if (!month) {
    return null;
  }

  return {
    month,

    paymentCount: 1,

    totalReceived:
      roundMoney(
        payment.amount
      ),
  };
}


const INVOICE_FIELDS = [
  "invoiceCount",
  "draftCount",
  "issuedCount",
  "cancelledCount",
  "paidCount",
  "partialCount",
  "unpaidCount",
  "totalInvoiced",
  "outstanding",
];

const PAYMENT_FIELDS = [
  "paymentCount",
  "totalReceived",
];


function emptySummary(
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


function contributionDelta(
  before,
  after,
  fields
) {
  const delta = {};

  for (
    const field of fields
  ) {
    delta[field] =
      roundMoney(
        number(
          after?.[field]
        ) -
          number(
            before?.[field]
          )
      );
  }

  return delta;
}


function applyDelta(
  current,
  delta
) {
  const next = {
    ...current,
  };

  for (
    const [
      field,
      value,
    ] of Object.entries(
      delta
    )
  ) {
    next[field] =
      roundMoney(
        Math.max(
          0,
          number(
            current?.[field]
          ) +
            number(value)
        )
      );
  }

  return next;
}


function eventDocumentId(
  eventId
) {
  return crypto
    .createHash("sha256")
    .update(
      String(eventId || "")
    )
    .digest("hex");
}


async function updateMonth(
  transaction,
  companyRef,
  companyId,
  month,
  delta
) {
  if (!month) {
    return;
  }

  const summaryRef =
    companyRef
      .collection(
        "BillingMonthlySummaries"
      )
      .doc(month);

  const snapshot =
    await transaction.get(
      summaryRef
    );

  const current =
    snapshot.exists
      ? snapshot.data()
      : emptySummary(
          companyId,
          month
        );

  const next =
    applyDelta(
      current,
      delta
    );

  transaction.set(
    summaryRef,
    {
      ...next,

      companyId,
      month,

      updatedAt:
        FieldValue.serverTimestamp(),
    },
    {
      merge: true,
    }
  );
}


async function handleContributionChange({
    db,
    companyId,
    eventId,
    eventType,
    before,
    after,
    fields,
  }) {
    const companyRef = db
      .collection("Companies")
      .doc(companyId);
  
    const eventRef = companyRef
      .collection("BillingSummaryEvents")
      .doc(eventDocumentId(eventId));
  
    await db.runTransaction(async (transaction) => {
      const eventSnapshot =
        await transaction.get(eventRef);
  
      if (eventSnapshot.exists) {
        return;
      }
  
      const beforeMonth =
        before?.month || "";
  
      const afterMonth =
        after?.month || "";
  
      /*
       * IMPORTANT:
       * Firestore requires ALL transaction reads
       * to happen before ANY transaction write.
       */
  
      const months = [
        ...new Set(
          [
            beforeMonth,
            afterMonth,
          ].filter(Boolean)
        ),
      ];
  
      const summaryRefs =
        months.map((month) => ({
          month,
          ref: companyRef
            .collection(
              "BillingMonthlySummaries"
            )
            .doc(month),
        }));
  
      const summarySnapshots =
        await Promise.all(
          summaryRefs.map(({ ref }) =>
            transaction.get(ref)
          )
        );
  
      const currentByMonth =
        new Map();
  
      summaryRefs.forEach(
        ({ month }, index) => {
          const snapshot =
            summarySnapshots[index];
  
          currentByMonth.set(
            month,
            snapshot.exists
              ? snapshot.data()
              : emptySummary(
                  companyId,
                  month
                )
          );
        }
      );
  
      const deltasByMonth =
        new Map();
  
      const addDelta = (
        month,
        delta
      ) => {
        if (!month) {
          return;
        }
  
        const current =
          deltasByMonth.get(
            month
          ) || {};
  
        const merged = {
          ...current,
        };
  
        for (
          const field of fields
        ) {
          merged[field] =
            roundMoney(
              number(
                current[field]
              ) +
                number(
                  delta[field]
                )
            );
        }
  
        deltasByMonth.set(
          month,
          merged
        );
      };
  
      if (
        beforeMonth &&
        beforeMonth === afterMonth
      ) {
        addDelta(
          beforeMonth,
          contributionDelta(
            before,
            after,
            fields
          )
        );
      } else {
        if (beforeMonth) {
          addDelta(
            beforeMonth,
            contributionDelta(
              before,
              null,
              fields
            )
          );
        }
  
        if (afterMonth) {
          addDelta(
            afterMonth,
            contributionDelta(
              null,
              after,
              fields
            )
          );
        }
      }
  
      /*
       * All reads are complete.
       * Writes can safely start now.
       */
  
      for (
        const [
          month,
          delta,
        ] of deltasByMonth.entries()
      ) {
        const summaryRef =
          companyRef
            .collection(
              "BillingMonthlySummaries"
            )
            .doc(month);
  
        const current =
          currentByMonth.get(
            month
          ) ||
          emptySummary(
            companyId,
            month
          );
  
        const next =
          applyDelta(
            current,
            delta
          );
  
        transaction.set(
          summaryRef,
          {
            ...next,
  
            companyId,
            month,
  
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {
            merge: true,
          }
        );
      }
  
      transaction.set(
        eventRef,
        {
          companyId,
  
          eventType,
  
          eventId:
            String(
              eventId || ""
            ),
  
          createdAt:
            FieldValue.serverTimestamp(),
        }
      );
    });
  }

  async function syncProjectInvoiceCount({
    db,
    companyId,
    eventId,
    before,
    after,
  }) {
    const beforeProjectId =
      invoiceProjectId(before);
  
    const afterProjectId =
      invoiceProjectId(after);
  
    if (
      beforeProjectId &&
      beforeProjectId === afterProjectId
    ) {
      return;
    }
  
    const companyRef =
      db
        .collection("Companies")
        .doc(companyId);
  
    const eventRef =
      companyRef
        .collection(
          "BillingProjectSummaryEvents"
        )
        .doc(
          eventDocumentId(eventId)
        );
  
    await db.runTransaction(
      async (transaction) => {
        const eventSnapshot =
          await transaction.get(
            eventRef
          );
  
        if (eventSnapshot.exists) {
          return;
        }
  
        const oldProjectRef =
          beforeProjectId
            ? companyRef
                .collection(
                  "Projectmanagement"
                )
                .doc(
                  beforeProjectId
                )
            : null;
  
        const newProjectRef =
          afterProjectId
            ? companyRef
                .collection(
                  "Projectmanagement"
                )
                .doc(
                  afterProjectId
                )
            : null;
  
        const refs =
          [
            oldProjectRef,
            newProjectRef,
          ].filter(Boolean);
  
        const snapshots =
          await Promise.all(
            refs.map((ref) =>
              transaction.get(ref)
            )
          );
  
        let index = 0;
  
        if (oldProjectRef) {
          const snapshot =
            snapshots[index++];
  
          if (snapshot.exists) {
            const currentCount =
              Math.max(
                0,
                number(
                  snapshot.data()
                    ?.billingInvoiceCount
                )
              );
  
            const nextCount =
              Math.max(
                0,
                currentCount - 1
              );
  
            transaction.set(
              oldProjectRef,
              {
                billingInvoiceCount:
                  nextCount,
  
                billingHasInvoice:
                  nextCount > 0,
  
                billingUpdatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          }
        }
  
        if (newProjectRef) {
          const snapshot =
            snapshots[index++];
  
          if (snapshot.exists) {
            const currentCount =
              Math.max(
                0,
                number(
                  snapshot.data()
                    ?.billingInvoiceCount
                )
              );
  
            const nextCount =
              currentCount + 1;
  
            transaction.set(
              newProjectRef,
              {
                billingInvoiceCount:
                  nextCount,
  
                billingHasInvoice:
                  true,
  
                billingUpdatedAt:
                  FieldValue.serverTimestamp(),
              },
              {
                merge: true,
              }
            );
          }
        }
  
        transaction.set(
          eventRef,
          {
            companyId,
            eventId:
              String(
                eventId || ""
              ),
            createdAt:
              FieldValue.serverTimestamp(),
          }
        );
      }
    );
  }


  async function syncInvoiceSummary({
    db,
    companyId,
    eventId,
    before,
    after,
  }) {
    await handleContributionChange({
      db,
      companyId,
      eventId,
      eventType:
        "invoice",
  
      before:
        invoiceContribution(
          before
        ),
  
      after:
        invoiceContribution(
          after
        ),
  
      fields:
        INVOICE_FIELDS,
    });
  
    await syncProjectInvoiceCount({
      db,
      companyId,
      eventId,
      before,
      after,
    });
  }


async function syncPaymentSummary({
  db,
  companyId,
  eventId,
  before,
  after,
}) {
  return handleContributionChange({
    db,
    companyId,
    eventId,
    eventType:
      "payment",

    before:
      paymentContribution(
        before
      ),

    after:
      paymentContribution(
        after
      ),

    fields:
      PAYMENT_FIELDS,
  });
}


module.exports = {
  monthKey,
  invoiceContribution,
  paymentContribution,
  emptySummary,
  syncInvoiceSummary,
  syncPaymentSummary,
};