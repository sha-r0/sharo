"use client";

import {
  CalendarDays,
  ClipboardList,
  FileClock,
  Wallet,
  LayoutDashboard,
  Plus,
} from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const tabs = {
  dashboard: {
    title: "Leave Management",
    subtitle: "Overview of employee leave activities.",
    icon: LayoutDashboard,
    button: null,
  },

  types: {
    title: "Leave Types",
    subtitle: "Configure leave types for your company.",
    icon: ClipboardList,
    button: "Add Leave Type",
  },

  holidays: {
    title: "Holiday Calendar",
    subtitle: "Manage company and national holidays.",
    icon: CalendarDays,
    button: "Add Holiday",
  },

  requests: {
    title: "Leave Requests",
    subtitle: "Review and approve leave requests.",
    icon: FileClock,
    button: "Apply Leave",
  },

  balance: {
    title: "Leave Balance",
    subtitle: "Employee leave balances.",
    icon: Wallet,
    button: null,
  },

  policies: {
    title: "Leave Policies",
    subtitle: "Assign leave policies to employees.",
    icon: ClipboardList,
    button: "Add Policy",
  },
};

export default function LeaveHeader({
  activeTab,
  onAdd,
}) {
  const current = tabs[activeTab];

  const Icon = current.icon;

  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-5">

        <div
          className={`${neo} flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white`}
        >
          <Icon size={28} />
        </div>

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            {current.title}
          </h1>

          <p className="mt-1 text-slate-500">
            {current.subtitle}
          </p>

        </div>

      </div>

      {current.button && (

        <button
          onClick={onAdd}
          className={`${neo} flex items-center gap-3 rounded-2xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700`}
        >

          <Plus size={20} />

          {current.button}

        </button>

      )}

    </div>
  );
}