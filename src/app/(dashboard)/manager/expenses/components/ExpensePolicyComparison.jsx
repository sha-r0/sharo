"use client";

export default function ExpensePolicyComparison({ expense }) {
  const format = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const hasPolicy = typeof expense.allowedAmount === "number" && Number.isFinite(expense.allowedAmount);
  const excess = hasPolicy ? Math.round(Math.max(0, Number(expense.amount || 0) - expense.allowedAmount) * 100) / 100 : 0;
  return <div className="space-y-1">
    <div><span className="block text-[10px] font-normal text-slate-500">Requested</span>{format(expense.amount)}</div>
    {!hasPolicy && expense.policyExceeded === true && <span className="inline-block rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Over Policy</span>}
    {hasPolicy && <>
      <div className="text-xs font-normal text-slate-600">Policy allowed: {format(expense.allowedAmount)}</div>
      {excess > 0 ? <div className="text-xs text-amber-800"><span className="inline-block rounded-full bg-amber-100 px-2 py-1 font-semibold">Over Policy</span><div className="mt-1">Over policy: {format(excess)}</div></div> : <div className="text-xs font-normal text-emerald-700">Within Policy</div>}
    </>}
  </div>;
}
