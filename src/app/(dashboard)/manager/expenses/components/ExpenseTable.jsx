"use client";

import ExpenseRow from "./ExpenseRow";

export default function ExpenseTable({
  expenses,
  onEdit,
  onApprove,
  onReject,
  onViewBill,
}) {
  return (
    <div className="space-y-4 relative">

      {/* Header */}

      <div className="sticky top-0 z-30 grid grid-cols-8 items-center rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-slate-700  px-6 py-5 shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]">

        <div>Employee</div>
        <div>Project</div>
        <div>Category</div>
        <div>Description</div>
        <div>Amount</div>
        <div>Date</div>
        <div>Status</div>
        <div className="text-center">Actions</div>

      </div>

      {expenses.length === 0 ? (

        <div className="rounded-3xl bg-white py-16 text-center shadow">
          No expenses found.
        </div>

      ) : (

        expenses.map((expense) => (

          <ExpenseRow
            key={expense.id}
            expense={expense}
            onEdit={onEdit}
            onApprove={onApprove}
            onReject={onReject}
            onViewBill={onViewBill}
          />

        ))

      )}

    </div>
  );
}