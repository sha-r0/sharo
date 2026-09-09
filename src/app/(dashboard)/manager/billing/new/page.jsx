"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Plus, Save, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { auth } from "@/lib/firebase";
import useBillingData from "../hooks/useBillingData";
import invoiceService from "../services/InvoiceService";
import InvoiceCalculationService from "../services/InvoiceCalculationService";
import InvoiceDocument, { money } from "../components/InvoiceDocument";
import "../components/invoice.css";

const today = new Date().toISOString().slice(0, 10);
const dueDate = () => { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().slice(0, 10); };
const newItem = (hsnCode = "9983") => ({ id: crypto.randomUUID(), description: "", quantity: 1, rate: 0, hsnCode });
const initialForm = () => ({ type: "Tax Invoice", invoiceDate: today, dueDate: dueDate(), hsnCode: "9983", gstRate: 18, tdsRate: 0, discount: 0, discountType: "amount", items: [{ ...newItem(), description: "Professional services" }], terms: "Payment due within 30 days.", notes: "", bankDetails: { bankName: "", accountName: "", accountNumber: "", ifsc: "", upi: "" } });
const hydrate = (invoice) => ({ ...initialForm(), ...invoice, bankDetails: { ...initialForm().bankDetails, ...(invoice.bankDetails || {}) }, items: (invoice.items || []).map((item) => ({ ...newItem(invoice.hsnCode), ...item, id: item.id || crypto.randomUUID() })) });
const input = "mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export default function InvoiceBuilderPage({ searchParams }) {
  const query = use(searchParams);
  const { company, currentUser, firebaseUser } = useAuth();
  const router = useRouter();
  const data = useBillingData(company?.id, { includeSettings: false });
  const existing = data.invoices.find((item) => item.id === query.editId);
  const editing = Boolean(query.editId);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmEdit, setConfirmEdit] = useState(false);
  const [projectId, setProjectId] = useState(query.projectId || "");
  const [form, setForm] = useState(initialForm);
  const [billingInit, setBillingInit] = useState({ settings: null, nextInvoiceNumber: "Draft" });
  const [initLoading, setInitLoading] = useState(true);
  const hydratedId = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBillingInit() {
      if (!company?.id) {
        if (!cancelled) setInitLoading(false);
        return;
      }

      const user = firebaseUser || auth.currentUser;
      if (!user) {
        if (!cancelled) setInitLoading(false);
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/billing/init", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error((await response.json()).error || "BILLING_INIT_FAILED");
        const payload = await response.json();
        if (!cancelled) {
          setBillingInit({
            settings: payload.settings || null,
            nextInvoiceNumber: payload.nextInvoiceNumber || "Draft",
          });
        }
      } catch (error) {
        console.error("Billing init failed", error);
        if (!cancelled) {
          setBillingInit({ settings: null, nextInvoiceNumber: "Draft" });
        }
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    }

    setInitLoading(true);
    loadBillingInit();

    return () => {
      cancelled = true;
    };
  }, [company?.id, firebaseUser]);

  useEffect(() => {
    if (!editing || !existing || hydratedId.current === existing.id) return;
    hydratedId.current = existing.id;
    setProjectId(existing.projectId || "");
    setForm(hydrate(existing));
  }, [editing, existing]);

  const project = data.analytics.projects.find((item) => item.id === projectId);
  const client = data.clients.find((item) => item.id === project?.clientId || item.clientId === project?.clientId);
  useEffect(() => {
    if (!project || editing) return;
    setForm((current) => ({
      ...current,
      items: [{ ...current.items[0], description: `Professional services for ${project.projectName}`, rate: project.remainingBillable }],
      bankDetails: { ...current.bankDetails, ...(billingInit.settings?.bank || {}) },
      terms: billingInit.settings?.terms || current.terms,
    }));
  }, [project?.id, editing, billingInit.settings]);

  const totals = useMemo(() => InvoiceCalculationService.calculate(form), [form]);
  const snapshot = useMemo(() => ({ ...form, ...totals, invoiceNumber: existing?.invoiceNumber || billingInit.nextInvoiceNumber || "Draft", projectName: project?.projectName || existing?.projectName || "", projectBusinessId: project?.projectId || existing?.projectBusinessId || "", poNumber: project?.poNumber || existing?.poNumber || "", companySnapshot: existing?.companySnapshot || { companyName: company?.companyName, address: company?.companyAddress, email: company?.companyEmail, phone: company?.phone, gstNumber: company?.gstNumber, logoUrl: company?.logoUrl, signatureUrl: billingInit.settings?.signatureUrl || "" }, clientSnapshot: existing?.clientSnapshot || { name: client?.companyName || client?.clientName || project?.clientName || "", contactPerson: client?.contactPerson || "", address: client?.address || "", email: client?.email || "", phone: client?.phone || "", gstNumber: client?.gstNo || client?.gstNumber || "" } }), [form, totals, existing, project, client, company, billingInit]);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const itemUpdate = (id, key, value) => setForm((current) => ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  const percentage = (value) => { if (!project) return; const amount = Math.min(project.remainingBillable, project.contractValue * value / 100); itemUpdate(form.items[0].id, "rate", amount); update("type", value === 100 ? "Final Invoice" : "Partial Invoice"); };
  const persist = async () => {
    if (!project) return toast.error("Select a completed project.");
    setSaving(true);
    try {
      if (editing) {
        await invoiceService.update(company.id, existing.id, snapshot, { project, client, user: currentUser, original: existing });
        toast.success(`Invoice ${existing.invoiceNumber} updated.`);
        router.push(`/manager/billing/${existing.id}`);
      } else {
        const result = await invoiceService.create(company.id, snapshot, { project, client, user: currentUser, remainingBillable: project.remainingBillable, contractValue: project.contractValue });
        toast.success(`Invoice ${result.invoiceNumber} created.`);
        router.push(`/manager/billing/${result.id}`);
      }
    } catch (error) { toast.error(error.message); } finally { setSaving(false); }
  };
  const submit = async (event) => {
    event.preventDefault();
    const paid = Number(existing?.paidAmount || 0);
    const totalChanged = editing && Math.abs(Number(existing?.receivable ?? existing?.invoiceAmount ?? 0) - totals.receivable) > 0.009;
    if (paid > 0 && totals.receivable + 0.001 < paid) return toast.error("Invoice total cannot be lower than payments already received.");
    if (paid > 0 && totalChanged) return setConfirmEdit(true);
    await persist();
  };

  if (data.loading || initLoading) return <div className="space-y-4 p-5">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/70" />)}</div>;
  if (editing && !existing) return <div className="p-10">Invoice not found.</div>;
  return <form onSubmit={submit} className="invoice-no-print min-h-screen bg-slate-50/70 px-3 py-4 sm:px-6">
    <header className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><button type="button" onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Back to billing"><ArrowLeft size={18} /></button><div><h1 className="text-xl font-bold text-slate-900">{editing ? "Edit Invoice" : "Invoice Builder"}</h1><p className="text-sm text-slate-500">Create a compliant, project-linked GST invoice</p></div></div>
      <div className="flex gap-2"><button type="button" onClick={() => setPreviewOpen(true)} className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700"><Eye size={17} />Preview</button><button disabled={saving} className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"><Save size={17} />{saving ? "Saving..." : editing ? "Update Invoice" : "Create Invoice"}</button></div>
    </header>
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,44fr)_minmax(540px,56fr)]">
      <div className="space-y-4">
        <Card title="Invoice Details" description="Project, document type and billing dates."><div className="grid gap-4 sm:grid-cols-2"><Field label="Completed project"><select required value={projectId} onChange={(event) => setProjectId(event.target.value)} className={input}><option value="">Select project</option>{data.analytics.projects.filter((item) => item.id === existing?.projectId || (item.remainingBillable > 0 && item.billingStatus !== "cancelled")).map((item) => <option key={item.id} value={item.id}>{item.projectName} · ₹ {money(item.remainingBillable)} remaining</option>)}</select></Field><Field label="Invoice type"><select value={form.type} onChange={(event) => update("type", event.target.value)} className={input}>{["Tax Invoice", "Proforma Invoice", "Commercial Invoice", "Debit Note", "Credit Note", "Partial Invoice", "Final Invoice"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Invoice date"><input required type="date" value={form.invoiceDate} onChange={(event) => update("invoiceDate", event.target.value)} className={input} /></Field><Field label="Due date"><input required type="date" value={form.dueDate} onChange={(event) => update("dueDate", event.target.value)} className={input} /></Field></div>{project && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="Client" value={project.clientName} /><Metric label="PO / Project" value={project.poNumber || project.projectId} /><Metric label="Contract" value={`₹ ${money(project.contractValue)}`} /><Metric label="Remaining" value={`₹ ${money(project.remainingBillable)}`} /></div>}<div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-slate-500">Quick billing</span>{[20, 40, 60, 80, 100].map((value) => <button type="button" key={value} disabled={!project || editing} onClick={() => percentage(value)} className="rounded-lg border bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">{value}%</button>)}</div></Card>
        <Card title="Customer / Bill To" description="Automatically populated from the selected project client."><div className="grid gap-3 sm:grid-cols-2"><Metric label="Customer" value={snapshot.clientSnapshot.name || "Select a project"} /><Metric label="GSTIN" value={snapshot.clientSnapshot.gstNumber || "—"} /><Metric label="Contact" value={[snapshot.clientSnapshot.email, snapshot.clientSnapshot.phone].filter(Boolean).join(" · ") || "—"} /><Metric label="Billing & shipping address" value={snapshot.clientSnapshot.address || "—"} /></div></Card>
        <Card title="Items & Services" description="Add the services covered by this invoice." action={<button type="button" onClick={() => update("items", [...form.items, newItem(form.hsnCode)])} className="flex items-center gap-1.5 text-sm font-bold text-indigo-600"><Plus size={16} />Add item</button>}><div className="space-y-3">{form.items.map((item, index) => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"><div className="mb-2 flex justify-between"><span className="text-xs font-bold text-slate-500">ITEM {index + 1}</span><button type="button" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((row) => row.id !== item.id))} className="text-red-500 disabled:opacity-30" aria-label={`Remove item ${index + 1}`}><Trash2 size={16} /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><div className="sm:col-span-2 lg:col-span-6"><Field label="Description"><textarea required value={item.description} onChange={(event) => itemUpdate(item.id, "description", event.target.value)} className={`${input} h-20 py-3`} /></Field></div><Field label="HSN/SAC"><input value={item.hsnCode} onChange={(event) => itemUpdate(item.id, "hsnCode", event.target.value)} className={input} /></Field><Field label="Qty"><input required min=".01" step=".01" type="number" value={item.quantity} onChange={(event) => itemUpdate(item.id, "quantity", event.target.value)} className={input} /></Field><Field label="Rate"><input required min="0" step=".01" type="number" value={item.rate} onChange={(event) => itemUpdate(item.id, "rate", event.target.value)} className={input} /></Field><div className="lg:col-span-3"><Metric label="Amount" value={`₹ ${money(Number(item.quantity ?? 0) * Number(item.rate ?? 0))}`} /></div></div></div>)}</div></Card>
        <Card title="Tax & Totals" description="Existing invoice calculation logic is applied automatically."><div className="grid gap-4 sm:grid-cols-3"><Field label="Discount"><input min="0" type="number" value={form.discount} onChange={(event) => update("discount", event.target.value)} className={input} /></Field><Field label="GST %"><input min="0" type="number" value={form.gstRate} onChange={(event) => update("gstRate", event.target.value)} className={input} /></Field><Field label="TDS %"><input min="0" type="number" value={form.tdsRate} onChange={(event) => update("tdsRate", event.target.value)} className={input} /></Field></div><div className="mt-5 ml-auto max-w-sm space-y-2 text-sm"><Total label="Subtotal" value={totals.subtotal} /><Total label="CGST" value={totals.gst / 2} /><Total label="SGST" value={totals.gst / 2} /><Total label="Grand Total" value={totals.invoiceAmount} strong /></div></Card>
        <Card title="Payment, Bank & Declaration" description="Commercial terms and remittance information."><div className="space-y-4"><Field label="Payment terms"><textarea value={form.terms} onChange={(event) => update("terms", event.target.value)} className={`${input} h-24 py-3`} /></Field><Field label="Declaration / Notes"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className={`${input} h-24 py-3`} /></Field><div className="grid gap-4 sm:grid-cols-2">{Object.entries({ accountName: "Account holder", bankName: "Bank name", accountNumber: "Account number", ifsc: "Branch / IFSC" }).map(([key, label]) => <Field key={key} label={label}><input value={form.bankDetails[key] || ""} onChange={(event) => setForm((current) => ({ ...current, bankDetails: { ...current.bankDetails, [key]: event.target.value } }))} className={input} /></Field>)}</div></div></Card>
      </div>
      <aside className="sticky top-4 hidden max-h-[calc(100vh-32px)] overflow-auto rounded-2xl border border-slate-200 bg-slate-200/70 p-4 xl:block"><div className="mb-3 flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Live Invoice Preview</h2><p className="text-xs text-slate-500">A4 document · updates as you type</p></div><button type="button" onClick={() => setPreviewOpen(true)} className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-indigo-600">Open full preview</button></div><div className="origin-top-left scale-[.68] 2xl:scale-[.78]"><InvoiceDocument invoice={snapshot} company={company} /></div></aside>
    </div>
    {previewOpen && <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950/80 backdrop-blur-sm"><header className="flex shrink-0 items-center justify-between bg-white px-5 py-3"><div><h2 className="font-bold">Invoice Preview</h2><p className="text-xs text-slate-500">Review the final A4 document</p></div><button type="button" onClick={() => setPreviewOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100" aria-label="Close preview"><X /></button></header><div className="flex-1 overflow-auto p-3 sm:p-8"><InvoiceDocument invoice={snapshot} company={company} /></div></div>}
    {confirmEdit && <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/45 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 className="font-bold text-slate-900">Confirm financial change</h2><p className="mt-2 text-sm leading-6 text-slate-600">This invoice already has ₹ {money(existing.paidAmount)} in recorded payments. The invoice total will change from ₹ {money(existing.receivable ?? existing.invoiceAmount)} to ₹ {money(totals.receivable)}. Existing payment transactions will remain unchanged.</p><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmEdit(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Review</button><button type="button" onClick={() => { setConfirmEdit(false); persist(); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">Confirm Update</button></div></div></div>}
  </form>;
}

function Card({ title, description, action, children }) { return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><header className="mb-4 flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{description}</p></div>{action}</header>{children}</section>; }
function Field({ label, children }) { return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>; }
function Metric({ label, value }) { return <div className="min-h-14 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span><strong className="mt-0.5 block break-words text-xs text-slate-700">{value || "—"}</strong></div>; }
function Total({ label, value, strong }) { return <div className={`flex justify-between border-b border-slate-100 py-2 ${strong ? "text-base font-black text-slate-900" : "text-slate-600"}`}><span>{label}</span><span>₹ {money(value)}</span></div>; }
