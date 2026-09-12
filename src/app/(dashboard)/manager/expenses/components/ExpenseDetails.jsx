"use client";
import { expenseDetails } from "@/lib/expenses/details";
export default function ExpenseDetails({ expense }) {
  const rows = expenseDetails(expense);
  const description = expense.description || expense.title;
  return <div className="min-w-0 space-y-1 break-words">
    {description && <details className="group"><summary title={description} className="line-clamp-2 cursor-pointer list-none font-semibold text-slate-900 group-open:line-clamp-none">{description}</summary></details>}
    {rows.map(([label, value]) => <div key={label} className="text-xs leading-5 text-slate-500"><span className="font-semibold text-slate-600">{label}:</span> {value}</div>)}
    {!description && !rows.length && <span className="text-sm text-slate-400">No details provided</span>}
  </div>;
}
