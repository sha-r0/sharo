"use client";

import { useMemo, useState, } from "react";

import { useRouter } from "next/navigation";
import useUnbilledProjects from "./hooks/useUnbilledProjects";
import usePendingProjects from "./hooks/usePendingProjects";
import usePaidProjects from "./hooks/usePaidProjects";

import {
  Banknote,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Plus,
  Search,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import {
  EmptyState,
  neo,
} from "@/app/(dashboard)/manager/dashboard/DashboardWidgets";

import useBillingDashboard from "./hooks/useBillingDashboard";


import PaymentDialog from "./components/PaymentDialog";

import {
  money,
} from "./components/InvoiceDocument";


//////////////////////////////////////////////////////
// DATE HELPERS
//////////////////////////////////////////////////////

const dateKey = (date) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
};


const periodRange = (
  period,
  customFrom = "",
  customTo = ""
) => {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    now.getMonth();

  let from = null;
  let to = null;

  switch (period) {
    case "this_month": {
      from =
        new Date(
          year,
          month,
          1
        );

      to =
        new Date(
          year,
          month + 1,
          0
        );

      break;
    }

    case "last_month": {
      from =
        new Date(
          year,
          month - 1,
          1
        );

      to =
        new Date(
          year,
          month,
          0
        );

      break;
    }

    case "quarter": {
      const quarterStart =
        Math.floor(
          month / 3
        ) * 3;

      from =
        new Date(
          year,
          quarterStart,
          1
        );

      to =
        new Date(
          year,
          quarterStart + 3,
          0
        );

      break;
    }

    case "financial_year": {
      const startYear =
        month >= 3
          ? year
          : year - 1;

      from =
        new Date(
          startYear,
          3,
          1
        );

      to =
        new Date(
          startYear + 1,
          2,
          31
        );

      break;
    }

    case "this_year": {
      from =
        new Date(
          year,
          0,
          1
        );

      to =
        new Date(
          year,
          11,
          31
        );

      break;
    }

    case "last_year": {
      from =
        new Date(
          year - 1,
          0,
          1
        );

      to =
        new Date(
          year - 1,
          11,
          31
        );

      break;
    }

    case "custom":
      return {
        from:
          customFrom,

        to:
          customTo,
      };

    default:
      return {
        from: "",
        to: "",
      };
  }

  return {
    from:
      from
        ? dateKey(from)
        : "",

    to:
      to
        ? dateKey(to)
        : "",
  };
};


//////////////////////////////////////////////////////
// BILLING PAGE
//////////////////////////////////////////////////////

