"use client";
import ExpenseRow, { expenseColumns } from "./ExpenseRow";
export default function ExpenseTable({ expenses, onRecorded, busy, ownPendingOnly, ownPending, onDelete, onEdit, onApprove, onReject, onViewBill, periodLocked = false }) {
  if (!expenses.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center"><p className="font-semibold text-slate-700">No expenses found for this period.</p><p className="mt-2 text-sm text-slate-500">Try adjusting your filters or selecting another month.</p></div>;
  return <div className="lg:overflow-x-auto"><div className="space-y-3 lg:min-w-[1200px]">
    <div className={`hidden lg:grid ${expenseColumns} gap-4 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold text-slate-600`}>{["Employee", "Project", "Category", "Details", "Requested", "Policy", "Status", "Date", "Actions"].map((label) => <div key={label}>{label}</div>)}</div>
    {expenses.map((expense) => <ExpenseRow key={expense.id} expense={expense} onRecorded={onRecorded} busy={busy} onEdit={!periodLocked && (!ownPendingOnly || ownPending(expense)) ? onEdit : null} onDelete={!periodLocked && (!ownPendingOnly || ownPending(expense)) ? onDelete : null} onApprove={onApprove} onReject={onReject} onViewBill={onViewBill} />)}
  </div></div>;
}
