"use client";

import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  FileClock,
  Wallet,
  ShieldCheck,
} from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const tabs = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "types",
    label: "Leave Types",
    icon: ClipboardList,
  },
  {
    key: "holidays",
    label: "Holiday Calendar",
    icon: CalendarDays,
  },
  {
    key: "requests",
    label: "Leave Requests",
    icon: FileClock,
  },
  {
    key: "balance",
    label: "Leave Balance",
    icon: Wallet,
  },
  {
    key: "policies",
    label: "Policies",
    icon: ShieldCheck,
  },
];

export default function LeaveTabs({
  activeTab,
  onChange,
}) {
  return (
    <div
      className={`${neo} flex flex-wrap items-center gap-3 rounded-3xl bg-[#F9FAFC] p-3`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;

        const active =
          activeTab === tab.key;

        return (
          <button
            key={tab.key}
            onClick={() =>
              onChange(tab.key)
            }
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all

            ${
              active
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <Icon size={18} />

            {tab.label}
          </button>
        );
      })}
    </div>
  );
}