export default function BillingPage() {
  const {
    company,
  } = useAuth();

  const router =
    useRouter();

  //////////////////////////////////////////////////////
  // UI STATE
  //////////////////////////////////////////////////////

  const [tab, setTab,] = useState("invoices");

  const [search, setSearch,] = useState("");

  const [projectSearch, setProjectSearch,] = useState("");

  const [status, setStatus,] = useState("all");

  const [period,
    setPeriod,
  ] = useState(
    "this_month"
  );

  const [
    customFrom,
    setCustomFrom,
  ] = useState("");

  const [
    customTo,
    setCustomTo,
  ] = useState("");

  const [
    payment,
    setPayment,
  ] = useState(null);


  //////////////////////////////////////////////////////
  // DATE RANGE
  //////////////////////////////////////////////////////

  const range =
    useMemo(
      () =>
        periodRange(
          period,
          customFrom,
          customTo
        ),
      [
        period,
        customFrom,
        customTo,
      ]
    );


  //////////////////////////////////////////////////////
  // OPTIMIZED INVOICE DASHBOARD
  //////////////////////////////////////////////////////

  const dashboard =
    useBillingDashboard(
      range
    );

  const unbilledData =
    useUnbilledProjects(
      tab === "unbilled"
    );

    const pendingData =
  usePendingProjects(
    tab === "partial"
  );

  const paidData =
  usePaidProjects(
    tab === "paid"
  );


  //////////////////////////////////////////////////////
  // LOCAL FIRST-PAGE FILTER
  //////////////////////////////////////////////////////

  const invoices =
    useMemo(
      () => {
        const query =
          search
            .trim()
            .toLowerCase();

        return (
          dashboard.invoices ||
          []
        ).filter(
          (item) => {
            const haystack =
              [
                item.invoiceNumber,
                item.clientName,
                item.projectName,
                item.poNumber,
                item.clientSnapshot
                  ?.gstNumber,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              haystack.includes(
                query
              );

            const matchesStatus =
              status ===
              "all" ||
              item.displayStatus ===
              status;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        );
      },
      [
        dashboard.invoices,
        search,
        status,
      ]
    );


  //////////////////////////////////////////////////////
  // DASHBOARD DATA
  //////////////////////////////////////////////////////

  const summary =
    dashboard.summary;

  const statusCounts =
    dashboard.statusCounts;


  const metrics = [
    [
      "Total Invoiced",
      summary.totalInvoiced,
      FileText,
      "text-indigo-600 bg-indigo-50",
    ],

    [
      "Total Received",
      summary.totalReceived,
      Banknote,
      "text-emerald-600 bg-emerald-50",
    ],

    [
      "Outstanding",
      summary.outstanding,
      Wallet,
      "text-amber-600 bg-amber-50",
    ],

    [
      "Overdue",
      summary.overdue,
      CalendarDays,
      "text-rose-600 bg-rose-50",
    ],
  ];


  const dashboardError =
  tab === "invoices"
    ? dashboard.error
    : tab === "unbilled"
      ? unbilledData.error
      : tab === "partial"
        ? pendingData.error
        : tab === "paid"
          ? paidData.error
          : "";


  //////////////////////////////////////////////////////
  // PAYMENT CLOSE
  //////////////////////////////////////////////////////

  const closePayment = () => {
    setPayment(null);

    dashboard.refresh();
  };

  const unbilledProjects =
    useMemo(
      () => {
        const query =
          projectSearch
            .trim()
            .toLowerCase();

        return (
          unbilledData.projects ||
          []
        ).filter(
          (project) => {
            const haystack = [
              project.projectName,
              project.clientName,
              project.projectId,
              project.poNumber,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            return (
              !query ||
              haystack.includes(
                query
              )
            );
          }
        );
      },
      [
        unbilledData.projects,
        projectSearch,
      ]
    );

    const partiallyBilledProjects =
    useMemo(
      () =>
        pendingData.projects ||
        [],
      [
        pendingData.projects,
      ]
    );

    const fullyPaidProjects =
    useMemo(
      () =>
        paidData.projects ||
        [],
      [
        paidData.projects,
      ]
    );


  //////////////////////////////////////////////////////
  // UI
  //////////////////////////////////////////////////////

  return (
    <div className="space-y-5 px-2 py-2 sm:px-5">

      {/* HEADER */}
      <header
        className={`${neo} flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between`}
      >
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Billing &amp; Invoices
          </h1>

          <p className="text-sm text-slate-500">
            Issue invoices, collect payments and track receivables
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/manager/billing/new"
            )
          }
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus
            size={17}
          />

          Create Invoice
        </button>
      </header>


      {/* ERROR */}
      {dashboardError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Billing data could not be loaded. Please try again.
        </div>
      )}


      {/* SUMMARY METRICS */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          ([
            label,
            value,
            Icon,
            tone,
          ]) => (
            <article
              key={
                label
              }
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {label}
                </span>

                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${tone}`}
                >
                  <Icon
                    size={17}
                  />
                </span>
              </div>

              <strong className="mt-3 block text-xl text-slate-900">
                ₹{" "}
                {money(
                  value
                )}
              </strong>
            </article>
          )
        )}
      </section>


      {/* STATUS COUNTS */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {[
          [
            "Draft",
            statusCounts.draft,
          ],

          [
            "Running",
            statusCounts.running,
          ],

          [
            "Partial",
            statusCounts.partial,
          ],

          [
            "Paid",
            statusCounts.paid,
          ],

          [
            "Overdue",
            statusCounts.overdue,
          ],

          [
            "Cancelled",
            statusCounts.cancelled,
          ],
        ].map(
          ([
            label,
            count,
          ]) => (
            <button
              type="button"
              key={
                label
              }
              onClick={() => {
                setTab(
                  "invoices"
                );

                setStatus(
                  label.toLowerCase()
                );
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <span className="text-xs text-slate-500">
                {label}
              </span>

              <strong className="block text-lg text-slate-800">
                {count}
              </strong>
            </button>
          )
        )}
      </section>


      {/* TABS */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {[
          [
            "invoices",
            "Invoices",
          ],

          [
            "unbilled",
            "Unbilled Projects",
          ],

          [
            "partial",
            "Billing / Payment Pending",
          ],

          [
            "paid",
            "Fully Paid"
          ]
        ].map(
          ([
            id,
            label,
          ]) => (
            <button
              type="button"
              key={
                id
              }
              onClick={() =>
                setTab(id)
              }
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === id
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
                }`}
            >
              {label}
            </button>
          )
        )}
      </nav>


      {/* INVOICE TAB */}
      {tab ===
        "invoices" && (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-3">

              <div className="flex flex-col gap-3 xl:flex-row">

                {/* SEARCH */}
                <div className="relative min-w-0 flex-1">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={
                      search
                    }
                    onChange={(
                      event
                    ) =>
                      setSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search invoice, customer, project, PO or GSTIN"
                    className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>


                {/* STATUS */}
                <select
                  value={
                    status
                  }
                  onChange={(
                    event
                  ) =>
                    setStatus(
                      event.target
                        .value
                    )
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-500"
                >
                  <option value="all">
                    All statuses
                  </option>

                  {[
                    "draft",
                    "running",
                    "partial",
                    "paid",
                    "overdue",
                    "cancelled",
                  ].map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {value[0]
                          .toUpperCase() +
                          value.slice(
                            1
                          )}
                      </option>
                    )
                  )}
                </select>


                {/* PERIOD */}
                <select
                  value={
                    period
                  }
                  onChange={(
                    event
                  ) => {
                    setPeriod(
                      event.target
                        .value
                    );

                    setSearch("");

                    setStatus(
                      "all"
                    );
                  }}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-indigo-500"
                >
                  <option value="this_month">
                    This Month
                  </option>

                  <option value="last_month">
                    Last Month
                  </option>

                  <option value="quarter">
                    This Quarter
                  </option>

                  <option value="financial_year">
                    This Financial Year
                  </option>

                  <option value="this_year">
                    This Year
                  </option>

                  <option value="last_year">
                    Last Year
                  </option>

                  <option value="custom">
                    Custom Range
                  </option>

                  <option value="all">
                    All Time
                  </option>
                </select>


                {/* CUSTOM FROM */}
                {period ===
                  "custom" && (
                    <input
                      type="date"
                      value={
                        customFrom
                      }
                      max={
                        customTo ||
                        undefined
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomFrom(
                          event.target
                            .value
                        )
                      }
                      aria-label="From date"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500"
                    />
                  )}


                {/* CUSTOM TO */}
                {period ===
                  "custom" && (
                    <input
                      type="date"
                      value={
                        customTo
                      }
                      min={
                        customFrom ||
                        undefined
                      }
                      onChange={(
                        event
                      ) =>
                        setCustomTo(
                          event.target
                            .value
                        )
                      }
                      aria-label="To date"
                      className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-500"
                    />
                  )}

              </div>


              {/* ACTIVE PERIOD */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                <span className="font-semibold">
                  Period:
                </span>

                {range.from ||
                  range.to ? (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    {range.from ||
                      "Beginning"}

                    {" → "}

                    {range.to ||
                      "Today"}
                  </span>
                ) : (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                    All Time
                  </span>
                )}

                {!dashboard.loading && (
                  <span>
                    {dashboard.totalCount ||
                      0}{" "}
                    invoice
                    {dashboard.totalCount ===
                      1
                      ? ""
                      : "s"}
                  </span>
                )}

              </div>

            </section>


            {/* INVOICE LIST */}
            {dashboard.loading ? (
              <Loading />
            ) : (
              <InvoiceTable
                invoices={
                  invoices
                }
                onOpen={(
                  item
                ) =>
                  router.push(
                    `/manager/billing/${item.id}`
                  )
                }
                onEdit={(
                  item
                ) =>
                  router.push(
                    `/manager/billing/new?editId=${item.id}`
                  )
                }
                onPayment={
                  setPayment
                }
                onCreate={() =>
                  router.push(
                    "/manager/billing/new"
                  )
                }
              />
            )}
          </>
        )}

      {/* UNBILLED PROJECTS */}
      {tab === "unbilled" && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={projectSearch}
                onChange={(event) =>
                  setProjectSearch(
                    event.target.value
                  )
                }
                placeholder="Search project, client, project ID or PO number"
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            {!unbilledData.loading && (
              <div className="mt-2 text-xs text-slate-500">
                {unbilledProjects.length} unbilled project
                {unbilledProjects.length === 1
                  ? ""
                  : "s"}
              </div>
            )}
          </section>

          {unbilledData.loading ? (
            <Loading />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {unbilledProjects.length ? (
                unbilledProjects.map(
                  (project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      mode="unbilled"
                      onCreate={() =>
                        router.push(
                          `/manager/billing/new?projectId=${project.id}`
                        )
                      }
                    />
                  )
                )
              ) : (
                <EmptyState label="No completed unbilled projects found" />
              )}
            </div>
          )}

          {unbilledData.hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={
                  unbilledData.loadMore
                }
                disabled={
                  unbilledData.loadingMore
                }
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unbilledData.loadingMore
                  ? "Loading..."
                  : "Load More"}
              </button>
            </div>
          )}
        </>
      )}


      {/* PARTIALLY BILLED */}
      {tab === "partial" && (
        <>
          {pendingData.loading ? (
            <Loading />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {partiallyBilledProjects.length ? (
                partiallyBilledProjects.map(
                  (project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      mode="pending"
                      onCreate={() =>
                        router.push(
                          `/manager/billing/new?projectId=${project.id}`
                        )
                      }
                    />
                  )
                )
              ) : (
                <EmptyState label="No partially billed projects" />
              )}
            </div>
          )}
        </>
      )}


      {/* FULLY PAID */}
      {tab === "paid" && (
        <>
          {paidData.loading ? (
            <Loading />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {fullyPaidProjects.length ? (
                fullyPaidProjects.map(
                  (project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      mode="paid"
                    />
                  )
                )
              ) : (
                <EmptyState label="No fully paid projects" />
              )}
            </div>
          )}
        </>
      )}


      {/* PAYMENT */}
      <PaymentDialog
        open={
          Boolean(
            payment
          )
        }
        onClose={
          closePayment
        }
        companyId={
          company?.id
        }
        invoice={
          payment
        }
      />

    </div>
  );
}


