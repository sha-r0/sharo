"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import { money } from "./components/PurchaseOrderDocument";
import PurchaseOrderService from "./services/PurchaseOrderService";
import {
  formatPurchaseOrderStatusLabel,
  normalizePurchaseOrderStatus,
  canCancelPurchaseOrder,
  purchaseOrderStatusTone,
  purchaseOrderStatuses,
} from "./services/PurchaseOrderStatusPolicy";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const formatDate = (value) => {
  if (!value) return "—";
  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

export default function PurchaseOrdersPage() {
  const { company, firebaseUser, can } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    draft: 0,
    pendingApproval: 0,
    approved: 0,
    issued: 0,
    partiallyFulfilled: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    grandTotal: 0,
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    if (!company?.id || !firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PurchaseOrderService.getList(firebaseUser);
      setPurchaseOrders(Array.isArray(data.purchaseOrders) ? data.purchaseOrders : []);
      setSummary(data.summary || summary);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError.message || "Unable to load purchase orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, firebaseUser]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchaseOrders.filter((order) => {
      const currentStatus = normalizePurchaseOrderStatus(order.status);
      const haystack = [
        order.poNumber,
        order.projectNameSnapshot,
        order.projectNumberSnapshot,
        order.vendorNameSnapshot,
        order.vendorCodeSnapshot,
        order.grandTotal,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        (status === "all" || currentStatus === status) &&
        (!query || haystack.includes(query))
      );
    });
  }, [purchaseOrders, search, status]);

  const doAction = async (order, action, method) => {
    if (!firebaseUser) return;
    setBusyId(order.id);
    try {
      await method(firebaseUser, order.id);
      toast.success(`${formatPurchaseOrderStatusLabel(action)} action completed.`);
      await load();
    } catch (actionError) {
      toast.error(actionError.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  };

  const summaryCards = [
    ["Total POs", summary.total],
    ["Draft", summary.draft],
    ["Pending Approval", summary.pendingApproval],
    ["Issued", summary.issued],
    ["Partially Fulfilled", summary.partiallyFulfilled],
    ["Completed", summary.completed],
  ];

  return (
    <div className="space-y-5 px-2 py-2 sm:px-5">
      <header className={`${neo} flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between`}>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-sm text-slate-500">Manage PO drafts, approvals and issuance inside the company tenant</p>
        </div>
        {can("purchase_order.create") && (
          <button
            onClick={() => router.push("/manager/purchase-orders/new")}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white"
          >
            <Plus size={17} />
            Create PO
          </button>
        )}
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
            </div>
            <strong className="mt-3 block text-xl text-slate-900">{value}</strong>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 lg:flex-row">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search PO number, project or vendor"
            className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold"
        >
          <option value="all">All statuses</option>
          {purchaseOrderStatuses.filter((value) => value !== "all").map((value) => (
            <option key={value} value={value}>
              {formatPurchaseOrderStatusLabel(value)}
            </option>
          ))}
        </select>
      </section>

      {loading ? (
        <Loading />
      ) : (
        <OrderTable
          orders={filteredOrders}
          busyId={busyId}
          can={can}
          onView={(item) => router.push(`/manager/purchase-orders/${item.id}`)}
          onEdit={(item) => router.push(`/manager/purchase-orders/new?id=${item.id}`)}
          onSubmit={(item) => doAction(item, "submit", (user, purchaseOrderId) => PurchaseOrderService.submit(user, purchaseOrderId))}
          onApprove={(item) => doAction(item, "approve", (user, purchaseOrderId) => PurchaseOrderService.approve(user, purchaseOrderId))}
          onIssue={(item) => doAction(item, "issue", (user, purchaseOrderId) => PurchaseOrderService.issue(user, purchaseOrderId))}
          onReject={(item) => doAction(item, "reject", (user, purchaseOrderId) => PurchaseOrderService.reject(user, purchaseOrderId))}
          onCancel={(item) => doAction(item, "cancel", (user, purchaseOrderId) => PurchaseOrderService.cancel(user, purchaseOrderId))}
        />
      )}
    </div>
  );
}

function OrderTable({
  orders,
  busyId,
  can,
  onView,
  onEdit,
  onSubmit,
  onApprove,
  onIssue,
  onReject,
  onCancel,
}) {
  if (!orders.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center">
        <h2 className="mt-3 font-bold text-slate-800">No purchase orders yet</h2>
        <p className="mt-1 text-sm text-slate-500">Create the first PO to start managing approvals and issuance.</p>
      </div>
    );
  }

  const renderActions = (item, status) => (
    <div className="flex flex-wrap justify-end gap-2">
      <button onClick={() => onView(item)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700">
        View
      </button>
      {status === "draft" && can("purchase_order.edit") && (
        <>
          <button onClick={() => onEdit(item)} className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 transition hover:bg-indigo-100">
            Edit
          </button>
          <button disabled={busyId === item.id} onClick={() => onSubmit(item)} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50">
            Submit
          </button>
        </>
      )}
      {status === "pending_approval" && can("purchase_order.approve") && (
        <>
          <button disabled={busyId === item.id} onClick={() => onApprove(item)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
            Approve
          </button>
          <button disabled={busyId === item.id} onClick={() => onReject(item)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50">
            Reject
          </button>
        </>
      )}
      {status === "approved" && can("purchase_order.issue") && (
        <button disabled={busyId === item.id} onClick={() => onIssue(item)} className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50">
          Issue
        </button>
      )}
      {canCancelPurchaseOrder(status, item) && can("purchase_order.cancel") && (
        <button disabled={busyId === item.id} onClick={() => onCancel(item)} className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50">
          Cancel
        </button>
      )}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden md:block">
        <table className="w-full min-w-[1080px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
            <th className="px-6 py-4">PO Number</th>
            <th className="px-4 py-4">Date</th>
            <th className="px-4 py-4">Project</th>
            <th className="px-4 py-4">Vendor</th>
            <th className="px-4 py-4 text-right">Grand Total</th>
            <th className="px-4 py-4 text-right">Ledger</th>
            <th className="px-4 py-4">Status</th>
            <th className="px-4 py-4">Created By</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {orders.map((item) => {
            const status = normalizePurchaseOrderStatus(item.status);
            return (
              <tr key={item.id} className="align-top hover:bg-slate-50/80">
                <td className="px-6 py-5">
                  <button onClick={() => onView(item)} className="text-left text-[15px] font-extrabold tracking-tight text-indigo-700 transition hover:text-indigo-600">
                    {item.poNumber || "Draft"}
                  </button>
                </td>
                <td className="px-4 py-5 whitespace-nowrap text-sm text-slate-600">{formatDate(item.poDate)}</td>
                <td className="px-4 py-5">
                  <div className="space-y-1">
                    <strong className="block font-semibold text-slate-900">{item.projectNameSnapshot || "—"}</strong>
                    <span className="block text-[11px] text-slate-500">{item.projectNumberSnapshot || item.projectId || item.projectFirestoreId || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <div className="space-y-1">
                    <strong className="block font-semibold text-slate-900">{item.vendorNameSnapshot || "—"}</strong>
                    <span className="block text-[11px] text-slate-500">{item.vendorCodeSnapshot || item.vendorId || item.vendorFirestoreId || "—"}</span>
                  </div>
                </td>
                <td className="px-4 py-5 text-right">
                  <div className="text-[15px] font-extrabold tracking-tight text-slate-900">₹ {money(item.grandTotal)}</div>
                </td>
                <td className="px-4 py-5 text-right">
                  <div className="inline-grid gap-1 text-[12px] leading-5 text-slate-500">
                    <div className="grid grid-cols-[auto_auto] gap-x-3">
                      <span>Fulfilled</span><span className="font-semibold text-slate-800">₹ {money(item.fulfilledAmount)}</span>
                      <span>Billed</span><span className="font-semibold text-slate-800">₹ {money(item.billedAmount)}</span>
                      <span>Paid</span><span className="font-semibold text-slate-800">₹ {money(item.paidAmount)}</span>
                      <span>Outstanding</span><span className="font-semibold text-slate-800">₹ {money(item.outstandingAmount)}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5">
                  <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${purchaseOrderStatusTone(status)}`}>
                    {formatPurchaseOrderStatusLabel(status)}
                  </span>
                </td>
                <td className="px-4 py-5 text-sm text-slate-600">{item.preparedBy?.name || "—"}</td>
                <td className="px-6 py-5">
                  {renderActions(item, status)}
                </td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-200 md:hidden">
        {orders.map((item) => {
          const status = normalizePurchaseOrderStatus(item.status);
          return (
            <article key={item.id} className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <button onClick={() => onView(item)} className="text-left text-base font-extrabold tracking-tight text-indigo-700">
                  {item.poNumber || "Draft"}
                </button>
                <span className={`inline-flex shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${purchaseOrderStatusTone(status)}`}>
                  {formatPurchaseOrderStatusLabel(status)}
                </span>
              </div>

              <div className="grid gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Date</p>
                  <p className="mt-1 text-sm font-medium text-slate-700">{formatDate(item.poDate)}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Project</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.projectNameSnapshot || "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.projectNumberSnapshot || item.projectId || item.projectFirestoreId || "—"}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Vendor</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.vendorNameSnapshot || "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.vendorCodeSnapshot || item.vendorId || item.vendorFirestoreId || "—"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Grand Total</p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">₹ {money(item.grandTotal)}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-sm">
                  <LedgerMobile label="Fulfilled" value={item.fulfilledAmount} />
                  <LedgerMobile label="Billed" value={item.billedAmount} />
                  <LedgerMobile label="Paid" value={item.paidAmount} />
                  <LedgerMobile label="Outstanding" value={item.outstandingAmount} />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Created By</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{item.preparedBy?.name || "—"}</p>
                  </div>
                  {renderActions(item, status)}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function LedgerMobile({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">₹ {money(value)}</span>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-xl bg-white" />
      ))}
    </div>
  );
}
