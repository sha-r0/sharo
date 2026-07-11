"use client";

import {
  Wallet,
  ReceiptText,
  BadgeIndianRupee,
  TrendingUp,
  PieChart,
  Percent,
} from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Card({
  title,
  value,
  color,
  bg,
  icon: Icon,
  prefix = "",
}) {
  return (
    <div
      className={`${neoShadow} rounded-3xl bg-[#F9FAFC] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      {/* Header */}

      <div className="flex items-center justify-start gap-2">



        <div
          className={`h-8 w-8 rounded-lg flex items-center justify-center ${bg}`}
          style={{
            boxShadow:
              "6px 6px 12px rgba(180,190,205,.22), -6px -6px 12px rgba(255,255,255,.95)",
          }}
        >
          <Icon
            size={18}
            className={color}
          />
        </div>

        <p className="text-sm font-semibold text-slate-500">
          {title}
        </p>

      </div>

      {/* Value */}

      <h2 className={`mt-5 text-2xl font-bold tracking-tight ${color}`}>

        {prefix}

        {Number(value).toLocaleString()}

      </h2>

      {/* Bottom Progress Accent */}

      <div className="mt-2 h-1 rounded-full bg-slate-100">

        <div
          className={`h-full rounded-full ${bg}`}
          style={{ width: "72%" }}
        />

      </div>

    </div>
  );
}

export default function ProjectSummaryCards({

  totalBudget = 0,

  poAmount = 0,

  totalExpense = 0,

  totalProfit = 0,

  budgetUtilization = 0,

  profitMargin = 0,

}) {

  return (

    <div className="grid gap-6 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 mb-8">

      <Card
        title="Total Budget"
        value={totalBudget}
        prefix="₹"
        color="text-blue-600"
        bg="bg-blue-100"
        icon={Wallet}
      />

      <Card
        title="PO Amount"
        value={poAmount}
        prefix="₹"
        color="text-indigo-600"
        bg="bg-indigo-100"
        icon={ReceiptText}
      />

      <Card
        title="Total Expense"
        value={totalExpense}
        prefix="₹"
        color="text-red-600"
        bg="bg-red-100"
        icon={BadgeIndianRupee}
      />

      <Card
        title="Net Profit"
        value={totalProfit}
        prefix="₹"
        color={
          totalProfit >= 0
            ? "text-emerald-600"
            : "text-red-600"
        }
        bg={
          totalProfit >= 0
            ? "bg-emerald-100"
            : "bg-red-100"
        }
        icon={TrendingUp}
      />

      <Card
        title="Budget Used"
        value={budgetUtilization}
        prefix=""
        color="text-amber-600"
        bg="bg-amber-100"
        icon={PieChart}
      />

      <Card
        title="Profit Margin"
        value={profitMargin}
        prefix=""
        color="text-violet-600"
        bg="bg-violet-100"
        icon={Percent}
      />

    </div>

  );

}