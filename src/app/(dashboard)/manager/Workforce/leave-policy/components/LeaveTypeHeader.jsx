"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  FileClock,
  Umbrella,
  ClipboardList,
  Settings2,
} from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveTypeHeader({
  onAdd,
}) {
  const router = useRouter();

  const actions = [
    {
      label: "Leave Policy",
      icon: ClipboardList,
      href: "/dashboard/workforce/leave-policy",
      bg: "bg-blue-50",
      color: "text-blue-600",
    },
    {
      label: "Holiday Calendar",
      icon: CalendarDays,
      href: "/dashboard/workforce/holidays",
      bg: "bg-green-50",
      color: "text-green-600",
    },
    {
      label: "Leave Requests",
      icon: FileClock,
      href: "/dashboard/workforce/leaves",
      bg: "bg-orange-50",
      color: "text-orange-600",
    },
    {
      label: "Leave Balance",
      icon: Umbrella,
      href: "/dashboard/workforce/leave-balance",
      bg: "bg-purple-50",
      color: "text-purple-600",
    },
  ];

  return (
    <div className="flex items-center justify-between">

      {/* Left */}

      <div className="flex items-center gap-5">

        <div
          className={`${neo} flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white`}
        >
          <CalendarDays size={24} />
        </div>

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Leave Types
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Configure leave types available for employees.
          </p>

        </div>

      </div>

      {/* Right */}

      <div className="flex items-center gap-3">

        {actions.map(
          ({
            label,
            icon: Icon,
            href,
            bg,
            color,
          }) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className={`${neo} flex items-center gap-3 rounded-2xl ${bg} px-4 py-3 transition hover:scale-[1.02]`}
            >
              <Icon
                size={20}
                className={color}
              />

              <span
                className={`font-medium ${color}`}
              >
                {label}
              </span>
            </button>
          )
        )}

        <button
          onClick={onAdd}
          className={`${neo} flex items-center gap-3 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700`}
        >
          <Plus size={20} />

          Add Leave Type
        </button>

      </div>

    </div>
  );
}