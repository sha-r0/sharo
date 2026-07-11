"use client";

import { MapPin } from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function EmployeeMiniCard({
  image = "https://i.pravatar.cc/100",
  name,
  subtitle,
  rightText,
  status,
  showLocation = false,
}) {
  const badge = {
    Present: "bg-emerald-50 text-emerald-600",
    Late: "bg-orange-50 text-orange-600",
    Absent: "bg-red-50 text-red-600",

    Pending: "bg-yellow-50 text-yellow-700",
    Approved: "bg-emerald-50 text-emerald-600",
    Rejected: "bg-red-50 text-red-600",
  };

  return (
    <div
      className={`${neo} rounded-xl bg-white px-3 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">

        {/* Left */}

        <div className="flex min-w-0 items-center gap-2.5">

          <img
            src={image}
            alt={name}
            className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
          />

          <div className="min-w-0">

            <h3 className="truncate text-[13px] font-semibold leading-none text-slate-800">
              {name}
            </h3>

            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {subtitle}
            </p>

          </div>

        </div>

        {/* Right */}

        <div className="ml-3 flex shrink-0 items-center gap-2">

          <div className="text-right">

            <p className="text-[13px] font-semibold leading-none text-slate-700">
              {rightText}
            </p>

            <div className="mt-1 flex items-center justify-end gap-1.5">

              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${badge[status]}`}
              >
                {status}
              </span>

            </div>

          </div>

          {showLocation && (
            <button className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50 transition hover:bg-green-100">
              <MapPin
                size={12}
                className="text-green-600"
              />
            </button>
          )}

        </div>

      </div>
    </div>
  );
}