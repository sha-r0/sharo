import ProjectCostService from "../../projects/services/ProjectCostService.js";
import {
  invoiceLifecycle,
  validPayment,
} from "./InvoiceLifecycleService";
import {
  toDate,
} from "./ReminderService.js";


const number = (value) =>
  Number(value ?? 0) || 0;


const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();


const dateKey = (value) => {
  const date =
    toDate(value);

  return date
    ? `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`
    : "";
};


export default class BillingAnalyticsService {
  static analyze(data) {
    const invoices =
      (data.invoices || []).map(
        (invoice) => ({
          ...invoice,

          ...invoiceLifecycle(
            invoice,
            data.payments || []
          ),
        })
      );


    //////////////////////////////////////////////////////
    // PROJECT BILLING
    //////////////////////////////////////////////////////

    const projects =
      (data.projects || [])
        .filter((project) =>
          [
            "completed",
            "cancelled",
          ].includes(
            lower(project.status)
          )
        )
        .map((project) => {
          const ids =
            new Set(
              [
                project.id,
                project.projectId,
              ]
                .filter(Boolean)
                .map(String)
            );


          const matches = (
            item
          ) => {
            const itemIds =
              [
                item.projectId,
                item.projectFirestoreId,
              ]
                .filter(Boolean)
                .map(String);

            const idMatch =
              itemIds.some(
                (id) =>
                  ids.has(id)
              );

            const nameMatch =
              item.projectName &&
              project.projectName &&
              lower(
                item.projectName
              ) ===
              lower(
                project.projectName
              );

            return (
              idMatch ||
              nameMatch
            );
          };


          const projectInvoices =
            invoices.filter(
              matches
            );

          const hasInvoiceHistory =
            projectInvoices.length > 0;


          const projectPayments =
            (data.payments || [])
              .filter(
                matches
              )
              .filter(
                validPayment
              );


          const costs =
            ProjectCostService.calculate({
              project,

              expenses:
                (
                  data.expenses ||
                  []
                ).filter(
                  matches
                ),

              workLogs:
                (
                  data.workLogs ||
                  []
                ).filter(
                  matches
                ),

              vendorPayments:
                (
                  data.vendorPayments ||
                  []
                ).filter(
                  matches
                ),
            });


          const issued =
            projectInvoices.filter(
              (item) =>
                item.invoiceStatus ===
                "issued" &&
                !lower(
                  item.type
                ).includes(
                  "credit"
                )
            );


          const credits =
            projectInvoices.filter(
              (item) =>
                item.invoiceStatus ===
                "issued" &&
                lower(
                  item.type
                ).includes(
                  "credit"
                )
            );


          /*
           * Project billed value.
           *
           * Keep existing behaviour:
           * taxable value first,
           * otherwise invoice amount.
           */
          const billed =
            issued.reduce(
              (
                sum,
                item
              ) =>
                sum +
                number(
                  item.taxableValue ||
                  item.invoiceAmount
                ),
              0
            ) -
            credits.reduce(
              (
                sum,
                item
              ) =>
                sum +
                number(
                  item.taxableValue ||
                  item.invoiceAmount
                ),
              0
            );


          /*
           * Actual valid payment
           * transactions received against
           * this project.
           */
          const received =
            projectPayments.reduce(
              (
                sum,
                item
              ) =>
                sum +
                number(
                  item.amount
                ),
              0
            );


          /*
           * Actual outstanding balance
           * from invoice lifecycle.
           *
           * This is better than:
           * contract - received
           *
           * because invoice receivable
           * can differ from contract value.
           */
          const invoiceOutstanding =
            issued.reduce(
              (
                sum,
                item
              ) =>
                sum +
                number(
                  item.pending
                ),
              0
            );


          const creditOutstanding =
            credits.reduce(
              (
                sum,
                item
              ) =>
                sum +
                number(
                  item.pending
                ),
              0
            );


          const outstandingAmount =
            Math.max(
              0,
              invoiceOutstanding -
              creditOutstanding
            );


          const contract =
            number(
              project.contractValue ||
              project.poAmount
            );


          const remainingBillable =
            Math.max(
              0,
              contract - billed
            );


          const billingStatus =
            lower(
              project.status
            ) === "cancelled"
              ? "cancelled"
              : billed <= 0
                ? "ready"
                : billed + 0.01 <
                  contract
                  ? "partial"
                  : "fully billed";


          return {
            ...project,

            costs,

            invoices:
              projectInvoices,

            payments:
              projectPayments,

              hasInvoiceHistory,

            contractValue:
              contract,

            billedAmount:
              billed,

            remainingBillable,

            receivedAmount:
              received,

            outstandingAmount,

            /*
             * Keep this temporarily for
             * compatibility with any old
             * UI that still reads
             * pendingAmount.
             */
            pendingAmount:
              outstandingAmount,

            billingStatus,

            completionDate:
              project.completedAt ||
              project.updatedAt ||
              project.endDate,
          };
        });


    //////////////////////////////////////////////////////
    // COMPANY BILLING SUMMARY
    //////////////////////////////////////////////////////

    const successfulPayments =
      (data.payments || [])
        .filter(
          validPayment
        );


    const issuedInvoices =
      invoices.filter(
        (item) =>
          item.invoiceStatus ===
          "issued"
      );


    const totalInvoiced =
      issuedInvoices.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item.receivable ||
            item.invoiceAmount
          ),
        0
      );


    const collected =
      successfulPayments.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item.amount
          ),
        0
      );


    const outstanding =
      issuedInvoices.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item.pending
          ),
        0
      );


    const overdue =
      issuedInvoices.reduce(
        (
          sum,
          item
        ) =>
          sum +
          number(
            item.overdueAmount
          ),
        0
      );


    const statusCounts =
      invoices.reduce(
        (
          result,
          item
        ) => {
          const status =
            item.displayStatus;

          return {
            ...result,

            [status]:
              (
                result[
                status
                ] || 0
              ) + 1,
          };
        },
        {}
      );


    //////////////////////////////////////////////////////
    // CUSTOMER LEDGERS
    //////////////////////////////////////////////////////

    const clientMap = {};


    invoices.forEach(
      (item) => {
        const id =
          item.clientId ||
          item.clientName ||
          "unknown";

        clientMap[id] ||= {
          id,

          name:
            item.clientName ||
            "Unknown client",

          gstNumber:
            item.clientSnapshot
              ?.gstNumber ||
            "",

          billed: 0,
          paid: 0,
          outstanding: 0,
          overdue: 0,

          invoices: [],
          payments: [],
        };


        if (
          item.invoiceStatus ===
          "issued"
        ) {
          clientMap[id].billed +=
            number(
              item.receivable ||
              item.invoiceAmount
            );

          clientMap[
            id
          ].outstanding +=
            number(
              item.pending
            );
        }


        clientMap[id].paid +=
          number(
            item.paid
          );


        clientMap[id].overdue +=
          number(
            item.overdueAmount
          );


        clientMap[
          id
        ].invoices.push(
          item
        );
      }
    );


    successfulPayments.forEach(
      (payment) => {
        const id =
          payment.clientId ||
          payment.clientName;

        const ledger =
          clientMap[id];

        if (ledger) {
          ledger.payments.push(
            payment
          );
        }
      }
    );


    const clients =
      Object.values(
        clientMap
      ).map(
        (client) => ({
          ...client,

          collectionRate:
            client.billed
              ? (
                client.paid /
                client.billed
              ) * 100
              : 0,
        })
      );


    //////////////////////////////////////////////////////
    // MONTHLY CHART DATA
    //////////////////////////////////////////////////////

    const monthly = {};


    issuedInvoices.forEach(
      (item) => {
        const month =
          dateKey(
            item.invoiceDate ||
            item.createdAt
          ).slice(
            0,
            7
          );

        if (!month) {
          return;
        }

        monthly[month] =
          (
            monthly[
            month
            ] || 0
          ) +
          number(
            item.invoiceAmount
          );
      }
    );


    const collections = {};


    successfulPayments.forEach(
      (item) => {
        const month =
          dateKey(
            item.paymentDate ||
            item.createdAt
          ).slice(
            0,
            7
          );

        if (!month) {
          return;
        }

        collections[month] =
          (
            collections[
            month
            ] || 0
          ) +
          number(
            item.amount
          );
      }
    );


    //////////////////////////////////////////////////////
    // FINAL ANALYTICS
    //////////////////////////////////////////////////////

    return {
      projects,
      invoices,
      clients,

      summary: {
        totalInvoiced,

        collected,

        outstanding,

        overdue,

        collectionRate:
          totalInvoiced
            ? (
              collected /
              totalInvoiced
            ) * 100
            : 0,

        draft:
          statusCounts.draft ||
          0,

        running:
          statusCounts.running ||
          0,

        partialInvoices:
          statusCounts.partial ||
          0,

        paidInvoices:
          statusCounts.paid ||
          0,

        overdueInvoices:
          statusCounts.overdue ||
          0,

        cancelled:
          statusCounts.cancelled ||
          0,

        ready:
          projects.filter(
            (item) =>
              item.billingStatus ===
              "ready"
          ).length,

        partial:
          projects.filter(
            (item) =>
              item.billingStatus ===
              "partial"
          ).length,

        fullyBilled:
          projects.filter(
            (item) =>
              item.billingStatus ===
              "fully billed"
          ).length,
      },


      charts: {
        revenue:
          Object.entries(
            monthly
          )
            .sort()
            .slice(-12)
            .map(
              ([
                label,
                value,
              ]) => ({
                label:
                  label.slice(
                    5
                  ),

                value,
              })
            ),

        collections:
          Object.entries(
            collections
          )
            .sort()
            .slice(-12)
            .map(
              ([
                label,
                value,
              ]) => ({
                label:
                  label.slice(
                    5
                  ),

                value,
              })
            ),

        clients:
          [...clients]
            .sort(
              (
                a,
                b
              ) =>
                b.billed -
                a.billed
            )
            .slice(
              0,
              8
            )
            .map(
              (item) => ({
                label:
                  item.name
                    .split(" ")[0],

                value:
                  item.billed,
              })
            ),

        profit:
          projects
            .map(
              (item) => ({
                label:
                  item.projectName
                    ?.split(" ")[0] ||
                  item.projectId,

                value:
                  item.costs
                    .expectedProfit,
              })
            )
            .slice(
              0,
              8
            ),
      },


      predictions: {
        revenueForecast:
          Object.values(
            monthly
          ).length
            ? Object.values(
              monthly
            )
              .slice(-3)
              .reduce(
                (
                  sum,
                  item
                ) =>
                  sum +
                  item,
                0
              ) /
            Math.min(
              3,
              Object.values(
                monthly
              ).length
            )
            : 0,

        cashFlowForecast:
          collected -
          outstanding,

        collectionRisk:
          totalInvoiced
            ? Math.min(
              100,
              (
                outstanding /
                totalInvoiced
              ) * 100
            )
            : 0,
      },
    };
  }
}