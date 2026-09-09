"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import { normalizePurchaseOrderStatus } from "@/lib/purchase-orders";
import PurchaseOrderService from "../../purchase-orders/services/PurchaseOrderService";
import vendorRepository from "../services/VendorRepository";

const today = new Date().toISOString().slice(0, 10);
const input = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";

const createForm = (initialVendor = null) => ({
  vendorId: initialVendor?.id || "",
  projectId: "",
  amount: "",
  date: today,
  referenceNumber: "",
  remarks: "",
  managerApproved: false,
});

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function VendorPaymentDialog({
  open,
  onClose,
  onSuccess,
  companyId,
  vendors,
  projects,
  initialVendor,
  initialPurchaseOrder,
  initialPurchaseOrderBill,
}) {
  const { currentUser, firebaseUser, can } = useAuth();
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState(initialPurchaseOrderBill ? "purchase_order_bill" : "general");
  const [form, setForm] = useState(() => createForm(initialVendor));
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [purchaseOrderLoading, setPurchaseOrderLoading] = useState(false);
  const [purchaseOrderError, setPurchaseOrderError] = useState("");
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState(initialPurchaseOrder?.id || "");
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState(initialPurchaseOrder || null);
  const [selectedBillId, setSelectedBillId] = useState(initialPurchaseOrderBill?.id || "");

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setPurchaseOrderError("");
    if (initialPurchaseOrderBill) {
      setSource("purchase_order_bill");
      setSelectedPurchaseOrderId(initialPurchaseOrder?.id || "");
      setSelectedPurchaseOrder(initialPurchaseOrder || null);
      setSelectedBillId(initialPurchaseOrderBill.id || "");
      setForm({
        ...createForm(),
        vendorId: initialPurchaseOrder?.vendorFirestoreId || initialPurchaseOrder?.vendorId || "",
        projectId: initialPurchaseOrder?.projectFirestoreId || initialPurchaseOrder?.projectId || "",
        amount: String(initialPurchaseOrderBill.outstandingAmount ?? initialPurchaseOrderBill.grandTotal ?? ""),
        referenceNumber: initialPurchaseOrderBill.billNumber || "",
        remarks: "",
        managerApproved: false,
      });
      return;
    }

    setSource("general");
    setSelectedPurchaseOrderId("");
    setSelectedPurchaseOrder(null);
    setSelectedBillId("");
    setForm(createForm(initialVendor));
  }, [open, initialVendor, initialPurchaseOrder, initialPurchaseOrderBill]);

  useEffect(() => {
    if (!open || source !== "purchase_order_bill" || !firebaseUser || initialPurchaseOrderBill) return undefined;
    let active = true;
    setPurchaseOrderLoading(true);
    setPurchaseOrderError("");
    PurchaseOrderService.getList(firebaseUser)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data.purchaseOrders) ? data.purchaseOrders : [];
        setPurchaseOrders(list.filter((item) => {
          const status = normalizePurchaseOrderStatus(item.status);
          return ["approved", "issued", "partially_fulfilled", "completed"].includes(status);
        }));
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Purchase order list unavailable for vendor payment linking:", error);
        setPurchaseOrderError(error.message || "Unable to load purchase orders.");
        setPurchaseOrders([]);
      })
      .finally(() => {
        if (active) setPurchaseOrderLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, source, firebaseUser, initialPurchaseOrderBill]);

  useEffect(() => {
    if (!open || source !== "purchase_order_bill" || !firebaseUser || !selectedPurchaseOrderId || initialPurchaseOrderBill) return undefined;
    let active = true;
    setPurchaseOrderLoading(true);
    setPurchaseOrderError("");
    PurchaseOrderService.getPurchaseOrder(firebaseUser, selectedPurchaseOrderId)
      .then((data) => {
        if (!active) return;
        setSelectedPurchaseOrder(data.purchaseOrder || null);
      })
      .catch((error) => {
        if (!active) return;
        console.warn("Purchase order detail unavailable for vendor payment linking:", error);
        setPurchaseOrderError(error.message || "Unable to load purchase order bills.");
        setSelectedPurchaseOrder(null);
        setSelectedBillId("");
      })
      .finally(() => {
        if (active) setPurchaseOrderLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, source, firebaseUser, selectedPurchaseOrderId, initialPurchaseOrderBill]);

  const isLinkedPayment = source === "purchase_order_bill";

  const selectedBills = useMemo(() => {
    if (!selectedPurchaseOrder?.bills) return [];
    return selectedPurchaseOrder.bills.filter((bill) => Number(bill.outstandingAmount ?? 0) > 0 || bill.id === selectedBillId);
  }, [selectedPurchaseOrder, selectedBillId]);

  const selectedBill = useMemo(
    () => selectedBills.find((bill) => bill.id === selectedBillId) || null,
    [selectedBills, selectedBillId],
  );

  const billOutstanding = Number(selectedBill?.outstandingAmount ?? 0);
  const billTotal = Number(selectedBill?.grandTotal ?? selectedBill?.billTotal ?? 0);
  const billPaid = Number(selectedBill?.paidAmount ?? 0);
  const billReference = selectedBill?.billNumber || "";
  const billFullyPaid = isLinkedPayment && billOutstanding <= 0;

  useEffect(() => {
    if (!isLinkedPayment || !selectedPurchaseOrder) return;
    setForm((current) => ({
      ...current,
      vendorId: selectedPurchaseOrder.vendorFirestoreId || selectedPurchaseOrder.vendorId || current.vendorId,
      projectId: selectedPurchaseOrder.projectFirestoreId || selectedPurchaseOrder.projectId || current.projectId,
      amount: selectedBill
        ? String(selectedBill.outstandingAmount ?? selectedBill.grandTotal ?? current.amount ?? "")
        : current.amount,
      referenceNumber: selectedBill?.billNumber || current.referenceNumber,
      managerApproved: false,
    }));
  }, [isLinkedPayment, selectedPurchaseOrder, selectedBill]);

  if (!open) return null;

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const availableProjects = useMemo(
    () =>
      projects.filter((project) =>
        (project.vendors || []).some((item) => item.vendorId === form.vendorId || item.firestoreId === form.vendorId),
      ),
    [projects, form.vendorId],
  );

  const assignment = availableProjects.find((item) => item.id === form.projectId)?.vendors?.find((item) => item.vendorId === form.vendorId || item.firestoreId === form.vendorId);
  const allocated = Number(assignment?.allocatedAmount || 0);
  const paid = Number(assignment?.paidAmount || 0);
  const next = paid + Number(form.amount || 0);
  const exceedsAllocation = next > allocated;
  const exceedsBill = isLinkedPayment && Number(form.amount || 0) > billOutstanding + 0.0001;
  const canLoadPOOptions = !initialPurchaseOrderBill && can("purchase_order.view");

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        source: isLinkedPayment ? "purchase_order_bill" : "project_vendor",
      };

      if (isLinkedPayment) {
        if (!selectedPurchaseOrder || !selectedBill) {
          throw new Error("Select a purchase order bill.");
        }
        payload.purchaseOrderId = selectedPurchaseOrder.id;
        payload.purchaseOrderBillId = selectedBill.id;
        payload.purchaseOrderNumber = selectedPurchaseOrder.poNumber || "";
        payload.purchaseOrderBillNumber = selectedBill.billNumber || "";
        payload.billTotal = billTotal;
        payload.billOutstandingAmount = billOutstanding;
        payload.vendorId = selectedPurchaseOrder.vendorFirestoreId || selectedPurchaseOrder.vendorId || form.vendorId;
        payload.projectId = selectedPurchaseOrder.projectFirestoreId || selectedPurchaseOrder.projectId || form.projectId;
        payload.managerApproved = false;
        payload.amount = Number(form.amount || 0);
      }

      const response = await vendorRepository.createPayment(companyId, payload, currentUser);
      toast.success("Vendor payment recorded.");
      if (typeof onSuccess === "function") {
        onSuccess(response);
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Payment failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-2xl rounded-3xl bg-[#F9FAFC] shadow-2xl">
        <header className="flex items-center justify-between border-b bg-white p-5">
          <div>
            <h2 className="text-xl font-bold">Vendor payment</h2>
            <p className="text-xs text-slate-500">
              Payments update vendor and project balances automatically
            </p>
          </div>
          <button type="button" onClick={onClose}>
            <X />
          </button>
        </header>

        <div className="space-y-5 p-5">
          {!initialPurchaseOrderBill && canLoadPOOptions && (
            <label className="block text-xs font-bold">
              Payment source
              <select
                value={source}
                onChange={(event) => {
                  const nextSource = event.target.value;
                  setSource(nextSource);
                  if (nextSource === "general") {
                    setSelectedPurchaseOrderId("");
                    setSelectedPurchaseOrder(null);
                    setSelectedBillId("");
                    setForm(createForm(initialVendor));
                  }
                }}
                className={input}
              >
                <option value="general">General vendor payment</option>
                <option value="purchase_order_bill">Purchase order bill</option>
              </select>
            </label>
          )}

          {isLinkedPayment ? (
            <div className="space-y-4">
              {!initialPurchaseOrderBill && (
                <label className="block text-xs font-bold">
                  Purchase order
                  <select
                    required
                    value={selectedPurchaseOrderId}
                    onChange={(event) => {
                      setSelectedPurchaseOrderId(event.target.value);
                      setSelectedBillId("");
                      setSelectedPurchaseOrder(
                        purchaseOrders.find((item) => item.id === event.target.value) || null,
                      );
                    }}
                    className={input}
                  >
                    <option value="">Select purchase order</option>
                    {purchaseOrders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.poNumber || "Draft"} • {item.projectNameSnapshot || item.projectName || "Project"}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {purchaseOrderLoading && (
                <p className="text-sm text-slate-500">Loading purchase order bills...</p>
              )}

              {purchaseOrderError && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  {purchaseOrderError}
                </p>
              )}

              {selectedPurchaseOrder && (
                <>
                  <div className="grid gap-3 rounded-2xl bg-white p-4 text-sm sm:grid-cols-3">
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Vendor</span>
                      <strong className="block text-slate-800">
                        {selectedPurchaseOrder.vendorNameSnapshot || selectedPurchaseOrder.vendorCodeSnapshot || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">Project</span>
                      <strong className="block text-slate-800">
                        {selectedPurchaseOrder.projectNameSnapshot || selectedPurchaseOrder.projectNumberSnapshot || "—"}
                      </strong>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase tracking-wide text-slate-400">PO Number</span>
                      <strong className="block text-slate-800">{selectedPurchaseOrder.poNumber || "Draft"}</strong>
                    </div>
                  </div>

                  <label className="block text-xs font-bold">
                    Purchase order bill
                    <select
                      required
                      value={selectedBillId}
                      onChange={(event) => setSelectedBillId(event.target.value)}
                      className={input}
                    >
                      <option value="">Select purchase order bill</option>
                      {selectedBills.map((bill) => (
                        <option key={bill.id} value={bill.id}>
                          {bill.billNumber || bill.referenceNumber || bill.id} • Outstanding {money(bill.outstandingAmount)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedBill && (
                    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center text-xs sm:grid-cols-4">
                      <span>
                        Bill total
                        <strong className="block text-sm">{money(billTotal)}</strong>
                      </span>
                      <span>
                        Already paid
                        <strong className="block text-sm">{money(billPaid)}</strong>
                      </span>
                      <span>
                        Outstanding
                        <strong className="block text-sm">{money(billOutstanding)}</strong>
                      </span>
                      <span>
                        Bill ref
                        <strong className="block text-sm">{billReference || "—"}</strong>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold">
                Vendor
                <select
                  required
                  value={form.vendorId}
                  onChange={(event) => {
                    update("vendorId", event.target.value);
                    update("projectId", "");
                  }}
                  className={input}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.companyName || item.vendorName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold">
                Assigned project
                <select
                  required
                  value={form.projectId}
                  onChange={(event) => update("projectId", event.target.value)}
                  className={input}
                >
                  <option value="">Select project</option>
                  {availableProjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.projectName}
                    </option>
                  ))}
                </select>
              </label>

              {assignment && (
                <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-4 text-center text-xs">
                  <span>
                    Allocated
                    <strong className="block text-sm">₹{allocated.toLocaleString("en-IN")}</strong>
                  </span>
                  <span>
                    Paid
                    <strong className="block text-sm">₹{paid.toLocaleString("en-IN")}</strong>
                  </span>
                  <span>
                    Remaining
                    <strong className="block text-sm">₹{Math.max(0, allocated - paid).toLocaleString("en-IN")}</strong>
                  </span>
                </div>
              )}
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold">
              Amount
              <input
                required
                min="0.01"
                max={isLinkedPayment ? Math.max(0, billOutstanding) : undefined}
                step="0.01"
                type="number"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                className={input}
              />
            </label>
            <label className="block text-xs font-bold">
              Date
              <input
                required
                type="date"
                value={form.date}
                onChange={(event) => update("date", event.target.value)}
                className={input}
              />
            </label>
            <label className="block text-xs font-bold">
              Reference
              <input
                value={form.referenceNumber}
                onChange={(event) => update("referenceNumber", event.target.value)}
                className={input}
              />
            </label>
            <label className="block text-xs font-bold">
              Remarks
              <input
                value={form.remarks}
                onChange={(event) => update("remarks", event.target.value)}
                className={input}
              />
            </label>
          </div>

          {!isLinkedPayment && exceedsAllocation && (
            <label className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <input
                type="checkbox"
                checked={form.managerApproved}
                onChange={(event) => update("managerApproved", event.target.checked)}
              />
              <span>
                This payment exceeds allocation by ₹{(next - allocated).toLocaleString("en-IN")}. Confirm manager approval to continue.
              </span>
            </label>
          )}

          {isLinkedPayment && exceedsBill && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              Payment cannot exceed the outstanding purchase order bill amount.
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t bg-white p-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border px-5 py-2.5 font-bold"
          >
            Cancel
          </button>
          <button
            disabled={
            saving ||
            (!isLinkedPayment && exceedsAllocation && !form.managerApproved) ||
            (isLinkedPayment && exceedsBill) ||
            billFullyPaid ||
            (isLinkedPayment && !selectedPurchaseOrder) ||
            (isLinkedPayment && !selectedBill)
          }
            className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-40"
          >
            {saving ? "Processing..." : "Create payment"}
          </button>
        </footer>
      </form>
    </div>
  );
}