//////////////////////////////////////////////////////
// INVOICE TABLE
//////////////////////////////////////////////////////

function InvoiceTable({
  invoices,
  onOpen,
  onEdit,
  onPayment,
  onCreate,
}) {
  if (
    !invoices.length
  ) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">

        <CircleDollarSign
          className="mx-auto text-slate-300"
          size={38}
        />

        <h2 className="mt-3 font-bold text-slate-800">
          No invoices found
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Try another date range, status or search term.
        </p>

        <button
          type="button"
          onClick={
            onCreate
          }
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
        >
          Create Invoice
        </button>

      </div>
    );
  }


  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">

      <table className="w-full min-w-[980px] text-sm">

        <thead>
          <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">

            <th className="p-4">
              Invoice No.
            </th>

            <th>
              Customer
            </th>

            <th>
              Invoice Date
            </th>

            <th>
              Due Date
            </th>

            <th className="text-right">
              Amount
            </th>

            <th className="text-right">
              Paid
            </th>

            <th className="text-right">
              Balance
            </th>

            <th>
              Status
            </th>

            <th className="pr-4 text-right">
              Actions
            </th>

          </tr>
        </thead>


        <tbody>
          {invoices.map(
            (item) => (
              <tr
                key={
                  item.id
                }
                className="border-b last:border-0 hover:bg-slate-50/70"
              >

                <td className="p-4">
                  <button
                    type="button"
                    onClick={() =>
                      onOpen(
                        item
                      )
                    }
                    className="font-bold text-indigo-600"
                  >
                    {item.invoiceNumber}
                  </button>

                  <span className="block text-[11px] text-slate-400">
                    {item.projectName}
                  </span>
                </td>


                <td>
                  <strong className="font-semibold text-slate-800">
                    {item.clientName}
                  </strong>

                  <span className="block text-[11px] text-slate-400">
                    {item
                      .clientSnapshot
                      ?.gstNumber ||
                      ""}
                  </span>
                </td>


                <td>
                  {item.invoiceDate ||
                    "—"}
                </td>


                <td
                  className={
                    item.overdue
                      ? "font-semibold text-rose-600"
                      : ""
                  }
                >
                  {item.dueDate ||
                    "—"}
                </td>


                <td className="text-right font-semibold">
                  ₹{" "}
                  {money(
                    item.receivable ??
                    item.invoiceAmount
                  )}
                </td>


                <td className="text-right text-emerald-700">
                  ₹{" "}
                  {money(
                    item.paid
                  )}
                </td>


                <td className="text-right font-bold">
                  ₹{" "}
                  {money(
                    item.pending
                  )}
                </td>


                <td>
                  <StatusBadge
                    status={
                      item.displayStatus
                    }
                  />
                </td>


                <td className="pr-4">
                  <div className="flex justify-end gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        onOpen(
                          item
                        )
                      }
                      className="rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
                    >
                      View
                    </button>


                    {item.invoiceStatus !==
                      "cancelled" &&
                      item.paymentStatus !==
                      "paid" && (
                        <button
                          type="button"
                          onClick={() =>
                            item.invoiceStatus ===
                              "draft"
                              ? onEdit(
                                item
                              )
                              : onPayment(
                                item
                              )
                          }
                          className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700"
                        >
                          {item.invoiceStatus ===
                            "draft"
                            ? "Edit"
                            : "Record Payment"}
                        </button>
                      )}

                  </div>
                </td>

              </tr>
            )
          )}
        </tbody>

      </table>

    </div>
  );
}


