"use client";
import { useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { PAYMENT_MODES, validateReimbursement } from "@/lib/expenses/reimbursementInput";

const errors = { OVERPAYMENT: "Amount exceeds the current outstanding balance. Refresh the expense.", LEGACY_PAID: "This legacy expense is already paid.", NOT_REIMBURSABLE: "Only approved reimbursable expenses can be paid.", RECONCILIATION_REQUIRED: "Existing payment data needs reconciliation before recording more.", FORBIDDEN: "You do not have permission to record reimbursements.", EMPLOYEE_MAPPING_REQUIRED: "A valid employee mapping is required.", SUBMISSION_CONFLICT: "This request was already recorded with different details. Refresh before recording another payment." };
export default function ReimbursementModal({ expense, onClose, onRecorded }) {
  const [form, setForm] = useState({ amount: expense.reimbursement.outstandingAmount, paymentDate: new Date().toLocaleDateString("en-CA"), paymentMode: "Bank Transfer", referenceNumber: "", remarks: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const requestId = useRef(null);
  const [saved, setSaved] = useState(false);
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || saved) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      requestId.current ||= crypto.randomUUID();
      const input = validateReimbursement({ ...form, amount: Number(form.amount), requestId: requestId.current });
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const response = await fetch(`/api/expenses/${encodeURIComponent(expense.id)}/reimbursements`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok) throw new Error(errors[result.error] || result.error || "Unable to record reimbursement.");
      setSaved(true);
      onRecorded(expense.id, result); onClose();
    } catch (failure) { setError(failure.message); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const inputClass = "mt-1 w-full rounded-lg border p-2";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <form role="dialog" aria-modal="true" aria-label="Record reimbursement" onSubmit={submit} className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-6 space-y-4">
      <h2 className="text-xl font-semibold">Record Reimbursement</h2>
      <p className="text-sm">Outstanding: ₹{expense.reimbursement.outstandingAmount.toLocaleString("en-IN")}. Record a payment already made; this does not transfer money.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <fieldset disabled={busy || saved} className="space-y-3 text-sm">
        <label className="block">Amount<input required type="number" min="0.01" max={expense.reimbursement.outstandingAmount} step="0.01" value={form.amount} onChange={(e) => change("amount", e.target.value)} className={inputClass} /></label>
        <label className="block">Payment Date<input required type="date" value={form.paymentDate} onChange={(e) => change("paymentDate", e.target.value)} className={inputClass} /></label>
        <label className="block">Payment Mode<select value={form.paymentMode} onChange={(e) => change("paymentMode", e.target.value)} className={inputClass}>{PAYMENT_MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label>
        <label className="block">Reference Number<input maxLength={200} value={form.referenceNumber} onChange={(e) => change("referenceNumber", e.target.value)} className={inputClass} /></label>
        <label className="block">Remarks<textarea maxLength={2000} value={form.remarks} onChange={(e) => change("remarks", e.target.value)} className={inputClass} /></label>
      </fieldset>
      <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button disabled={busy || saved} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{busy ? "Recording…" : saved ? "Recorded" : "Record Reimbursement"}</button></div>
    </form>
  </div>;
}
