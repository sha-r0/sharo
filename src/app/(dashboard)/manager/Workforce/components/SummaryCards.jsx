"use client";

import {
  Users,
  CircleCheckBig,
  Clock3,
  UserX,
  Umbrella,
  MapPinned,
  FileClock,
} from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const cards = [
  {
    title: "Total Employees",
    value: 42,
    subtitle: "+2 this month",
    icon: Users,
    bg: "bg-blue-100",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
    trendColor: "#2563eb",
  },
  {
    title: "Present Today",
    value: 36,
    subtitle: "85.71% of total",
    icon: CircleCheckBig,
    bg: "bg-green-100",
    iconColor: "text-green-600",
    valueColor: "text-green-600",
    trendColor: "#16a34a",
  },
  {
    title: "Late Today",
    value: 3,
    subtitle: "7.14% of total",
    icon: Clock3,
    bg: "bg-orange-100",
    iconColor: "text-orange-500",
    valueColor: "text-orange-500",
    trendColor: "#f97316",
  },
  {
    title: "Absent Today",
    value: 2,
    subtitle: "4.76% of total",
    icon: UserX,
    bg: "bg-red-100",
    iconColor: "text-red-500",
    valueColor: "text-red-500",
    trendColor: "#ef4444",
  },
  {
    title: "On Leave",
    value: 1,
    subtitle: "Approved",
    icon: Umbrella,
    bg: "bg-purple-100",
    iconColor: "text-purple-600",
    valueColor: "text-purple-600",
    trendColor: "#8b5cf6",
  },
];

export default function SummaryCards() {
  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <SummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  bg,
  iconColor,
  valueColor,
}) {
  return (
    <div className={`${neo} rounded-3xl bg-white p-4`}>
      <div className="flex items-center gap-3">
        <div
          className={`h-14 w-14 rounded-2xl ${bg} flex items-center justify-center shrink-0`}
        >
          <Icon className={iconColor} size={24} strokeWidth={2.2} />
        </div>

        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-slate-800 leading-4">
            {title}
          </h3>

          <h2 className={`mt-1 flex items-center font-bold ${valueColor}`}>
            <span className="text-2xl">{value}</span>
            <span className="ml-2 text-sm font-medium text-slate-500">
              ({subtitle})
            </span>
          </h2>
        </div>
      </div>
    </div>
  );
}