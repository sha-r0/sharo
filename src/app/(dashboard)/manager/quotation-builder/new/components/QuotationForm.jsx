"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FileText, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import BuilderHeader from "./BuilderHeader";
import QuotationPreview from "./QuotationPreview";
import QuotationService from "../../services/QuotationService";
import QuotationCalculationService from "../../services/QuotationCalculationService";
import QuotationExportService from "../../services/QuotationExportService";

const neo = "border border-white/80 bg-[#F9FAFC] shadow-[0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";
const newItem = () => ({ id: crypto.randomUUID(), description: "", subDescriptions: [], hsn: "", qty: 1, unit: "Nos", rate: 0, discount: 0, gst: 18 });
const initialForm = { quotationNumber: "", quotationDate: new Date().toISOString().slice(0, 10), validUntil: "", subject: "", reference: "", salesPerson: "", projectName: "", clientId: "", clientName: "", contactPerson: "", email: "", phone: "", gstNumber: "", billingAddress: "", shippingAddress: "", gstType: "CGST", taxMode: "cgst_sgst", items: [], terms: [], paymentTerms: "", deliveryTerms: "", warranty: "", notes: "", declaration: "", freight: 0, packing: 0, installation: 0, transportation: 0, otherCharges: 0, template: "modern", status: "Draft" };
const addressText = (value) => typeof value === "object" && value ? [value.line1, value.line2, value.city, value.state, value.pincode, value.country].filter(Boolean).join(", ") : value || "";
const legacyTerms = (source) => [source.paymentTerms, source.deliveryTerms, source.warranty, source.notes].map((term) => String(term || "").trim()).filter((term, index, terms) => term && terms.indexOf(term) === index);
const taxModeFor = (source) => {
  if (["igst", "cgst_sgst", "none"].includes(source.taxMode)) return source.taxMode;
  const legacyType = String(source.gstType || "").toLowerCase();
  if (legacyType === "igst") return "igst";
  if (["none", "no gst", "nogst"].includes(legacyType)) return "none";
  return "cgst_sgst";
};
const normalizeItems = (items) => items?.length ? items.map((item) => ({ ...item, id: item.id || crypto.randomUUID(), subDescriptions: Array.isArray(item.subDescriptions) ? item.subDescriptions : [], hsn: item.hsn ?? item.hsnCode ?? "", qty: item.qty ?? item.quantity ?? 1, rate: item.rate ?? item.unitPrice ?? 0, unit: item.unit || "Nos" })) : [newItem()];

