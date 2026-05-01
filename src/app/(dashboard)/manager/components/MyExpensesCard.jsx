"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase } from "lucide-react";
import {
    Bus,
    Utensils,
    Hotel,
    Fuel,
    Package,
    Wrench,
    Boxes,
    FileText,
    FolderKanban,
    Users,
    Wallet,
    Smartphone,
    Receipt,
} from "lucide-react";
import { getExpenses } from "@/app/allservice/expenseService";

/* ---------------- ICON MAP ---------------- */
const icons = {
    travel: <Bus size={16} className="text-indigo-400" />,
    labour: <Users size={16} className="text-teal-400" />,
    food: <Utensils size={16} className="text-orange-400" />,
    "office expense": <Briefcase size={16} className="text-blue-400" />,
    hotel: <Hotel size={16} className="text-pink-400" />,
    petrol: <Fuel size={16} className="text-red-400" />,
    courier: <Package size={16} className="text-green-400" />,
    "instrument / equipment": (
        <Wrench size={16} className="text-yellow-400" />
    ),
    materials: <Boxes size={16} className="text-cyan-400" />,
    fees: <FileText size={16} className="text-purple-400" />,
    "project expense": (
        <FolderKanban size={16} className="text-indigo-300" />
    ),
    "client meeting": <Users size={16} className="text-emerald-400" />,
    "vendor payment": <Wallet size={16} className="text-rose-400" />,
    "mobile recharge": (
        <Smartphone size={16} className="text-sky-400" />
    ),
};

export default function MyExpensesCard({ companyId }) {
    const router = useRouter();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!companyId) return;
      
        const fetchExpenses = async () => {
            const data = await getExpenses(companyId);

            const sorted = data
              .filter(e => e.createdAt)
              .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            
            setExpenses(sorted.slice(0, 10));
          setLoading(false);
        };
      
        fetchExpenses();
      }, [companyId]); // ✅ ALWAYS SAME ARRAY


    return (
        <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">

                {/* LEFT SIDE TITLE + ICON */}
                <div className="flex items-center gap-2">

                    {/* GRADIENT ICON BADGE */}
                    <div className="
                              w-6 h-6 rounded-lg
                              flex items-center justify-center
                              bg-gradient-to-br from-emerald-400 to-teal-600
                              shadow-[0_8px_20px_rgba(16,185,129,0.35)]
                          ">
                        <Receipt size={15} className="text-white" />
                    </div>

                    <h3 className="text-lg font-semibold text-black">
                        Recent Expenses
                    </h3>
                </div>
 
                {/* RIGHT SIDE BUTTON */}
                <button
                    onClick={() =>
                        router.push("/manager/expenses")
                    }
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                    View All <ArrowRight size={14} />
                </button>

            </div>


            {/* List */}
            <div className="space-y-1 overflow-y-auto max-h-[270px] pr-1 manager-scroll text-sm">
                {loading ? (
                    <p className="text-gray-500 text-xs text-center py-4">
                        Loading…
                    </p>
                ) : expenses.length ? (
                    expenses.map((exp) => {
                        const key = (exp.category || "")
                            .toLowerCase()
                            .trim();

                        return (
                            <div
                                key={exp.id}
                                className="flex items-center justify-between p-2.5 rounded-xl hover:bg-black/5 transition"
                            >
                                {/* Left */}
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-white border border-gray-200 rounded-full">
                                        {icons[key] || (
                                            <Briefcase
                                                size={16}
                                                className="text-gray-400"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-gray-700 font-medium leading-tight capitalize">
                                            {exp.employeeName}
                                            <span className="text-gray-500 font-normal">
                                                {" "}
                                                ({exp.description || "—"})
                                            </span>
                                        </p>
                                        <p className="text-xs text-gray-600 mt-0.5">
                                            {exp.createdAt?.toDate
                                                ? exp.createdAt
                                                    .toDate()
                                                    .toLocaleDateString("en-IN")
                                                : "—"}
                                        </p>
                                    </div>

                                </div>

                                {/* Right */}
                                <div className="flex items-center gap-3">
                                    <p className="text-black font-semibold text-sm">
                                        ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                                    </p>

                                    <span
                                        className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${exp.status === "approved"
                                            ? "bg-green-500/15 text-green-700"
                                            : "bg-yellow-500/15 text-yellow-700"
                                            }`}
                                    >
                                        {exp.status}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-gray-500 text-xs">
                        No expenses found.
                    </p>
                )}
            </div>
        </div>
    );
}
