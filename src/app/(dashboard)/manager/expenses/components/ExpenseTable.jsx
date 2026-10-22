"use client";

import ExpenseRow, {
  expenseColumns,
} from "./ExpenseRow";

export default function ExpenseTable({
  expenses,
  onRecorded,
  busy,
  ownPendingOnly,
  ownPending,
  onDelete,
  onEdit,
  onApprove,
  onReject,
  onViewBill,
  periodLocked = false,
}) {
  if (!expenses.length) {
    return (
      <div className="mt-5 flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-8 text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 7.5h12M8.5 4.5h7a2 2 0 0 1 2 2v13h-11v-13a2 2 0 0 1 2-2Z"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 11h6M9 14.5h4"
            />
          </svg>
        </div>

        <p className="text-base font-semibold text-slate-700">
          No expenses found
        </p>

        <p className="mt-1 max-w-md text-sm leading-5 text-slate-500">
          Try adjusting your filters or selecting another month.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-5 lg:overflow-x-auto">
      <div className="space-y-3 lg:min-w-[1200px]">
        <div
          className={`hidden lg:grid ${expenseColumns} gap-4 rounded-xl bg-blue-50 px-4 py-3 text-xs font-semibold text-slate-600`}
        >
          {[
            "Employee",
            "Project",
            "Category",
            "Details",
            "Requested",
            "Policy",
            "Status",
            "Date",
            "Actions",
          ].map((label) => (
            <div key={label}>
              {label}
            </div>
          ))}
        </div>

        {expenses.map((expense) => (
          <ExpenseRow
            key={expense.id}
            expense={expense}
            onRecorded={onRecorded}
            busy={busy}
            onEdit={
              !periodLocked &&
              (
                !ownPendingOnly ||
                ownPending(expense)
              )
                ? onEdit
                : null
            }
            onDelete={
              !periodLocked &&
              (
                !ownPendingOnly ||
                ownPending(expense)
              )
                ? onDelete
                : null
            }
            onApprove={onApprove}
            onReject={onReject}
            onViewBill={onViewBill}
          />
        ))}
      </div>
    </div>
  );
}