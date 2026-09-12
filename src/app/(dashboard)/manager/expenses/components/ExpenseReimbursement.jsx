"use client";
import { useState } from "react";
import { useEffect } from "react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { fetchExpense } from "@/app/allservice/expense/expensePageClient";
import ReimbursementModal from "./ReimbursementModal";
const labels = { unpaid: "Unpaid", partially_paid: "Partially Paid", paid: "Paid", not_applicable: "Not Applicable" };
const money = (amount) => `₹${Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export default function ExpenseReimbursement({ expense, onRecorded, expanded = false }) {
  const [detail, setDetail] = useState(expense);
  const [open, setOpen] = useState(false);
  const { can, isOwner, roleId } = useAuth();
  const canRecord = (isOwner || roleId !== "employee") && can("expense.manage");
  useEffect(() => {
    let active = true;
    if (!expense.reimbursement || !Array.isArray(expense.reimbursements)) fetchExpense(expense.id).then((loaded) => { if (active) setDetail(loaded); }).catch(() => {});
    else setDetail(expense);
    return () => { active = false; };
  }, [expense.id, expense.reimbursement, expense.reimbursements]);
  const state = detail.reimbursement;
  if (!state) return <p className="text-xs text-slate-500">Refreshing reimbursement information…</p>;
  return <details open={expanded} className="border-t pt-2 text-xs text-slate-600">
    <summary className="cursor-pointer">Reimbursement: <span className={`rounded-full px-2 py-1 ${state.reimbursementStatus === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200"}`}>{labels[state.reimbursementStatus]}</span></summary>
    <div className="mt-3 flex flex-wrap gap-6">
      <span>Expense Status: Approved</span><span>Requested: {money(detail.amount)}</span>
      <span>Approved Expense: {money(detail.amount)}</span><span>Reimbursed: {money(state.reimbursedAmount)}</span>
      <span>Outstanding: {money(state.outstandingAmount)}</span>
    </div>
    {state.reconciliationRequired && <p className="mt-3 text-amber-800">Existing reimbursement data needs reconciliation before further payments can be recorded.</p>}
    {state.outstandingAmount > 0 && !state.reconciliationRequired && canRecord && <button type="button" className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-white" onClick={() => setOpen(true)}>Record Reimbursement</button>}
    <div className="mt-3 overflow-x-auto">
      <p className="mb-2 font-semibold">Reimbursement History</p>
      {!detail.reimbursements?.length ? <p>{detail.reimbursed === true ? "Legacy paid expense — no recorded payment history." : "No reimbursements recorded."}</p> : <table className="w-full text-left"><thead><tr>{["Date", "Amount", "Mode", "Reference", "Recorded By"].map((label) => <th className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{detail.reimbursements.map((payment) => <tr key={payment.id} className="border-t"><td className="p-2">{payment.paymentDate}</td><td className="p-2">{money(payment.amount)}</td><td className="p-2">{payment.paymentMode}</td><td className="p-2 break-all">{payment.referenceNumber || "—"}</td><td className="p-2">{payment.createdBy?.name || "—"}</td></tr>)}</tbody></table>}
    </div>
    {open && <ReimbursementModal expense={detail} onClose={() => setOpen(false)} onRecorded={onRecorded} />}
  </details>;
}
