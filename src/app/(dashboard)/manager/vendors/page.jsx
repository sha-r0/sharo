"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Banknote,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import {
  EmptyState,
  ProgressRow,
  StatCard,
  neo,
} from "@/app/(dashboard)/manager/dashboard/DashboardWidgets";

import useVendorData from "./hooks/useVendorData";
import vendorService from "./services/VendorService";
import VendorDialog from "./components/VendorDialog";
import VendorPaymentDialog from "./components/VendorPaymentDialog";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;

export default function VendorsPage() {
  const { company } = useAuth();
  const router = useRouter();

  const data = useVendorData(company?.id);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [payment, setPayment] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(null);

  const vendors = useMemo(() => {
    const searchText = search.toLowerCase();

    return data.analytics.vendors.filter((item) => {
      const searchableText = `
        ${item.companyName || ""}
        ${item.vendorName || ""}
        ${item.contactPerson || ""}
        ${item.phone || ""}
        ${item.category || ""}
        ${(item.services || []).join(" ")}
      `.toLowerCase();

      const matchesSearch =
        !searchText || searchableText.includes(searchText);

      const matchesStatus =
        status === "all" ||
        String(item.status || "").toLowerCase() === status;

      return matchesSearch && matchesStatus;
    });
  }, [data.analytics.vendors, search, status]);

  const summary = data.analytics.summary;

  const cards = [
    [
      "Total vendors",
      summary.total,
      Building2,
      "blue",
    ],
    [
      "Active",
      summary.active,
      UserCheck,
      "green",
    ],
    [
      "Inactive",
      summary.inactive,
      Ban,
      "amber",
    ],
    [
      "Blocked",
      summary.blocked,
      Ban,
      "red",
    ],
    [
      "Pending payments",
      summary.pendingPayments,
      Wallet,
      "amber",
      "currency",
    ],
    [
      "Outstanding",
      summary.outstanding,
      CircleDollarSign,
      "red",
      "currency",
    ],
    [
      "Amount paid",
      summary.totalPaid,
      CheckCircle2,
      "green",
      "currency",
    ],
    [
      "Performance",
      summary.performance,
      TrendingUp,
      "violet",
      "percent",
    ],
  ];

  async function remove(item) {
    const confirmed = window.confirm(
      `Remove ${item.companyName || item.vendorName}? Vendors with financial history will be archived.`,
    );

    if (!confirmed || !company?.id) return;

    setBusy(item.id);

    try {
      const result = await vendorService.remove(
        company.id,
        item,
        data.projects,
        data.payments,
      );

      toast.success(
        result.archived
          ? "Vendor archived to preserve financial history."
          : "Vendor deleted.",
      );
    } catch (error) {
      toast.error(
        error?.message || "Unable to remove vendor.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 lg:px-6">
      <header
        className={`${neo} rounded-3xl bg-white p-5 sm:p-6`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Building2 />
            </span>

            <div>
              <h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">
                Vendor Management
              </h1>

              <p className="text-sm text-slate-500">
                Commercial performance, projects and
                payment control
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPayment(true)}
              className="flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-600"
            >
              <Banknote size={17} />
              Vendor payment
            </button>

            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDialog(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus size={17} />
              Add vendor
            </button>
          </div>
        </div>
      </header>

      {data.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {data.error}
        </div>
      )}

      {/* 4 cards in one row on desktop */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(
          ([title, value, Icon, tone, format]) => (
            <StatCard
              key={title}
              title={title}
              value={value}
              icon={Icon}
              tone={tone}
              format={format}
            />
          ),
        )}
      </section>

      <section className={`${neo} rounded-3xl p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={17}
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search vendor, category, service or contact..."
              className="h-11 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value)
            }
            className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold outline-none focus:border-blue-500"
          >
            <option value="all">
              All statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="blocked">
              Blocked
            </option>
          </select>
        </div>
      </section>

      {data.loading ? (
        <div className="space-y-3">
          {Array.from(
            { length: 6 },
            (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-3xl bg-white/70"
              />
            ),
          )}
        </div>
      ) : vendors.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {vendors.map((item) => {
            const vendorName =
              item.companyName ||
              item.vendorName ||
              "Vendor";

            const itemStatus = String(
              item.status || "inactive",
            ).toLowerCase();

            const paymentPercent = Number(
              item.paymentPercent || 0,
            );

            const performance = Number(
              item.performance || 0,
            );

            return (
              <article
                key={item.id}
                className={`${neo} rounded-3xl p-5`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/manager/vendors/${item.id}`,
                      )
                    }
                    className="min-w-0 text-left"
                  >
                    <h2 className="truncate text-lg font-bold text-slate-800 hover:text-blue-600">
                      {vendorName}
                    </h2>

                    <p className="truncate text-xs text-slate-400">
                      {item.vendorId || "-"} •{" "}
                      {item.category ||
                        "General vendor"}{" "}
                      •{" "}
                      {item.contactPerson ||
                        "No contact person"}
                    </p>
                  </button>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      itemStatus === "blocked"
                        ? "bg-red-50 text-red-600"
                        : itemStatus === "active"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    {itemStatus}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                  <Metric
                    label="Allocated"
                    value={money(item.allocated)}
                  />

                  <Metric
                    label="Paid"
                    value={money(item.paid)}
                  />

                  <Metric
                    label="Outstanding"
                    value={money(item.outstanding)}
                  />
                </div>

                <div className="mt-5">
                  <ProgressRow
                    label="Payment"
                    value={paymentPercent}
                    detail={`${paymentPercent.toFixed(0)}%`}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    {Number(
                      item.projectsAssigned || 0,
                    )}{" "}
                    project(s) • Performance{" "}
                    {performance.toFixed(0)}%
                  </p>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${vendorName}`}
                      onClick={() => {
                        setEditing(item);
                        setDialog(true);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-600"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      type="button"
                      aria-label={`Delete ${vendorName}`}
                      disabled={busy === item.id}
                      onClick={() => remove(item)}
                      className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div
          className={`${neo} rounded-3xl py-20`}
        >
          <EmptyState label="No vendors found" />
        </div>
      )}

      <VendorDialog
        open={dialog}
        onClose={() => {
          setDialog(false);
          setEditing(null);
        }}
        companyId={company?.id}
        vendor={editing}
      />

      <VendorPaymentDialog
        open={payment}
        onClose={() => setPayment(false)}
        companyId={company?.id}
        vendors={data.vendors}
        projects={data.projects}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}