export default function NewQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get("id");
  const readOnly = searchParams.get("mode") === "view";
  const shouldDownload = searchParams.get("download") === "1";
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveState, setSaveState] = useState("saved");
  const [settings, setSettings] = useState(null);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({ ...initialForm, items: [newItem()] });
  const previewRef = useRef(null);
  const autoDownloaded = useRef(false);
  const total = useMemo(() => QuotationCalculationService.calculate(form), [form]);

  useEffect(() => {
    if (!company?.id) return;
    let active = true;
    (async () => {
      try {
        const data = await QuotationService.getDashboard(company.id);
        let next;
        if (quotationId) {
          const saved = await QuotationService.getQuotation(company.id, quotationId);
          if (!saved) throw new Error("Quotation not found.");
          next = { ...initialForm, ...saved, taxMode: taxModeFor(saved), items: normalizeItems(saved.items), terms: Array.isArray(saved.terms) ? saved.terms : legacyTerms(saved), template: saved.template || "modern" };
        } else {
          const quotationNumber = await QuotationService.generateQuotationNumber(company.id);
          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + Number(data.settings?.defaultValidityDays || 30));
          const defaults = data.settings?.terms || {};
          next = { ...initialForm, quotationNumber, validUntil: validUntil.toISOString().slice(0, 10), salesPerson: company.ownerName || "", paymentTerms: defaults.paymentTerms || "", deliveryTerms: defaults.deliveryTerms || "", warranty: defaults.warranty || "", notes: defaults.notes || "", declaration: defaults.declaration || "", terms: legacyTerms(defaults), items: [newItem()] };
        }
        if (active) { setSettings(data.settings); setClients(data.clients || []); setForm(next); setSaveState("saved"); }
      } catch (error) { toast.error(error.message || "Unable to load quotation."); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [company?.id, company?.ownerName, quotationId]);

  useEffect(() => {
    if (!loading && shouldDownload && !autoDownloaded.current) {
      autoDownloaded.current = true;
      setTimeout(() => exportPDF(), 300);
    }
  }, [loading, shouldDownload]);

  const update = (key, value) => { if (readOnly) return; setForm((current) => ({ ...current, [key]: value })); setSaveState("unsaved"); };
  const updateItem = (id, key, value) => update("items", form.items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  const addSubDescription = (id) => update("items", form.items.map((item) => item.id === id ? { ...item, subDescriptions: [...(item.subDescriptions || []), ""] } : item));
  const updateSubDescription = (id, subIndex, value) => update("items", form.items.map((item) => item.id === id ? { ...item, subDescriptions: item.subDescriptions.map((sub, index) => index === subIndex ? value : sub) } : item));
  const removeSubDescription = (id, subIndex) => update("items", form.items.map((item) => item.id === id ? { ...item, subDescriptions: item.subDescriptions.filter((_, index) => index !== subIndex) } : item));
  const updateTerm = (index, value) => update("terms", form.terms.map((term, termIndex) => termIndex === index ? value : term));
  const selectClient = (id) => { const client = clients.find((item) => item.id === id); if (!client) return update("clientId", ""); setForm((current) => ({ ...current, clientId: client.id, clientName: client.companyName || client.clientName || client.name || "", contactPerson: client.contactPerson || "", phone: client.phone || "", email: client.email || "", gstNumber: client.gstNumber || client.gst || "", billingAddress: addressText(client.address || client.billingAddress), shippingAddress: addressText(client.address || client.shippingAddress) })); setSaveState("unsaved"); };
  const validate = () => { if (!form.clientId || !form.clientName) return "Select a client."; if (!form.subject.trim()) return "Enter a quotation subject."; if (!form.items.length || form.items.some((item) => !item.description.trim() || Number(item.qty) <= 0)) return "Complete every quotation item."; return ""; };
  const persist = async (status) => { const error = validate(); if (error) return toast.error(error); setSaving(true); setSaveState("saving"); try { const payload = { ...form, status, ...total, gstType: form.taxMode === "igst" ? "IGST" : form.taxMode === "none" ? "NONE" : "CGST", terms: form.terms.map((term) => term.trim()).filter(Boolean), items: total.items.map((item) => ({ ...item, subDescriptions: (item.subDescriptions || []).map((description) => description.trim()).filter(Boolean) })), template: form.template || "modern" }; if (quotationId) await QuotationService.updateQuotation(company.id, quotationId, payload); else await QuotationService.createQuotation(company.id, payload); setSaveState("saved"); toast.success(status === "Draft" ? "Draft saved." : "Quotation saved."); router.push("/manager/quotation-builder"); } catch (saveError) { setSaveState("unsaved"); toast.error(saveError.message || "Could not save quotation."); } finally { setSaving(false); } };
  const exportPDF = async () => { setExporting(true); try { await QuotationExportService.exportPDF(previewRef.current, form.quotationNumber); toast.success("Quotation PDF exported."); } catch (error) { console.error(error); toast.error("PDF export failed."); } finally { setExporting(false); } };
  const scrollPreview = () => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  if (loading) return <div className="space-y-4 p-6">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-3xl bg-white/70" />)}</div>;

  return <div className="space-y-6">
    <BuilderHeader quotationNumber={form.quotationNumber} status={form.status} saveState={saveState} saving={saving || exporting} readOnly={readOnly} onBack={() => router.push("/manager/quotation-builder")} onDraft={() => persist("Draft")} onPreview={scrollPreview} onPDF={exportPDF} onSave={() => persist("Sent")} />

    <section className={`${neo} rounded-3xl p-5 sm:p-7`}><div className="mb-6 flex items-center gap-3"><span className="rounded-2xl bg-indigo-100 p-3 text-indigo-600"><FileText /></span><div><h2 className="text-xl font-bold">Quotation details</h2><p className="text-sm text-slate-500">Client, validity and commercial reference</p></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Field label="Quotation number" value={form.quotationNumber} readOnly /><Field label="Quotation date" type="date" value={form.quotationDate} disabled={readOnly} onChange={(e) => update("quotationDate", e.target.value)} /><Field label="Valid until" type="date" value={form.validUntil} disabled={readOnly} onChange={(e) => update("validUntil", e.target.value)} /><Field label="Sales person" value={form.salesPerson} disabled={readOnly} onChange={(e) => update("salesPerson", e.target.value)} /><Field label="Subject *" value={form.subject} disabled={readOnly} onChange={(e) => update("subject", e.target.value)} /><Select label="Template" value={form.template} disabled={readOnly} onChange={(e) => update("template", e.target.value)} options={[["modern", "Modern Blue"], ["classic", "Classic Executive"], ["minimal", "Minimal Professional"]]} /></div></section>

    <section className={`${neo} rounded-3xl p-5 sm:p-7`}><div className="mb-6 flex items-center gap-3"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-600"><Building2 /></span><div><h2 className="text-xl font-bold">Client information</h2><p className="text-sm text-slate-500">Select an existing client</p></div></div><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4"><Select label="Client *" value={form.clientId} disabled={readOnly} onChange={(e) => selectClient(e.target.value)} options={[["", "Select client"], ...clients.map((client) => [client.id, client.companyName || client.clientName || client.name || "Unnamed client"])]} /><Field label="Contact person" value={form.contactPerson} readOnly /><Field label="Phone" value={form.phone} readOnly /><Field label="Email" value={form.email} readOnly /><div className="md:col-span-2 xl:col-span-4"><Field label="Billing address" value={addressText(form.billingAddress)} readOnly /></div></div></section>

    <section className={`${neo} rounded-3xl p-5 sm:p-7`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-xl font-bold">Items</h2><p className="text-sm text-slate-500">Products, services and quotation pricing</p></div>
        {!readOnly && <button type="button" onClick={() => update("items", [...form.items, newItem()])} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Add Row</button>}
      </div>

      <fieldset className="mb-5 rounded-2xl border border-slate-200 bg-white p-4" disabled={readOnly}>
        <legend className="px-1 text-sm font-bold text-slate-700">GST Treatment</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
          {[["igst", "IGST 18%"], ["cgst_sgst", "CGST 9% + SGST 9%"], ["none", "No GST"]].map(([value, label]) => <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700"><input type="radio" name="taxMode" value={value} checked={form.taxMode === value} onChange={(e) => update("taxMode", e.target.value)} className="h-4 w-4 accent-indigo-600" />{label}</label>)}
        </div>
      </fieldset>

      <div className="space-y-3">
        {form.items.map((item, index) => {
          const lineTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
          return <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between md:hidden"><span className="font-bold text-slate-700">Item {index + 1}</span>{!readOnly && <button type="button" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((entry) => entry.id !== item.id))} className="rounded-xl p-2 text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Remove item ${index + 1}`}><Trash2 size={17} /></button>}</div>
            <div className="grid gap-3 md:grid-cols-12">
              <div className="hidden items-center justify-center text-sm font-bold text-slate-500 md:flex md:col-span-1">{index + 1}</div>
              <div className="md:col-span-4">
                <Field label="Description" value={item.description} disabled={readOnly} onChange={(e) => updateItem(item.id, "description", e.target.value)} />
                <div className="mt-3 space-y-2">{(item.subDescriptions || []).map((sub, subIndex) => <div key={subIndex} className="flex items-center gap-2"><input value={sub} disabled={readOnly} onChange={(e) => updateSubDescription(item.id, subIndex, e.target.value)} placeholder={`Sub description ${subIndex + 1}`} className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-indigo-500" />{!readOnly && <button type="button" onClick={() => removeSubDescription(item.id, subIndex)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label={`Remove sub description ${subIndex + 1}`}><Trash2 size={15} /></button>}</div>)}</div>
                {!readOnly && <button type="button" onClick={() => addSubDescription(item.id)} className="mt-2 flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-700"><Plus size={15} />Add Sub</button>}
              </div>
              <div className="md:col-span-1"><Field label="HSN Code" value={item.hsn} disabled={readOnly} onChange={(e) => updateItem(item.id, "hsn", e.target.value)} /></div>
              <div className="md:col-span-2"><Field label="Unit Price" type="number" min="0" step="any" value={item.rate} disabled={readOnly} onChange={(e) => updateItem(item.id, "rate", e.target.value)} /></div>
              <div className="md:col-span-1"><Field label="Qty" type="number" min="0" step="any" value={item.qty} disabled={readOnly} onChange={(e) => updateItem(item.id, "qty", e.target.value)} /></div>
              <div className="md:col-span-1"><Field label="Units" value={item.unit} disabled={readOnly} onChange={(e) => updateItem(item.id, "unit", e.target.value)} /></div>
              <div className="md:col-span-1"><Field label="Total" value={`₹${lineTotal.toLocaleString("en-IN")}`} readOnly /></div>
              <div className="hidden items-end justify-center md:flex md:col-span-1">{!readOnly && <button type="button" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((entry) => entry.id !== item.id))} className="grid h-11 w-11 place-items-center rounded-xl text-red-600 hover:bg-red-50 disabled:opacity-30" aria-label={`Remove item ${index + 1}`}><Trash2 size={17} /></button>}</div>
            </div>
          </div>;
        })}
      </div>

      <div className="mt-6 ml-auto grid max-w-md grid-cols-2 gap-2 rounded-2xl bg-slate-900 p-5 text-sm text-white">
        <span>Subtotal</span>

        <strong className="text-right">
          ₹{total.subtotal.toLocaleString("en-IN")}
        </strong>

        {form.taxMode === "igst" && (
          <>
            <span>IGST 18%</span>

            <span className="text-right">
              ₹{total.igst.toLocaleString("en-IN")}
            </span>
          </>
        )}

        {form.taxMode === "cgst_sgst" && (
          <>
            <span>CGST 9%</span>

            <span className="text-right">
              ₹{total.cgst.toLocaleString("en-IN")}
            </span>

            <span>SGST 9%</span>

            <span className="text-right">
              ₹{total.sgst.toLocaleString("en-IN")}
            </span>
          </>
        )}

        <span className="border-t border-slate-700 pt-3 font-bold">
          Grand total
        </span>

        <strong className="border-t border-slate-700 pt-3 text-right text-lg">
          ₹{total.grandTotal.toLocaleString("en-IN")}
        </strong>
      </div>
    </section>

    <section className={`${neo} rounded-3xl p-5 sm:p-7`}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Terms &amp; Conditions</h2><p className="text-sm text-slate-500">Commercial and delivery conditions</p></div>{!readOnly && <button type="button" onClick={() => update("terms", [...form.terms, ""])} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"><Plus size={17} />Add Term</button>}</div>
      <div className="space-y-3">{form.terms.length ? form.terms.map((term, index) => <div key={index} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"><span className="w-6 text-center text-sm font-bold text-slate-500">{index + 1}.</span><input value={term} disabled={readOnly} onChange={(e) => updateTerm(index, e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50" />{!readOnly && <button type="button" onClick={() => update("terms", form.terms.filter((_, termIndex) => termIndex !== index))} className="rounded-xl p-2.5 text-red-600 hover:bg-red-50" aria-label={`Remove term ${index + 1}`}><Trash2 size={17} /></button>}</div>) : <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">No terms added.</p>}</div>
    </section>

    <div ref={previewRef} className="overflow-x-auto"><QuotationPreview company={company} settings={settings} form={form} template={form.template} /></div>
  </div>;
}

function Field({ label, ...props }) { return <label className="block min-w-0"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><input {...props} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50" /></label>; }
function Select({ label, options, ...props }) { return <label className="block min-w-0"><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><select {...props} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
