"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  Plus,
  Save,
  Send,
  Trash2,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import { auth } from "@/lib/firebase";
import PurchaseOrderDocument, { money } from "../../components/PurchaseOrderDocument";
import PurchaseOrderCalculationService from "../../services/PurchaseOrderCalculationService";
import PurchaseOrderService from "../../services/PurchaseOrderService";
import {
  canEditPurchaseOrder,
  formatPurchaseOrderStatusLabel,
  normalizePurchaseOrderStatus,
  purchaseOrderStatusTone,
} from "../../services/PurchaseOrderStatusPolicy";

const today = new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const createItem = () => ({
  id: crypto.randomUUID(),
  lineNo: 1,
  description: "",
  hsnSac: "",
  quantity: 1,
  unit: "Nos",
  rate: 0,
  gstRate: 18,
  notes: "",
});

const initialForm = () => ({
  poNumber: "",
  poDate: today,
  expectedDeliveryDate: addDays(30),
  projectFirestoreId: "",
  projectId: "",
  vendorFirestoreId: "",
  vendorId: "",
  paymentTerms: "",
  scope: "",
  remarks: "",
  termsAndConditions: "",
  status: "draft",
  items: [createItem()],
});

const hydrateItems = (items) =>
  Array.isArray(items) && items.length
    ? items.map((item, index) => ({
        id: item.id || crypto.randomUUID(),
        lineNo: Number(item.lineNo || index + 1),
        description: item.description || "",
        hsnSac: item.hsnSac || "",
        quantity: Number(item.quantity ?? 1),
        unit: item.unit || "Nos",
        rate: Number(item.rate ?? 0),
        gstRate: Number(item.gstRate ?? 0),
        notes: item.notes || "",
      }))
    : [createItem()];

