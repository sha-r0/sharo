"use client";

import { useState } from "react";

import Dashboard from "../modules/Dashboard";
import ShiftPolicy from "../modules/ShiftPolicy";
import LeavePolicy from "../modules/LeavePolicy";
import EmployeeAttendance from "../modules/EmployeeAttendance";
import GPSReport from "../modules/GPSReport";

export default function TopNav() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  const tabs = [
    "Dashboard",
    "Shift Policy",
    "Leave Policy",
    "Employee Attendance",
    "GPS Report",
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "Dashboard":
        return <Dashboard />;

      case "Shift Policy":
        return <ShiftPolicy />;

      case "Leave Policy":
        return <LeavePolicy />;

      case "Employee Attendance":
        return <EmployeeAttendance />;

      case "GPS Report":
        return <GPSReport />;

      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="space-y-4 p-4">

      {/* ✅ NAV BUTTONS */}
      <div className="flex gap-3 bg-white p-3 rounded-xl shadow">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "bg-gray-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ✅ CONTENT */}
      <div className="">
        {renderContent()}
      </div>

    </div>
  );
}