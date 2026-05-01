"use client";

import { useEffect, useState } from "react";
import { calculateEmployeePerformance } from "@/app/allservice/calculateEmployeePerformance";
import { Award } from "lucide-react";

export default function EmployeeOfMonthCard({ startDate, endDate }) {
    const [ranking, setRanking] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!startDate || !endDate) return;

        const fetchRanking = async () => {
            setLoading(true);
            const res = await calculateEmployeePerformance(startDate, endDate);
            setRanking(res || []);
            setLoading(false);
        };

        fetchRanking();
    }, [startDate, endDate]);

    const top3 = ranking.slice(0, 3);
    const employeeOfMonth = ranking[0];

    if (loading) {
        return (
            <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5 text-black/60">
                Calculating Employee of the Quarter...
            </div>
        );
    }

    if (!ranking.length) {
        return (
            <div className="bg-[#F8F9FD] border border-whiterounded-2xl p-5 text-black/60">
                No performance data for this period.
            </div>
        );
    }

    return (
        <div className="bg-[#F8F9FD] border border-white rounded-2xl p-5 space-y-4">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">

                {/* LEFT SIDE ICON + TITLE */}
                <div className="flex items-center gap-2">

                    <div className="
                       w-6 h-6 rounded-lg
                       flex items-center justify-center
                       bg-gradient-to-br from-yellow-400 to-amber-600
                       shadow-[0_8px_20px_rgba(251,191,36,0.35)]
                     ">
                        <Award size={15} className="text-white" />
                    </div>

                    <h3 className="text-lg font-semibold text-black">
                        Employee of the Quarter
                    </h3>

                </div>

            </div>

            {/* 🏆 MAIN WINNER */}
            <div className="bg-yellow-500/15 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 text-xl font-bold">
                    🏆
                </div>
                <div>
                    <div className="text-black font-semibold text-lg">
                        {employeeOfMonth.name}
                    </div>
                    <div className="text-sm text-black/60">
                        Score: {employeeOfMonth.score} 
                    </div>
                </div>
            </div>
        </div>
    );

}
