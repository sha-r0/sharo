"use client";

import { RotateCw } from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ExpenseHeader({
  loading,
  onRefresh,
}) {
  return (
    <div className="flex items-center justify-between mb-8">

      {/* Left */}

      <div>

        <h1 className="text-[38px] font-bold tracking-tight text-slate-900">
          Expense Approval
        </h1>

        <p className=" text-[16px] text-slate-500">
          Review, approve and manage employee expense claims.
        </p>

      </div>

      {/* Right */}

      <button
        onClick={onRefresh}
        disabled={loading}
        className={`
          ${neoShadow}
          flex
          items-center
          gap-3
          rounded-2xl
          bg-[#F9FAFC]
          border
          border-white/80
          px-6
          py-3
          text-slate-700
          font-medium
          transition-all
          duration-300
          hover:-translate-y-1
          hover:scale-[1.02]
          disabled:opacity-50
          disabled:cursor-not-allowed
        `}
      >
        <RotateCw
          size={18}
          className={loading ? "animate-spin" : ""}
        />

        {loading ? "Refreshing..." : "Refresh"}
      </button>

    </div>
  );
}