"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import VendorPaymentDialog from "../../vendors/components/VendorPaymentDialog";
import PurchaseOrderDocument, { money } from "../components/PurchaseOrderDocument";
import PurchaseOrderCalculationService from "../services/PurchaseOrderCalculationService";
import PurchaseOrderExportService from "../services/PurchaseOrderExportService";
import PurchaseOrderService from "../services/PurchaseOrderService";
import {
  canApprovePurchaseOrder,
  canBillPurchaseOrder,
  canCancelPurchaseOrder,
  canEditPurchaseOrder,
  canFulfillPurchaseOrder,
  canIssuePurchaseOrder,
  canRejectPurchaseOrder,
  canSubmitPurchaseOrder,
  formatPurchaseOrderStatusLabel,
  normalizePurchaseOrderStatus,
  purchaseOrderStatusTone,
} from "../services/PurchaseOrderStatusPolicy";

const today = new Date().toISOString().slice(0, 10);
const roundMoney = (value) => Math.round((Number(value ?? 0) + Number.EPSILON) * 100) / 100;

const emptyFulfillmentDraft = (purchaseOrder = {}, progress = null) => ({
  fulfillmentDate: today,
  referenceNumber: "",
  notes: "",
  items: (progress?.items || purchaseOrder?.items || []).map((item) => ({
    poItemId: item.id,
    quantity: "",
  })),
});

