"use client";
import { useState } from "react";
import { Pencil, Trash2, CheckCircle, XCircle, Receipt, WalletCards } from "lucide-react";
import { policyExcess } from "@/lib/expenses/dashboard";
import ExpenseReimbursement from "./ExpenseReimbursement";
import ExpenseDetails from "./ExpenseDetails";
import ActionButton from "./ActionButton";
import ExpenseStatusBadge from "./ExpenseStatusBadge";

export const expenseColumns = "lg:grid-cols-[minmax(90px,1fr)_minmax(90px,1fr)_90px_minmax(210px,2fr)_90px_110px_90px_85px_125px]";
function Cell({ label, children, className = "" }) {
  return <div className={`min-w-0 ${className}`}><div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">{label}</div>{children}</div>;
}
export default function ExpenseRow({ expense, onRecorded, busy, onDelete, onEdit, onApprove, onReject, onViewBill }) {
  const excess = policyExcess(expense);
  const hasPolicy = typeof expense.allowedAmount === "number" && Number.isFinite(expense.allowedAmount);
  const [showPayments, setShowPayments] = useState(false);
  return <div className={`grid grid-cols-2 ${expenseColumns} items-start gap-x-4 gap-y-3 rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm shadow-sm`}>
    <Cell label="Employee"><div className="font-semibold text-slate-800 break-words">{expense.employeeName || "—"}</div><div className="text-xs text-slate-400">{expense.submitterType === "owner" ? "Company owner" : expense.employeeId}</div></Cell>
    <Cell label="Project"><p className="line-clamp-2 break-words" title={expense.projectName}>{expense.projectName || "—"}</p></Cell>
    <Cell label="Category"><p className="break-words">{expense.categoryName || expense.category || "—"}</p></Cell>
    <Cell label="Details" className="col-span-2 lg:col-span-1"><ExpenseDetails expense={expense} /></Cell>
    <Cell label="Requested"><span className="font-semibold tabular-nums text-slate-900">₹{Number(expense.amount || 0).toLocaleString("en-IN")}</span></Cell>
    <Cell label="Policy">{!hasPolicy ? <span className="text-slate-400">—</span> : <span title={`Allowed ₹${expense.allowedAmount.toLocaleString("en-IN")}`} className={`inline-block rounded-lg px-2 py-1 text-xs ${excess > 0 ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{excess > 0 ? `Over Policy ₹${excess.toLocaleString("en-IN")}` : "Within Policy"}</span>}</Cell>
    <Cell label="Status"><ExpenseStatusBadge status={expense.status} /></Cell>
    <Cell label="Date"><span className="text-xs tabular-nums text-slate-500">{formatExpenseDate(expense.date)}</span></Cell>
    <Cell label="Actions"><div className="flex flex-wrap gap-1.5">
      <ActionButton immediate disabled={!expense.billUrl?.trim()} label={expense.billUrl?.trim() ? "View receipt" : "No receipt attached"} className="bg-slate-50 text-slate-600" onClick={() => onViewBill(expense)}><Receipt size={16} /></ActionButton>
      {expense.status === "approved" && <ActionButton immediate label="Reimbursement details" className="bg-slate-50 text-slate-600" onClick={() => setShowPayments((value) => !value)}><WalletCards size={16} /></ActionButton>}
      {onEdit && <ActionButton immediate disabled={busy} label="Edit" className="bg-blue-50 text-blue-600" onClick={() => onEdit(expense)}><Pencil size={16} /></ActionButton>}
      {onDelete && <ActionButton immediate disabled={busy} label="Delete" className="bg-red-50 text-red-600" onClick={() => onDelete(expense)}><Trash2 size={16} /></ActionButton>}
      {expense.status === "pending" && onApprove && onReject && <>
        <ActionButton immediate disabled={busy} label="Approve" className="bg-green-50 text-green-600" onClick={() => onApprove(expense)}><CheckCircle size={16} /></ActionButton>
        <ActionButton immediate disabled={busy} label="Reject" className="bg-red-50 text-red-600" onClick={() => onReject(expense)}><XCircle size={16} /></ActionButton>
      </>}
    </div></Cell>
    {showPayments && expense.status === "approved" && <div className="col-span-2 lg:col-span-9"><ExpenseReimbursement expense={expense} onRecorded={onRecorded} expanded /></div>}
  </div>;
}

function formatExpenseDate(value) {
  if (typeof value !== "string") return "—";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