//////////////////////////////////////////////////////
// STATUS BADGE
//////////////////////////////////////////////////////

function StatusBadge({
  status,
}) {
  const tones = {
    draft:
      "bg-slate-100 text-slate-600",

    running:
      "bg-blue-50 text-blue-700",

    partial:
      "bg-amber-50 text-amber-700",

    paid:
      "bg-emerald-50 text-emerald-700",

    overdue:
      "bg-rose-50 text-rose-700",

    cancelled:
      "bg-slate-200 text-slate-600",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tones[
        status
      ] ||
        tones.draft
        }`}
    >
      {status}
    </span>
  );
}


//////////////////////////////////////////////////////
// CUSTOMER BILLING
//////////////////////////////////////////////////////

function ClientLedgers({
  clients,
  onOpen,
}) {
  if (
    !clients.length
  ) {
    return (
      <EmptyState label="No customer billing activity" />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">

      {clients.map(
        (client) => (
          <article
            key={
              client.id
            }
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >

            <div className="flex justify-between gap-3">

              <div>
                <h2 className="font-bold text-slate-900">
                  {client.name}
                </h2>

                <p className="text-xs text-slate-400">
                  {client.gstNumber ||
                    "No GSTIN"}
                </p>
              </div>

              <span className="text-xs font-semibold text-slate-500">
                {client.invoices
                  .length}{" "}
                invoice(s)
              </span>

            </div>


            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">

              <Small
                label="Invoiced"
                value={
                  client.billed
                }
              />

              <Small
                label="Received"
                value={
                  client.paid
                }
              />

              <Small
                label="Outstanding"
                value={
                  client.outstanding
                }
              />

              <Small
                label="Overdue"
                value={
                  client.overdue
                }
              />

            </div>


            <div className="mt-4 space-y-2">

              {client.invoices
                .slice(
                  0,
                  3
                )
                .map(
                  (
                    invoice
                  ) => (
                    <button
                      type="button"
                      key={
                        invoice.id
                      }
                      onClick={() =>
                        onOpen(
                          invoice
                        )
                      }
                      className="flex w-full justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-indigo-600">
                        {
                          invoice.invoiceNumber
                        }
                      </span>

                      <span>
                        ₹{" "}
                        {money(
                          invoice.pending
                        )}{" "}
                        due
                      </span>
                    </button>
                  )
                )}

            </div>

          </article>
        )
      )}

    </div>
  );
}


//////////////////////////////////////////////////////
// PROJECT BILLING
//////////////////////////////////////////////////////

function ProjectCard({
  project,
  mode = "pending",
  onCreate,
  onView,
}) {
  const contract =
    Number(
      project.contractValue ||
      0
    );

  const billed =
    Number(
      project.billedAmount ||
      0
    );

  const received =
    Number(
      project.receivedAmount ||
      0
    );

  const outstanding =
    Number(
      project.outstandingAmount ||
      0
    );

  const remaining =
    Number(
      project.remainingBillable ||
      0
    );

  const progress =
    contract > 0
      ? Math.min(
        100,
        Math.max(
          0,
          (billed / contract) *
          100
        )
      )
      : 0;

  const statusLabel =
    mode === "unbilled"
      ? "Unbilled"
      : mode === "paid"
        ? "Fully Paid"
        : remaining > 0.01
          ? "Billing Pending"
          : "Payment Pending";

  const statusTone =
    mode === "unbilled"
      ? "bg-slate-100 text-slate-700"
      : mode === "paid"
        ? "bg-emerald-50 text-emerald-700"
        : remaining > 0.01
          ? "bg-amber-50 text-amber-700"
          : "bg-blue-50 text-blue-700";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

        <div className="min-w-0">
          <h2 className="truncate font-bold text-slate-900">
            {project.projectName ||
              "Unnamed Project"}
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {project.clientName ||
              "No client"}

            {project.projectId && (
              <>
                {" · "}
                {project.projectId}
              </>
            )}
          </p>

          {project.poNumber && (
            <p className="mt-1 text-[11px] text-slate-400">
              PO:{" "}
              {project.poNumber}
            </p>
          )}
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone}`}
        >
          {statusLabel}
        </span>

      </div>


      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">

        <Small
          label="Contract"
          value={contract}
        />

        <Small
          label="Billed"
          value={billed}
        />

        <Small
          label="Received"
          value={received}
        />

        <Small
          label="Outstanding"
          value={outstanding}
        />

        <Small
          label="To Bill"
          value={remaining}
        />

      </div>


      <div className="mt-4">

        <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>
            Billing progress
          </span>

          <span className="font-semibold text-slate-700">
            {progress.toFixed(
              0
            )}
            %
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

      </div>


      <div className="mt-5 flex flex-wrap gap-2">

        {mode ===
          "unbilled" && (
            <button
              type="button"
              onClick={onCreate}
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Create Invoice
            </button>
          )}


        {mode ===
          "pending" &&
          remaining >
          0.01 && (
            <button
              type="button"
              onClick={
                onCreate
              }
              className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
            >
              Create Next Invoice
            </button>
          )}


        {mode ===
          "pending" &&
          remaining <=
          0.01 &&
          outstanding >
          0.01 && (
            <span className="rounded-lg bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-700">
              Awaiting Payment
            </span>
          )}


        {onView && (
          <button
            type="button"
            onClick={onView}
            className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {mode ===
              "paid"
              ? "View Billing History"
              : "View Billing"}
          </button>
        )}

      </div>

    </article>
  );
}


//////////////////////////////////////////////////////
// SMALL MONEY CARD
//////////////////////////////////////////////////////

function Small({
  label,
  value,
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">

      <span className="block text-[10px] uppercase text-slate-400">
        {label}
      </span>

      <strong className="text-xs">
        ₹{" "}
        {money(
          value
        )}
      </strong>

    </div>
  );
}


//////////////////////////////////////////////////////
// LOADING
//////////////////////////////////////////////////////

function Loading() {
  return (
    <div className="space-y-2">

      {Array.from(
        {
          length: 6,
        },
        (
          _,
          index
        ) => (
          <div
            key={
              index
            }
            className="h-16 animate-pulse rounded-xl bg-white"
          />
        )
      )}

    </div>
  );
}