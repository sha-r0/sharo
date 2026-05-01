"use client";

import { useEffect, useState } from "react";
import { Wallet, Briefcase, TrendingUp } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { getProjects } from "@/app/allservice/projectService";
import { getExpenses } from "@/app/allservice/expenseService";

export default function SummaryCards({ startDate, endDate ,companyId }) {
  const router = useRouter();

  /* ================= STATES ================= */
  const [expenses, setExpenses] = useState([]);

  /* ================= FETCH EXPENSES ================= */
  useEffect(() => {
    if (!companyId || !startDate || !endDate) return;
  
    const fetchExpenses = async () => {
      const data = await getExpenses(companyId);
  
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
  
      const filtered = data.filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
  
      setExpenses(filtered);
    };
  
    fetchExpenses();
  }, [companyId, startDate, endDate]); // ✅ ALWAYS SAME

  /* ================= TOTAL CALCULATIONS ================= */
  const totalExpense = expenses.reduce((sum, e) => {
    const amount = Number(e.amount) || 0;
    const status = (e.status || "").toLowerCase().trim();

    if (["pending", "approved"].includes(status)) {
      return sum + amount;
    }

    return sum;
  }, 0);

  /* ================= CALCULATE FINANCIAL YEAR ================= */
  const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    const startFY = new Date(`${year}-04-01`);
    const endFY = new Date(`${year + 1}-03-31`);

    return { startFY, endFY };
  };

  const [projectCount, setProjectCount] = useState(0);

  useEffect(() => {
    const fetchProjects = async () => { 
  
      const projects = await getProjects(companyId);
      setProjectCount(projects.length);
    };
  
    fetchProjects();
  }, []);


  /* ================= CARD CONFIG ================= */
  const cards = [
    {
      title: "Total Expenses",
      amount: `₹${totalExpense.toLocaleString()}`,
      icon: Wallet,
      gradient: "from-rose-400 to-red-600",
    },
    {
      title: "Total Projects",
      amount: projectCount.toLocaleString(),
      icon: Briefcase,
      gradient: "from-indigo-400 to-violet-600",
    },
    {
      title: "Total Collection",
      // amount: `₹${totalPOAmount.toLocaleString()}`,
      amount:"₹100000",
      icon: TrendingUp,
      gradient: "from-emerald-400 to-teal-600",
    },
  ];

  /* ================= UI ================= */
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={i}
          className="
            bg-[#F8F9FD]
            rounded-2xl
            p-5
            border border-white
            transition
            hover:shadow-[0_0_24px_rgba(255,255,255,0.06)]
          "
        >
          {/* ICON */}
          <div
            className={`
              w-11 h-11 rounded-xl
              flex items-center justify-center
              bg-gradient-to-br ${card.gradient}
              shadow-[0_8px_20px_rgba(0,0,0,0.4)]
            `}
          >
            <card.icon size={22} className="text-white" />
          </div>

          {/* TITLE */}
          <h3 className="mt-4 text-sm font-medium text-black/60">
            {card.title}
          </h3>

          {/* AMOUNT */}
          <h2
            className={`
              text-2xl font-semibold mt-1
              bg-gradient-to-r ${card.gradient}
              bg-clip-text text-transparent
            `}
          >
            {card.amount}
          </h2>
        </div>
      ))}
    </div>
  );
}
