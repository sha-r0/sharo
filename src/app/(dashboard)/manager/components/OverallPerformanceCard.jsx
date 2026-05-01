"use client";

import { useEffect, useState } from "react";
import { calculateEmployeePerformance } from "@/app/allservice/calculateEmployeePerformance";
import { TrendingUp } from "lucide-react"

export default function OverallPerformanceCard({ startDate, endDate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchData = async () => {
      setLoading(true);
      const res = await calculateFinancialPerformance(startDate, endDate);
      setStats(res);
      setLoading(false);
    };

    fetchData();
  }, [startDate, endDate]);

  if (loading) {
    return (
      <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5 text-black/60">
        Calculating performance...
      </div>
    );
  }

  if (!stats) return null;

  const isProfit = stats.netProfit > 0;

  return (
    <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5">
      <div className="flex justify-between items-center mb-4">

        {/* LEFT SIDE ICON + TITLE */}
        <div className="flex items-center gap-2">

          <div className="
    w-6 h-6 rounded-lg
    flex items-center justify-center
    bg-gradient-to-br from-blue-500 to-indigo-700
    shadow-[0_8px_20px_rgba(59,130,246,0.35)]
  ">
            <TrendingUp size={15} className="text-white" />
          </div>

          <h3 className="text-lg font-semibold text-black">
            Overall Performance
          </h3>

        </div>

        {/* STATUS BADGE (YOUR ORIGINAL LOGIC – UNCHANGED) */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium
    ${isProfit
              ? "bg-green-500/15 text-green-400"
              : "bg-red-500/15 text-red-400"
            }`}
        >
          {isProfit ? "Profitable" : "Loss"}
        </span>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <Metric label="PO Revenue" value={stats.totalPO} />
        <Metric label="Salary" value={stats.totalSalary} />
        <Metric label="Expenses" value={stats.totalExpense} />
        <Metric label="Tax (30%)" value={stats.tax} />
      </div>

      <div
        className={`mt-5 px-4 py-3 rounded-xl flex justify-between
          ${isProfit
            ? "bg-green-500/10 text-green-400"
            : "bg-red-500/10 text-red-400"
          }`}
      >
        <span className="font-medium">Net Profit</span>
        <span className="font-bold">
          ₹{stats.netProfit.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <div className="text-[#6F7195]">{label}</div>
      <div className="font-semibold text-black">
        ₹{Number(value || 0).toLocaleString("en-IN")}
      </div>
    </div>
  );
}
