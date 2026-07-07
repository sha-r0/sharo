"use client";

import { useState, useEffect } from "react";
import SummaryCards from "./components/SummaryCards";
import OverallPerformanceCard from "./components/OverallPerformanceCard";
import EmployeeOfMonthCard from "./components/EmployeeOfMonthCard";
import EmployeeLocationCard from "./components/EmployeeLocationCard";
import TodosCard from "./components/TodosCard";
import TodayWorkCard from "./components/TodayWorkCard";
import MyExpensesCard from "./components/MyExpensesCard";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function ManagerDashboard() {

  /* ================= STATES ================= */
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { company, loading,} = useAuth();
  
  const COMPANY_ID = company?.id;


/* ================= SET CURRENT MONTH ================= */
useEffect(() => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const format = (d) =>
    new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .split("T")[0];

  setStartDate(format(first));
  setEndDate(format(last));
}, []);

if (loading || !COMPANY_ID) {

  return (

    <div className="flex items-center justify-center h-[70vh]">

      Loading Dashboard...

    </div>

  );

}

  return (
    <div className="flex flex-col lg:flex-row gap-4">

      <div className="space-y-4">

        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <h2 className="font-bold text-2xl sm:text-3xl text-black">
            Overview
          </h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <div>
              <label className="text-sm text-black mr-2">
                From
              </label>
              <input
                type="date"
                className="
                  bg-white
                  text-black
                  rounded-lg p-2
                  border border-white
                  focus:outline-none
                  focus:ring-2 focus:ring-indigo-500
                "
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-black mr-2">
                To
              </label>
              <input
                type="date"
                className="
                  bg-white
                  text-black
                  rounded-lg p-2
                  border border-white
                  focus:outline-none
                  focus:ring-2 focus:ring-indigo-500
                "
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ================= MAIN GRID ================= */}
        <div className="flex gap-4">

          {/* LEFT 67% */}
          <div className="left lg:w-[67%] space-y-4">

            {/* TOP ROW: SUMMARY CARDS (NOW CONTROLLED BY HEADER DATES) */}
            <SummaryCards
              startDate={startDate}
              endDate={endDate}
              companyId={COMPANY_ID}
            />

            {/* SECOND ROW */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <OverallPerformanceCard startDate={startDate} endDate={endDate} />

              </div>

              <EmployeeOfMonthCard
                startDate={startDate}
                endDate={endDate}
              />
            </div>
          </div>

          {/* RIGHT 33% — EMPLOYEE LOCATION PANEL */}
          <div className="lg:w-[33%]">
            <EmployeeLocationCard />
          </div>

        </div>

        {/* THIRD ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TodosCard companyId={COMPANY_ID} />
          <TodayWorkCard />
          <MyExpensesCard companyId={COMPANY_ID} />
        </div>

      </div>
    </div>
  );
}