"use client";

import { use, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, Download, Mail, Pencil, Printer, Send, Share2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import useBillingData from "../hooks/useBillingData";
import invoiceService from "../services/InvoiceService";
import PaymentDialog from "../components/PaymentDialog";
import InvoiceDocument, { money } from "../components/InvoiceDocument";
import "../components/invoice.css";

export default function InvoicePage({ params }) {
  const { id } = use(params);
  const { company, currentUser } = useAuth();
  const router = useRouter();
  const data = useBillingData(company?.id);
  const invoice = data.analytics.invoices.find((item) => item.id === id);
  const preview = useRef(null);
  const [payment, setPayment] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");

  if (data.loading) return <div className="p-10">Loading invoice...</div>;
  if (!invoice) return <div className="p-10">Invoice not found.</div>;

  const download = async () => {
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(preview.current, { scale: 2.5, useCORS: true, backgroundColor: "#ffffff", logging: false });
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = 210;
      const pageHeight = 297;
      const renderedHeight = canvas.height * pageWidth / canvas.width;
      const image = canvas.toDataURL("image/png", 1);
      let remaining = renderedHeight;
      let position = 0;
      pdf.addImage(image, "PNG", 0, position, pageWidth, renderedHeight, undefined, "FAST");
      remaining -= pageHeight;
      while (remaining > 0) {
        position = remaining - renderedHeight;
        pdf.addPage();
        pdf.addImage(image, "PNG", 0, position, pageWidth, renderedHeight, undefined, "FAST");
        remaining -= pageHeight;
      }
      pdf.save(`${invoice.invoiceNumber.replaceAll("/", "-")}.pdf`);
    } catch (error) {
      console.error("Invoice PDF export failed", error);
      toast.error("PDF export failed.");
    } finally { setExporting(false); }
  };
  const issue = async () => { try { await invoiceService.issue(company.id, invoice.id, currentUser); toast.success("Invoice issued."); } catch (error) { toast.error(error.message); } };
  const cancel = async (event) => { event.preventDefault(); try { await invoiceService.cancel(company.id, invoice.id, cancellationReason, currentUser); toast.success("Invoice cancelled."); setCancelOpen(false); } catch (error) { toast.error(error.message); } };
  const share = async () => {
    const payload = { title: `Invoice ${invoice.invoiceNumber}`, text: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName} — ₹${money(invoice.receivable)}`, url: window.location.href };
    if (navigator.share) await navigator.share(payload);
    else { await navigator.clipboard.writeText(window.location.href); toast.success("Invoice link copied."); }
  };

  return <div className="space-y-5 px-2 py-2 sm:px-6">
    <header className="invoice-no-print flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3"><button onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200" aria-label="Back to billing"><ArrowLeft size={18} /></button><div><h1 className="text-xl font-bold text-slate-900">{invoice.invoiceNumber}</h1><p className="text-sm text-slate-500">{invoice.clientName} · <span className="capitalize">{invoice.displayStatus}</span> · Outstanding ₹ {money(invoice.pending)}</p></div></div>
      <div className="flex flex-wrap gap-2">{invoice.invoiceStatus !== "cancelled" && <button onClick={() => router.push(`/manager/billing/new?editId=${invoice.id}`)} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Pencil size={15} />Edit</button>}<button onClick={() => window.print()} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Printer size={15} />Print</button><button onClick={download} disabled={exporting} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Download size={15} />{exporting ? "Exporting..." : "PDF"}</button><button onClick={share} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Share2 size={15} />Share</button><a href={`mailto:${invoice.clientSnapshot?.email || ""}?subject=Invoice ${encodeURIComponent(invoice.invoiceNumber)}&body=${encodeURIComponent(`Please find invoice ${invoice.invoiceNumber}.`)}`} className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold"><Mail size={15} />Email</a>{invoice.invoiceStatus === "draft" && <button onClick={issue} className="flex h-10 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white"><Send size={15} />Issue Invoice</button>}{invoice.invoiceStatus === "issued" && invoice.paymentStatus !== "paid" && <button onClick={() => setPayment(true)} className="h-10 rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white">Record Payment</button>}{invoice.invoiceStatus !== "cancelled" && invoice.paymentStatus !== "paid" && <button onClick={() => setCancelOpen(true)} className="flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-semibold text-rose-700"><Ban size={15} />Cancel</button>}</div>
    </header>
    <section className="invoice-no-print grid grid-cols-2 gap-3 lg:grid-cols-5">{[["Invoice Total", invoice.receivable ?? invoice.invoiceAmount], ["Paid", invoice.paid], [invoice.overdue ? "Overdue Balance" : "Balance", invoice.pending], ["Due Date", invoice.dueDate], ["Payment Status", invoice.paymentStatus]].map(([label, value], index) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><span className="text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className={`mt-1 block text-sm capitalize ${index === 2 && invoice.overdue ? "text-rose-600" : "text-slate-800"}`}>{index < 3 ? `₹ ${money(value)}` : value || "—"}</strong></div>)}</section>
    <div className="overflow-x-auto rounded-2xl bg-slate-200/70 p-3 sm:p-7"><InvoiceDocument ref={preview} invoice={invoice} company={data.company} /></div>
    <section className="invoice-no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Payment History</h2><p className="text-xs text-slate-500">Confirmed payment transactions for this invoice</p></div><strong className="text-sm text-emerald-700">Total received ₹ {money(invoice.paid)}</strong></div>{invoice.payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-400"><th className="py-2">Date</th><th>Method</th><th>Reference</th><th>Recorded by</th><th className="text-right">Amount</th></tr></thead><tbody>{invoice.payments.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="py-3">{item.paymentDate || "—"}</td><td>{item.paymentMethod || item.mode || "—"}</td><td>{item.referenceNumber || item.transactionId || "—"}</td><td>{item.createdBy?.name || item.receivedBy?.name || "Finance"}</td><td className="text-right font-bold">₹ {money(item.amount)}</td></tr>)}</tbody></table></div> : <p className="mt-5 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">No payments recorded yet.</p>}</section>
    <PaymentDialog open={payment} onClose={() => setPayment(false)} companyId={company.id} invoice={invoice} />
    {cancelOpen && <div className="invoice-no-print fixed inset-0 z-[140] grid place-items-center bg-slate-950/45 p-4"><form onSubmit={cancel} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"><h2 className="text-lg font-bold">Cancel Invoice</h2><p className="mt-1 text-sm text-slate-500">The invoice remains in financial history and cannot receive new payments.</p><label className="mt-4 block text-xs font-semibold">Cancellation reason *<textarea required value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} className="mt-1.5 h-24 w-full rounded-xl border p-3 text-sm" /></label><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setCancelOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Keep Invoice</button><button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white">Cancel Invoice</button></div></form></div>}
  </div>;
}