const emptyBillDraft = (purchaseOrder = {}, progress = null) => ({
  billNumber: "",
  billDate: today,
  attachmentUrl: "",
  remarks: "",
  items: (progress?.items || purchaseOrder?.items || []).map((item) => ({
    poItemId: item.id,
    quantity: "",
  })),
});

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

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { company, firebaseUser, can } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [fulfillmentOpen, setFulfillmentOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentBill, setPaymentBill] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [fulfillmentDraft, setFulfillmentDraft] = useState(emptyFulfillmentDraft());
  const [billDraft, setBillDraft] = useState(emptyBillDraft());
  const documentRef = useRef(null);
  const id = params?.id;

  const load = async () => {
    if (!company?.id || !firebaseUser || !id) return;
    setLoading(true);
    try {
      const data = await PurchaseOrderService.getPurchaseOrder(firebaseUser, id);
      const nextOrder = {
        ...(data.purchaseOrder || null),
        fulfillments: Array.isArray(data.fulfillments) ? data.fulfillments : [],
        bills: Array.isArray(data.bills) ? data.bills : [],
      };
      setPurchaseOrder(nextOrder);
      const progress = PurchaseOrderCalculationService.summarizeProgress(nextOrder);
      setFulfillmentDraft(emptyFulfillmentDraft(nextOrder, progress));
      setBillDraft(emptyBillDraft(nextOrder, progress));
    } catch (error) {
      toast.error(error.message || "Unable to load purchase order.");
      router.push("/manager/purchase-orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company?.id, firebaseUser, id]);

  const progress = useMemo(
    () => PurchaseOrderCalculationService.summarizeProgress(purchaseOrder || {}),
    [purchaseOrder]
  );
  const paidAmount = Number(purchaseOrder?.paidAmount || 0);
  const billOutstandingAmount = Number(purchaseOrder?.billOutstandingAmount || 0);
  const outstandingAmount = Number(purchaseOrder?.outstandingAmount || billOutstandingAmount || 0);
  const billPreview = useMemo(() => {
    const lines = billDraft.items.map((draftLine) => {
      const billQty = Number(draftLine.quantity || 0);
      if (!billQty || billQty <= 0) return null;
      const item = progress.items.find((entry) => entry.id === draftLine.poItemId);
      if (!item) return null;
      const taxableAmount = roundMoney(billQty * Number(item.rate || 0));
      const gstAmount = roundMoney((taxableAmount * Number(item.gstRate || 0)) / 100);
      const totalAmount = roundMoney(taxableAmount + gstAmount);
      return { taxableAmount, gstAmount, totalAmount };
    }).filter(Boolean);
    const subtotal = roundMoney(lines.reduce((sum, line) => sum + Number(line.taxableAmount || 0), 0));
    const gstTotal = roundMoney(lines.reduce((sum, line) => sum + Number(line.gstAmount || 0), 0));
    const grandTotal = roundMoney(lines.reduce((sum, line) => sum + Number(line.totalAmount || 0), 0));
    return { subtotal, gstTotal, grandTotal };
  }, [billDraft.items, progress.items]);

  useEffect(() => {
    if (!purchaseOrder?.id) return;
    setFulfillmentDraft(emptyFulfillmentDraft(purchaseOrder, progress));
    setBillDraft(emptyBillDraft(purchaseOrder, progress));
  }, [purchaseOrder?.id]);

  const run = async (label, action) => {
    if (!firebaseUser || !purchaseOrder) return;
    setBusy(label);
    try {
      const response = await action(firebaseUser, purchaseOrder.id);
      const nextOrder = {
        ...(response.purchaseOrder || purchaseOrder),
        fulfillments: purchaseOrder.fulfillments || [],
        bills: purchaseOrder.bills || [],
      };
      setPurchaseOrder(nextOrder);
      toast.success(`${label} completed.`);
      await load();
    } catch (error) {
      toast.error(error.message || "Action failed.");
    } finally {
      setBusy("");
    }
  };

  const printPurchaseOrder = async () => {
    if (!documentRef.current) {
      toast.error("Purchase order preview is not available.");
      return;
    }
    try {
      await PurchaseOrderExportService.printDocument(documentRef.current, purchaseOrder.poNumber || "purchase-order");
    } catch (error) {
      toast.error(error.message || "Unable to print purchase order.");
    }
  };

  const openFulfillment = () => {
    setFulfillmentDraft(emptyFulfillmentDraft(purchaseOrder, progress));
    setFulfillmentOpen(true);
  };

  const openBill = () => {
    setBillDraft(emptyBillDraft(purchaseOrder, progress));
    setBillOpen(true);
  };

  const updateFulfillmentQty = (poItemId, quantity) => {
    setFulfillmentDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.poItemId === poItemId ? { ...item, quantity } : item)),
    }));
  };

  const updateBillQty = (poItemId, quantity) => {
    setBillDraft((current) => ({
      ...current,
      items: current.items.map((item) => (item.poItemId === poItemId ? { ...item, quantity } : item)),
    }));
  };

  const submitFulfillment = async () => {
    if (!purchaseOrder) return;
    const items = fulfillmentDraft.items
      .map((item) => ({ poItemId: item.poItemId, quantity: Number(item.quantity || 0) }))
      .filter((item) => item.quantity > 0);
    if (!items.length) {
      toast.error("Enter at least one fulfillment quantity.");
      return;
    }
    setBusy("fulfill");
    try {
      await PurchaseOrderService.recordFulfillment(firebaseUser, purchaseOrder.id, {
        fulfillmentDate: fulfillmentDraft.fulfillmentDate,
        referenceNumber: fulfillmentDraft.referenceNumber,
        notes: fulfillmentDraft.notes,
        items,
      });
      toast.success("Fulfillment recorded.");
      setFulfillmentOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to record fulfillment.");
    } finally {
      setBusy("");
    }
  };

  const submitBill = async () => {
    if (!purchaseOrder) return;
    const items = billDraft.items
      .map((item) => ({ poItemId: item.poItemId, quantity: Number(item.quantity || 0) }))
      .filter((item) => item.quantity > 0);
    if (!billDraft.billNumber.trim()) {
      toast.error("Enter a vendor bill number.");
      return;
    }
    if (!items.length) {
      toast.error("Enter at least one bill quantity.");
      return;
    }
    setBusy("bill");
    try {
      await PurchaseOrderService.recordBill(firebaseUser, purchaseOrder.id, {
        billNumber: billDraft.billNumber,
        billDate: billDraft.billDate,
        attachmentUrl: billDraft.attachmentUrl,
        remarks: billDraft.remarks,
        items,
      });
      toast.success("Vendor bill recorded.");
      setBillOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || "Unable to record vendor bill.");
    } finally {
      setBusy("");
    }
  };

  if (loading) {
    return <div className="space-y-4 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/70" />)}</div>;
  }

  if (!purchaseOrder) {
    return <div className="p-10">Purchase order not found.</div>;
  }

  const status = normalizePurchaseOrderStatus(purchaseOrder.status);
  const canEdit = canEditPurchaseOrder(status) && can("purchase_order.edit");
  const canFulfill = canFulfillPurchaseOrder(status) && can("purchase_order.fulfill");
  const canBill = canBillPurchaseOrder(status) && can("purchase_order.bill");
  const canCancel = canCancelPurchaseOrder(status, purchaseOrder) && can("purchase_order.cancel");

  return (
    <div className="space-y-5 px-2 py-2 sm:px-5">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Purchase Order</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{purchaseOrder.poNumber || "Draft"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${purchaseOrderStatusTone(status)}`}>
              {formatPurchaseOrderStatusLabel(status)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Grand Total ₹ {money(purchaseOrder.grandTotal)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Fulfilled ₹ {money(progress.fulfilledAmount)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Billed ₹ {money(progress.billedAmount)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Paid ₹ {money(paidAmount)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
              Outstanding ₹ {money(outstandingAmount)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push("/manager/purchase-orders")}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Back
          </button>
          <button
            type="button"
            onClick={printPurchaseOrder}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            Print
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => router.push(`/manager/purchase-orders/new?id=${purchaseOrder.id}`)}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
            >
              Edit Draft
            </button>
          )}
          {status === "draft" && canSubmitPurchaseOrder(status) && can("purchase_order.edit") && (
            <button
              type="button"
              disabled={busy === "submit"}
              onClick={() => run("submit", (user, purchaseOrderId) => PurchaseOrderService.submit(user, purchaseOrderId))}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "submit" ? "Submitting..." : "Submit"}
            </button>
          )}
          {status === "pending_approval" && canApprovePurchaseOrder(status) && can("purchase_order.approve") && (
            <>
              <button
                type="button"
                disabled={busy === "approve"}
                onClick={() => run("approve", (user, purchaseOrderId) => PurchaseOrderService.approve(user, purchaseOrderId))}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === "approve" ? "Approving..." : "Approve"}
              </button>
              {canRejectPurchaseOrder(status) && (
                <button
                  type="button"
                  disabled={busy === "reject"}
                  onClick={() => run("reject", (user, purchaseOrderId) => PurchaseOrderService.reject(user, purchaseOrderId))}
                  className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy === "reject" ? "Rejecting..." : "Reject"}
                </button>
              )}
            </>
          )}
          {status === "approved" && canIssuePurchaseOrder(status) && can("purchase_order.issue") && (
            <button
              type="button"
              disabled={busy === "issue"}
              onClick={() => run("issue", (user, purchaseOrderId) => PurchaseOrderService.issue(user, purchaseOrderId))}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "issue" ? "Issuing..." : "Issue"}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              disabled={busy === "cancel"}
              onClick={() => run("cancel", (user, purchaseOrderId) => PurchaseOrderService.cancel(user, purchaseOrderId))}
              className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          )}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,56fr)_minmax(360px,44fr)]">
        <PurchaseOrderDocument ref={documentRef} purchaseOrder={purchaseOrder} company={company} />
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <section>
            <h2 className="font-bold text-slate-900">Summary</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Small label="Subtotal" value={purchaseOrder.subtotal} />
              <Small label="GST" value={purchaseOrder.gstTotal} />
              <Small label="Grand Total" value={purchaseOrder.grandTotal} />
              <Small label="Remaining" value={progress.remainingValue} />
            </div>
          </section>
          <section>
            <h2 className="font-bold text-slate-900">Metadata</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              <p><strong className="text-slate-800">Project:</strong> {purchaseOrder.projectNameSnapshot || purchaseOrder.projectNumberSnapshot || "—"}</p>
              <p><strong className="text-slate-800">Vendor:</strong> {purchaseOrder.vendorNameSnapshot || purchaseOrder.vendorCodeSnapshot || "—"}</p>
              <p><strong className="text-slate-800">Prepared By:</strong> {purchaseOrder.preparedBy?.name || "—"}</p>
              <p><strong className="text-slate-800">Approved By:</strong> {purchaseOrder.approvedBy?.name || "—"}</p>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {[
              ["overview", "Overview"],
              ["items", "Items"],
              ["fulfillment", "Fulfillment"],
              ["bills", "Bills"],
              ["audit", "Audit"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  activeTab === key
                    ? "bg-indigo-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {canFulfill && (
              <button
                type="button"
                onClick={openFulfillment}
                className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700"
              >
                Record Fulfillment
              </button>
            )}
            {canBill && (
              <button
                type="button"
                onClick={openBill}
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700"
              >
                Record Vendor Bill
              </button>
            )}
          </div>
        </div>

        <div className="p-4">
          {activeTab === "overview" && (
            <div className="grid gap-4 lg:grid-cols-4">
              <InfoCard label="PO Value" value={purchaseOrder.grandTotal} />
              <InfoCard label="Fulfilled" value={progress.fulfilledAmount} />
              <InfoCard label="Billed" value={progress.billedAmount} />
              <InfoCard label="Paid" value={paidAmount} />
              <InfoCard label="Bill Outstanding" value={billOutstandingAmount} />
              <InfoCard label="Remaining PO Value" value={progress.remainingValue} />
              <InfoCard label="Ordered Qty" value={progress.orderedQty} />
              <InfoCard label="Fulfilled Qty" value={progress.fulfilledQty} />
              <InfoCard label="Remaining Qty" value={progress.remainingQty} />
              <InfoCard label="Current Status" value={formatPurchaseOrderStatusLabel(progress.status)} />
            </div>
          )}

          {activeTab === "items" && (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Ordered</th>
                    <th className="px-4 py-3 text-right">Fulfilled</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Billed</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.items.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <strong className="block text-slate-800">{item.description || "—"}</strong>
                        <span className="text-xs text-slate-400">{item.hsnSac || ""}</span>
                      </td>
                      <td className="px-4 py-3 text-right">{money(item.quantity)}</td>
                      <td className="px-4 py-3 text-right">{money(item.fulfilledQty)}</td>
                      <td className="px-4 py-3 text-right">{money(item.remainingQty)}</td>
                      <td className="px-4 py-3 text-right">{money(item.billedQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "fulfillment" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                      <th className="px-4 py-3 text-left">Notes</th>
                      <th className="px-4 py-3 text-right">Lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseOrder.fulfillments || []).length ? purchaseOrder.fulfillments.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{formatDate(entry.fulfillmentDate || entry.createdAt)}</td>
                        <td className="px-4 py-3">{entry.referenceNumber || "—"}</td>
                        <td className="px-4 py-3">{entry.notes || "—"}</td>
                        <td className="px-4 py-3 text-right">{Array.isArray(entry.items) ? entry.items.length : 0}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="px-4 py-10 text-center text-slate-500">No fulfillment recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bills" && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Bill Date</th>
                      <th className="px-4 py-3 text-left">Bill Number</th>
                      <th className="px-4 py-3 text-right">Bill Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                      <th className="px-4 py-3 text-left">Payment Status</th>
                      <th className="px-4 py-3 text-left">Remarks</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseOrder.bills || []).length ? purchaseOrder.bills.map((entry) => (
                      <tr key={entry.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">{formatDate(entry.billDate || entry.createdAt)}</td>
                        <td className="px-4 py-3">{entry.billNumber || "—"}</td>
                        <td className="px-4 py-3 text-right">{money(entry.grandTotal)}</td>
                        <td className="px-4 py-3 text-right">{money(entry.paidAmount)}</td>
                        <td className="px-4 py-3 text-right">{money(entry.outstandingAmount)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                            entry.paymentStatus === "paid"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : entry.paymentStatus === "partially_paid"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}>
                            {entry.paymentStatus || "unpaid"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{entry.remarks || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {Number(entry.outstandingAmount || 0) > 0 && can("vendors.create") ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentBill(entry);
                                setPaymentOpen(true);
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                            >
                              Create Payment
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="px-4 py-10 text-center text-slate-500">No vendor bills recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-2">
              {(purchaseOrder.auditTrail || []).length ? purchaseOrder.auditTrail.slice().reverse().map((entry, index) => (
                <div key={`${entry.action}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-slate-800">{formatPurchaseOrderStatusLabel(entry.action)}</strong>
                    <span className="text-xs text-slate-500">{entry.byName || "System"} · {entry.at ? formatDate(entry.at) : "—"}</span>
                  </div>
                  {entry.notes && <p className="mt-1 text-xs text-slate-500">{entry.notes}</p>}
                </div>
              )) : (
                <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">No audit trail yet.</p>
              )}
            </div>
          )}
        </div>
      </section>

      {fulfillmentOpen && (
        <Dialog title="Record Fulfillment" onClose={() => setFulfillmentOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Fulfillment Date">
                <input
                  type="date"
                  value={fulfillmentDraft.fulfillmentDate}
                  onChange={(event) => setFulfillmentDraft((current) => ({ ...current, fulfillmentDate: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Reference Number">
                <input
                  value={fulfillmentDraft.referenceNumber}
                  onChange={(event) => setFulfillmentDraft((current) => ({ ...current, referenceNumber: event.target.value }))}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Notes">
              <textarea
                value={fulfillmentDraft.notes}
                onChange={(event) => setFulfillmentDraft((current) => ({ ...current, notes: event.target.value }))}
                className={`${inputClass} h-24 py-3`}
              />
            </Field>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Ordered</th>
                    <th className="px-4 py-3 text-right">Already Fulfilled</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                    <th className="px-4 py-3 text-right">Quantity to Fulfill</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.items.map((item) => {
                    const draftLine = fulfillmentDraft.items.find((row) => row.poItemId === item.id) || { quantity: "" };
                    return (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">
                          <strong className="block text-slate-800">{item.description || "—"}</strong>
                          <span className="text-xs text-slate-400">{item.hsnSac || ""}</span>
                        </td>
                        <td className="px-4 py-3 text-right">{money(item.quantity)}</td>
                        <td className="px-4 py-3 text-right">{money(item.fulfilledQty)}</td>
                        <td className="px-4 py-3 text-right">{money(item.remainingQty)}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={item.remainingQty}
                            value={draftLine.quantity}
                            onChange={(event) => updateFulfillmentQty(item.id, event.target.value)}
                            className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFulfillmentOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFulfillment}
                disabled={busy === "fulfill"}
                className="rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === "fulfill" ? "Saving..." : "Save Fulfillment"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {billOpen && (
        <Dialog title="Record Vendor Bill" onClose={() => setBillOpen(false)}>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vendor Bill Number">
                <input
                  value={billDraft.billNumber}
                  onChange={(event) => setBillDraft((current) => ({ ...current, billNumber: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Bill Date">
                <input
                  type="date"
                  value={billDraft.billDate}
                  onChange={(event) => setBillDraft((current) => ({ ...current, billDate: event.target.value }))}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Attachment URL">
              <input
                value={billDraft.attachmentUrl}
                onChange={(event) => setBillDraft((current) => ({ ...current, attachmentUrl: event.target.value }))}
                className={inputClass}
              />
            </Field>
            <Field label="Remarks">
              <textarea
                value={billDraft.remarks}
                onChange={(event) => setBillDraft((current) => ({ ...current, remarks: event.target.value }))}
                className={`${inputClass} h-24 py-3`}
              />
            </Field>
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-right">Fulfilled Qty</th>
                    <th className="px-4 py-3 text-right">Already Billed</th>
                    <th className="px-4 py-3 text-right">Available to Bill</th>
                    <th className="px-4 py-3 text-right">Bill Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {progress.items.map((item) => {
                    const draftLine = billDraft.items.find((row) => row.poItemId === item.id) || { quantity: "" };
                    return (
                      <tr key={item.id} className="border-t border-slate-200">
                        <td className="px-4 py-3">
                          <strong className="block text-slate-800">{item.description || "—"}</strong>
                          <span className="text-xs text-slate-400">{item.hsnSac || ""}</span>
                        </td>
                        <td className="px-4 py-3 text-right">{money(item.fulfilledQty)}</td>
                        <td className="px-4 py-3 text-right">{money(item.billedQty)}</td>
                        <td className="px-4 py-3 text-right">{money(item.billableQty)}</td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            max={item.billableQty}
                            value={draftLine.quantity}
                            onChange={(event) => updateBillQty(item.id, event.target.value)}
                            className="h-10 w-28 rounded-xl border border-slate-200 px-3 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <InfoCard label="Subtotal" value={billPreview.subtotal} />
              <InfoCard label="GST" value={billPreview.gstTotal} />
              <InfoCard label="Grand Total" value={billPreview.grandTotal} />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBillOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitBill}
                disabled={busy === "bill"}
                className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {busy === "bill" ? "Saving..." : "Save Bill"}
              </button>
            </div>
          </div>
        </Dialog>
      )}

      {paymentOpen && (
        <VendorPaymentDialog
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false);
            setPaymentBill(null);
          }}
          onSuccess={load}
          companyId={company?.id}
          vendors={[]}
          projects={[]}
          initialPurchaseOrder={purchaseOrder}
          initialPurchaseOrderBill={paymentBill}
        />
      )}
    </div>
  );
}

function Small({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <span className="block text-[10px] uppercase text-slate-400">{label}</span>
      <strong className="text-sm text-slate-900">{label === "Items" ? value : `₹ ${money(value)}`}</strong>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</span>
      <strong className="mt-2 block text-lg text-slate-900">
        {typeof value === "string" ? value : `₹ ${money(value)}`}
      </strong>
    </div>
  );
}

function Dialog({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-3 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">Server-enforced quantities and totals</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600"
          >
            Close
          </button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}
