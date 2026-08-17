"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import paymentService from "../services/PaymentService";
import { money } from "./InvoiceDocument";

const empty = () => ({ amount: "", paymentDate: new Date().toISOString().slice(0, 10), paymentMethod: "Bank Transfer", referenceNumber: "", transactionId: "", notes: "" });
const input = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

export default function PaymentDialog({ open, onClose, companyId, invoice }) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(empty);
  useEffect(() => { if (open) setForm(empty()); }, [open, invoice?.id]);
  if (!open || !invoice) return null;
  const balance = Number(invoice.pending ?? invoice.pendingAmount ?? invoice.receivable ?? invoice.invoiceAmount ?? 0);
  const paid = Number(invoice.paid ?? invoice.paidAmount ?? 0);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return toast.error("Enter a payment amount greater than zero.");
    if (amount > balance + 0.001) return toast.error("Payment cannot exceed the outstanding balance.");
    setSaving(true);
    try { await paymentService.create(companyId, { ...form, invoiceId: invoice.id }, currentUser); toast.success("Payment recorded successfully."); onClose(); }
    catch (error) { console.error("Payment recording failed", error); toast.error(error.message || "Payment could not be recorded."); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
    <form onSubmit={submit} className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-start justify-between border-b px-5 py-4"><div><h2 className="text-xl font-bold text-slate-900">Record Payment</h2><p className="mt-0.5 text-sm text-slate-500">{invoice.invoiceNumber} · {invoice.clientName}</p></div><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100" aria-label="Close"><X size={19} /></button></header>
      <div className="space-y-5 p-5"><div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"><Summary label="Invoice Total" value={invoice.receivable ?? invoice.invoiceAmount} /><Summary label="Already Received" value={paid} /><Summary label="Outstanding" value={balance} strong /></div><div className="grid gap-4 sm:grid-cols-2"><Field label="Payment Amount *"><input autoFocus required min="0.01" max={balance} step="0.01" type="number" value={form.amount} onChange={(event) => update("amount", event.target.value)} className={input} placeholder="0.00" /></Field><Field label="Payment Date *"><input required type="date" value={form.paymentDate} onChange={(event) => update("paymentDate", event.target.value)} className={input} /></Field><Field label="Payment Method *"><select required value={form.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)} className={input}>{["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"].map((method) => <option key={method}>{method}</option>)}</select></Field><Field label="Reference / UTR"><input value={form.referenceNumber} onChange={(event) => update("referenceNumber", event.target.value)} className={input} /></Field><div className="sm:col-span-2"><Field label="Notes"><textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className={`${input} h-20 py-3`} /></Field></div></div></div>
      <footer className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4"><button type="button" onClick={onClose} className="h-10 rounded-xl border bg-white px-5 text-sm font-semibold">Cancel</button><button disabled={saving || balance <= 0} className="h-10 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white disabled:opacity-40">{saving ? "Recording..." : "Record Payment"}</button></footer>
    </form>
  </div>;
}

function Field({ label, children }) { return <label className="block text-xs font-semibold text-slate-600">{label}{children}</label>; }
function Summary({ label, value, strong }) { return <div><span className="block text-[10px] font-bold uppercase text-slate-400">{label}</span><strong className={`mt-1 block text-sm ${strong ? "text-indigo-700" : "text-slate-800"}`}>₹ {money(value)}</strong></div>; }
