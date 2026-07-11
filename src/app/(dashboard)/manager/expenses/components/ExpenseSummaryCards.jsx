"use client";

import {
  Wallet,
  CircleCheckBig,
  Clock3,
  Landmark,
  BadgeIndianRupee,
} from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Card({
  title,
  value,
  color,
  bg,
  icon: Icon,
}) {
  return (
    <div
      className={`
        ${neoShadow}
        rounded-[24px]
        bg-[#F9FAFC]
        border border-white/80
        px-6
        py-5
        transition-all
        duration-300
        hover:-translate-y-1
        mb-8
      `}
    >
      <div className="flex items-start justify-between">

        <div>

          <p className="text-[15px] font-medium text-slate-500">
            {title}
          </p>

          <h2 className={`mt-4 text-[25px] leading-none font-bold ${color}`}>
            ₹{Number(value).toLocaleString()}
          </h2>

        </div>

        <div
          className={`
            ${bg}
            h-12
            w-12
            rounded-2xl
            flex
            items-center
            justify-center
            ${neoShadow}
          `}
        >
          <Icon size={22} className={color} />
        </div>

      </div>
    </div>
  );
}

export default function ExpenseSummaryCards({
  totalExpense,
  approvedExpense,
  pendingExpense,
  totalAdvance,
  remainingAmount,
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-5 lg:grid-cols-3 md:grid-cols-2 grid-cols-1">

      <Card
        title="Total Expense"
        value={totalExpense}
        color="text-blue-600"
        bg="bg-blue-50"
        icon={Wallet}
      />

      <Card
        title="Approved Expense"
        value={approvedExpense}
        color="text-emerald-600"
        bg="bg-emerald-50"
        icon={CircleCheckBig}
      />

      <Card
        title="Pending Expense"
        value={pendingExpense}
        color="text-amber-500"
        bg="bg-amber-50"
        icon={Clock3}
      />

      <Card
        title="Total Advance"
        value={totalAdvance}
        color="text-violet-600"
        bg="bg-violet-50"
        icon={Landmark}
      />

      <Card
        title="Remaining Amount"
        value={remainingAmount}
        color={
          remainingAmount >= 0
            ? "text-green-600"
            : "text-red-600"
        }
        bg={
          remainingAmount >= 0
            ? "bg-green-50"
            : "bg-red-50"
        }
        icon={BadgeIndianRupee}
      />

    </div>
  );
}