const input =
  "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export default function PurchaseOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrderId = searchParams.get("id") || "";
  const { company, currentUser, firebaseUser, access } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [initData, setInitData] = useState({
    company: null,
    settings: null,
    nextPurchaseOrderNumber: "Draft",
    financialYearKey: "",
    projects: [],
    vendors: [],
    purchaseOrder: null,
  });
  const [form, setForm] = useState(initialForm);
  const loadedId = useRef(null);
  const draftSignature = useRef("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const user = firebaseUser || auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await PurchaseOrderService.getInit(user, purchaseOrderId);
        if (!active) return;
        setInitData({
          company: data.company || null,
          settings: data.settings || null,
          nextPurchaseOrderNumber: data.nextPurchaseOrderNumber || "Draft",
          financialYearKey: data.financialYearKey || "",
          projects: Array.isArray(data.projects) ? data.projects : [],
          vendors: Array.isArray(data.vendors) ? data.vendors : [],
          purchaseOrder: data.purchaseOrder || null,
        });
      } catch (error) {
        console.error("Purchase order init failed", error);
        if (active) toast.error(error.message || "Unable to load purchase order data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    setLoading(true);
    load();

    return () => {
      active = false;
    };
  }, [company?.id, firebaseUser, purchaseOrderId]);

  useEffect(() => {
    const existing = initData.purchaseOrder;
    if (!existing) {
      const signature = [
        initData.nextPurchaseOrderNumber || "Draft",
        initData.settings?.defaultPaymentTerms || "",
        initData.settings?.defaultTermsAndConditions || initData.settings?.termsAndConditions || "",
        initData.settings?.defaultScope || "",
        initData.settings?.defaultRemarks || "",
      ].join("|");
      if (draftSignature.current === signature) return;
      draftSignature.current = signature;
      setForm({
        ...initialForm(),
        poNumber: initData.nextPurchaseOrderNumber || "Draft",
        paymentTerms: initData.settings?.defaultPaymentTerms || "",
        termsAndConditions:
          initData.settings?.defaultTermsAndConditions ||
          initData.settings?.termsAndConditions ||
          "",
        scope: initData.settings?.defaultScope || "",
        remarks: initData.settings?.defaultRemarks || "",
      });
      return;
    }

    if (loadedId.current === existing.id) return;
    loadedId.current = existing.id;
    setForm({
      poNumber: existing.poNumber || initData.nextPurchaseOrderNumber || "Draft",
      poDate: existing.poDate || today,
      expectedDeliveryDate: existing.expectedDeliveryDate || addDays(30),
      projectFirestoreId: existing.projectFirestoreId || "",
      projectId: existing.projectId || "",
      vendorFirestoreId: existing.vendorFirestoreId || "",
      vendorId: existing.vendorId || "",
      paymentTerms: existing.paymentTerms || "",
      scope: existing.scope || "",
      remarks: existing.remarks || "",
      termsAndConditions: existing.termsAndConditions || "",
      status: normalizePurchaseOrderStatus(existing.status),
      items: hydrateItems(existing.items),
    });
  }, [initData.nextPurchaseOrderNumber, initData.purchaseOrder, initData.settings]);

  const user = firebaseUser || auth.currentUser;
  const activeProject = useMemo(
    () =>
      initData.projects.find((item) => item.id === form.projectFirestoreId || item.projectId === form.projectId) ||
      null,
    [form.projectFirestoreId, form.projectId, initData.projects]
  );
  const activeVendor = useMemo(
    () =>
      initData.vendors.find((item) => item.id === form.vendorFirestoreId || item.vendorId === form.vendorId) ||
      null,
    [form.vendorFirestoreId, form.vendorId, initData.vendors]
  );

  const totals = useMemo(() => PurchaseOrderCalculationService.calculate(form), [form]);
  const preparedBy = useMemo(
    () => ({
      uid: currentUser?.uid || user?.uid || "",
      name: currentUser?.name || currentUser?.displayName || company?.ownerName || "Prepared By",
      role: access?.roleId || (access?.isOwner ? "owner" : "employee") || "employee",
    }),
    [currentUser, user, company?.ownerName, access]
  );
  const preview = useMemo(
    () => ({
      ...form,
      ...totals,
      poNumber: form.poNumber || initData.nextPurchaseOrderNumber || "Draft",
      status: normalizePurchaseOrderStatus(form.status),
      projectFirestoreId: activeProject?.id || form.projectFirestoreId,
      projectId: activeProject?.projectId || form.projectId,
      projectNumberSnapshot: activeProject?.projectId || activeProject?.projectNumber || activeProject?.projectCode || "",
      projectNameSnapshot: activeProject?.projectName || activeProject?.name || "",
      vendorFirestoreId: activeVendor?.id || form.vendorFirestoreId,
      vendorId: activeVendor?.vendorId || form.vendorId,
      vendorCodeSnapshot: activeVendor?.vendorId || activeVendor?.vendorCode || activeVendor?.code || "",
      vendorNameSnapshot: activeVendor?.vendorName || activeVendor?.companyName || activeVendor?.name || "",
      vendorContactSnapshot: activeVendor?.contactPerson || activeVendor?.phone || activeVendor?.email || "",
      preparedBy,
      approvedBy: initData.purchaseOrder?.approvedBy || null,
    }),
    [form, totals, initData.nextPurchaseOrderNumber, activeProject, activeVendor, preparedBy, initData.purchaseOrder?.approvedBy]
  );

  const canEdit = !initData.purchaseOrder || canEditPurchaseOrder(initData.purchaseOrder.status);
  const readOnly = Boolean(initData.purchaseOrder && !canEdit);

  const setField = (key, value) => {
    if (readOnly) return;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setItem = (id, key, value) => {
    if (readOnly) return;
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  const selectProject = (projectId) => {
    if (readOnly) return;
    const project = initData.projects.find((item) => item.id === projectId);
    if (!project) {
      setForm((current) => ({ ...current, projectFirestoreId: "", projectId: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      projectFirestoreId: project.id,
      projectId: project.projectId || project.id,
    }));
  };

  const selectVendor = (vendorId) => {
    if (readOnly) return;
    const vendor = initData.vendors.find((item) => item.id === vendorId);
    if (!vendor) {
      setForm((current) => ({ ...current, vendorFirestoreId: "", vendorId: "" }));
      return;
    }
    setForm((current) => ({
      ...current,
      vendorFirestoreId: vendor.id,
      vendorId: vendor.vendorId || vendor.id,
    }));
  };

  const validate = () => {
    if (!form.projectFirestoreId && !form.projectId) return "Select a project.";
    if (!form.vendorFirestoreId && !form.vendorId) return "Select a vendor.";
    if (!form.items.length) return "Add at least one line item.";
    for (const item of form.items) {
      if (!String(item.description || "").trim()) return "Enter every item description.";
      if (Number(item.quantity) <= 0) return "Quantity must be greater than zero.";
      if (Number(item.rate) < 0) return "Rate cannot be negative.";
      if (Number(item.gstRate) < 0 || Number(item.gstRate) > 100) return "GST rate must be between 0 and 100.";
    }
    return "";
  };

  const buildPayload = (status) => ({
    ...form,
    status,
    items: form.items.map((item, index) => ({
      ...item,
      lineNo: index + 1,
      quantity: Number(item.quantity || 0),
      rate: Number(item.rate || 0),
      gstRate: Number(item.gstRate || 0),
    })),
    projectFirestoreId: activeProject?.id || form.projectFirestoreId,
    projectId: activeProject?.projectId || form.projectId,
    vendorFirestoreId: activeVendor?.id || form.vendorFirestoreId,
    vendorId: activeVendor?.vendorId || form.vendorId,
    poNumber: form.poNumber || initData.nextPurchaseOrderNumber || "Draft",
    preparedBy,
  });

  const persist = async (status, mode = "create") => {
    const error = validate();
    if (error) {
      toast.error(error);
      return null;
    }
    const payload = buildPayload(status);
    const firebase = firebaseUser || auth.currentUser;
    if (!firebase) throw new Error("UNAUTHENTICATED");

    setSaving(true);
    try {
      let response;
      if (mode === "update" && initData.purchaseOrder?.id) {
        response = await PurchaseOrderService.update(firebase, initData.purchaseOrder.id, payload);
      } else {
        response = await PurchaseOrderService.create(firebase, payload);
      }
      return response;
    } catch (error) {
      toast.error(error.message || "Unable to save purchase order.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSaveDraft = async () => {
    if (readOnly) return;
    const response = await persist("draft", initData.purchaseOrder?.id ? "update" : "create");
    if (!response) return;
    toast.success(initData.purchaseOrder?.id ? "Purchase order updated." : "Purchase order draft created.");
    router.push(`/manager/purchase-orders/${response.id}`);
  };

  const onSubmitForApproval = async () => {
    if (readOnly) return;
    const response = await persist(initData.purchaseOrder?.id ? "draft" : "pending_approval", initData.purchaseOrder?.id ? "update" : "create");
    if (!response) return;
    if (initData.purchaseOrder?.id) {
      setSubmitting(true);
      try {
        const firebase = firebaseUser || auth.currentUser;
        const submitted = await PurchaseOrderService.submit(firebase, initData.purchaseOrder.id);
        toast.success("Purchase order submitted for approval.");
        router.push(`/manager/purchase-orders/${submitted.id}`);
      } catch (error) {
        toast.error(error.message || "Unable to submit purchase order.");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    toast.success("Purchase order submitted for approval.");
    router.push(`/manager/purchase-orders/${response.id}`);
  };

  const previewLabel = form.poNumber || initData.nextPurchaseOrderNumber || "Draft";

  if (loading) {
    return (
      <div className="space-y-4 p-5">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/70" />
        ))}
      </div>
    );
  }

  if (company?.id && purchaseOrderId && !initData.purchaseOrder) {
    return <div className="p-10">Purchase order not found.</div>;
  }

  return (
    <form className="min-h-screen bg-slate-50/70 px-3 py-4 sm:px-6" onSubmit={(event) => event.preventDefault()}>
      <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/manager/purchase-orders")}
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Back to purchase orders"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {initData.purchaseOrder?.id ? "Edit Purchase Order" : "Create Purchase Order"}
            </h1>
            <p className="text-sm text-slate-500">
              Company-scoped PO draft with server-side numbering and workflow control
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"
          >
            <Eye size={17} />
            Preview
          </button>
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={saving || submitting || readOnly}
            className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50"
          >
            <Save size={17} />
            {saving && !submitting ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={onSubmitForApproval}
            disabled={saving || submitting || readOnly}
            className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={17} />
            {submitting ? "Submitting..." : "Submit for Approval"}
          </button>
        </div>
      </header>

      {readOnly && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This purchase order is <strong>{formatPurchaseOrderStatusLabel(initData.purchaseOrder?.status)}</strong> and can no longer be edited.
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">PO Information</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Project, vendor and date details
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-bold ${purchaseOrderStatusTone(form.status)}`}>
                {formatPurchaseOrderStatusLabel(form.status)}
              </span>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="PO Number">
                <input readOnly value={previewLabel} className={`${input} bg-slate-50`} />
              </Field>
              <Field label="PO Date">
                <input
                  required
                  type="date"
                  value={form.poDate}
                  disabled={readOnly}
                  onChange={(event) => setField("poDate", event.target.value)}
                  className={input}
                />
              </Field>
              <Field label="Expected Delivery Date">
                <input
                  type="date"
                  value={form.expectedDeliveryDate}
                  disabled={readOnly}
                  onChange={(event) => setField("expectedDeliveryDate", event.target.value)}
                  className={input}
                />
              </Field>
              <Field label="Project">
                <select
                  value={form.projectFirestoreId}
                  disabled={readOnly}
                  onChange={(event) => selectProject(event.target.value)}
                  className={input}
                >
                  <option value="">Select project</option>
                  {initData.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {(project.projectNameSnapshot || project.projectName || project.name || "Project")} · {(project.projectNumberSnapshot || project.projectId || project.id || "")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Vendor">
                <select
                  value={form.vendorFirestoreId}
                  disabled={readOnly}
                  onChange={(event) => selectVendor(event.target.value)}
                  className={input}
                >
                  <option value="">Select vendor</option>
                  {initData.vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {(vendor.vendorNameSnapshot || vendor.vendorName || vendor.companyName || vendor.name || "Vendor")} · {(vendor.vendorCodeSnapshot || vendor.vendorId || vendor.id || "")}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900">Items / Services</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Add PO line items with GST and amount calculations
                </p>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        { ...createItem(), lineNo: current.items.length + 1 },
                      ],
                    }))
                  }
                  className="flex items-center gap-1.5 text-sm font-bold text-indigo-600"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              )}
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-2 flex justify-between">
                    <span className="text-xs font-bold text-slate-500">ITEM {index + 1}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        disabled={form.items.length === 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            items: current.items.filter((row) => row.id !== item.id),
                          }))
                        }
                        className="text-red-500 disabled:opacity-30"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="sm:col-span-2 lg:col-span-6">
                      <Field label="Description">
                        <textarea
                          required
                          value={item.description}
                          disabled={readOnly}
                          onChange={(event) => setItem(item.id, "description", event.target.value)}
                          className={`${input} h-20 py-3`}
                        />
                      </Field>
                    </div>
                    <Field label="HSN/SAC">
                      <input
                        value={item.hsnSac}
                        disabled={readOnly}
                        onChange={(event) => setItem(item.id, "hsnSac", event.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="Qty">
                      <input
                        required
                        min="0.01"
                        step="0.01"
                        type="number"
                        value={item.quantity}
                        disabled={readOnly}
                        onChange={(event) => setItem(item.id, "quantity", event.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="Unit">
                      <input
                        value={item.unit}
                        disabled={readOnly}
                        onChange={(event) => setItem(item.id, "unit", event.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="Rate">
                      <input
                        required
                        min="0"
                        step="0.01"
                        type="number"
                        value={item.rate}
                        disabled={readOnly}
                        onChange={(event) => setItem(item.id, "rate", event.target.value)}
                        className={input}
                      />
                    </Field>
                    <Field label="GST %">
                      <input
                        min="0"
                        max="100"
                        step="0.01"
                        type="number"
                        value={item.gstRate}
                        disabled={readOnly}
                        onChange={(event) => setItem(item.id, "gstRate", event.target.value)}
                        className={input}
                      />
                    </Field>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Metric label="Taxable Amount" value={`₹ ${money(Number(item.quantity || 0) * Number(item.rate || 0))}`} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Metric label="GST" value={`₹ ${money((Number(item.quantity || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100)}`} />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-6">
                      <Field label="Notes">
                        <input
                          value={item.notes}
                          disabled={readOnly}
                          onChange={(event) => setItem(item.id, "notes", event.target.value)}
                          className={input}
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4">
              <h2 className="font-bold text-slate-900">Commercial Details</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Commercial terms and project scope
              </p>
            </header>
            <div className="grid gap-4">
              <Field label="Payment Terms">
                <textarea
                  value={form.paymentTerms}
                  disabled={readOnly}
                  onChange={(event) => setField("paymentTerms", event.target.value)}
                  className={`${input} h-24 py-3`}
                />
              </Field>
              <Field label="Scope">
                <textarea
                  value={form.scope}
                  disabled={readOnly}
                  onChange={(event) => setField("scope", event.target.value)}
                  className={`${input} h-24 py-3`}
                />
              </Field>
              <Field label="Remarks">
                <textarea
                  value={form.remarks}
                  disabled={readOnly}
                  onChange={(event) => setField("remarks", event.target.value)}
                  className={`${input} h-24 py-3`}
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4">
              <h2 className="font-bold text-slate-900">Terms &amp; Conditions</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Simple multi-line terms and conditions
              </p>
            </header>
            <Field label="Terms & Conditions">
              <textarea
                value={form.termsAndConditions}
                disabled={readOnly}
                onChange={(event) => setField("termsAndConditions", event.target.value)}
                className={`${input} h-40 py-3`}
              />
            </Field>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4">
              <h2 className="font-bold text-slate-900">Summary</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Server will recompute totals on save
              </p>
            </header>
            <div className="ml-auto max-w-sm space-y-2 text-sm">
              <Total label="Subtotal" value={totals.subtotal} />
              <Total label="GST" value={totals.gstTotal} />
              <Total label="Grand Total" value={totals.grandTotal} strong />
            </div>
          </section>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-slate-200/70 p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800">Live Purchase Order Preview</h2>
              <p className="text-xs text-slate-500">A4 document · updates as you type</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-600"
            >
              Open full preview
            </button>
          </div>
          <div className="flex justify-center overflow-x-auto rounded-2xl bg-slate-100/60 p-3 sm:p-6">
            <PurchaseOrderDocument purchaseOrder={preview} company={company} />
          </div>
        </section>
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950/80 backdrop-blur-sm">
          <header className="flex shrink-0 items-center justify-between bg-white px-5 py-3">
            <div>
              <h2 className="font-bold">Purchase Order Preview</h2>
              <p className="text-xs text-slate-500">Review the final A4 document</p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
              aria-label="Close preview"
            >
              <X />
            </button>
          </header>
          <div className="flex-1 overflow-auto p-3 sm:p-8">
            <PurchaseOrderDocument purchaseOrder={preview} company={company} />
          </div>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
    </label>
  );
}

function Metric({ label, value }) {
  return (
    <div className="min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <strong className="mt-0.5 block break-words text-xs text-slate-700">{value || "—"}</strong>
    </div>
  );
}

function Total({ label, value, strong }) {
  return (
    <div className={`flex justify-between border-b border-slate-100 py-2 ${strong ? "text-base font-black text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>₹ {money(value)}</span>
    </div>
  );
}
