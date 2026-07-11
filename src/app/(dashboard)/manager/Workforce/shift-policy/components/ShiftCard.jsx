"use client";

import {
  Eye,
  Pencil,
  Trash2,
  Clock3,
  Coffee,
  CalendarDays,
  MapPin,
  Timer,
  Moon,
  Sun,
} from "lucide-react";

import ActionButton from "../../../expenses/components/ActionButton";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ShiftCard({
  shift,
  onView,
  onEdit,
  onDelete,
}) {

  return (

    <div
      className={`${neo} rounded-3xl bg-[#F9FAFC] p-6 transition-all duration-300 hover:-translate-y-1`}
    >

      {/* Header */}

      <div className="flex items-start justify-between">

        <div>

          <div className="flex items-center gap-3">

            <h2 className="text-2xl font-bold text-slate-800">
              {shift.name}
            </h2>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold

              ${shift.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
                }`}
            >
              {shift.status === "active"
                ? "Active"
                : "Inactive"}
            </span>

          </div>

          <p className="mt-2 text-sm text-slate-500">

            Code : <span className="font-semibold">{shift.code}</span>

          </p>

          {shift.description && (

            <p className="mt-2 text-sm text-slate-500">

              {shift.description}

            </p>

          )}

        </div>

        <div>

          {shift.isNightShift ? (

            <div className="flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-2 text-indigo-700">

              <Moon size={16} />

              <span className="text-xs font-semibold">

                Night Shift

              </span>

            </div>

          ) : (

            <div className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-2 text-yellow-700">

              <Sun size={16} />

              <span className="text-xs font-semibold">

                Day Shift

              </span>

            </div>

          )}

        </div>

      </div>



      {/* Main Info */}

      <div className="mt-8 grid grid-cols-4 gap-5">

        <Info
          icon={Clock3}
          title="Office Timing"
          value={`${shift.startTime} - ${shift.endTime}`}
        />

        <Info
          icon={Timer}
          title="Working Hours"
          value={shift.workingHours}
        />

        <Info
          icon={Coffee}
          title="Break"
          value={
            shift.breakStart
              ? `${shift.breakStart} - ${shift.breakEnd}`
              : "No Break"
          }
        />

        <Info
          icon={CalendarDays}
          title="Weekly Off"
          value={
            shift.weeklyOff?.primary || "-"
          }
        />

      </div>



      {/* Summary */}

      <div className="mt-8 grid grid-cols-4 gap-4">

        <SmallCard
          title="Late Grace"
          value={`${shift.attendance?.lateGrace || 0} Min`}
          color="text-orange-600"
        />

        <SmallCard
          title="Minimum Hours"
          value={
            shift.attendance?.minimumWorkingHours || "-"
          }
          color="text-blue-600"
        />

        <SmallCard
          title="GPS Radius"
          value={`${shift.gps?.attendanceRadius || 0} m`}
          color="text-green-600"
        />

        <SmallCard
          title="Overtime"
          value={
            shift.payroll?.allowOvertime
              ? "Enabled"
              : "Disabled"
          }
          color="text-purple-600"
        />

      </div>

      {/* GPS & Attendance */}

      <div className="mt-8 flex flex-wrap items-center gap-3">

        <Badge
          icon={MapPin}
          color={
            shift.gps?.gpsRequired
              ? "green"
              : "gray"
          }
          label={
            shift.gps?.gpsRequired
              ? "GPS Required"
              : "GPS Optional"
          }
        />

        <Badge
          icon={Clock3}
          color="blue"
          label={
            shift.attendance?.enableAutoCheckout
              ? "Auto Checkout"
              : "Manual Checkout"
          }
        />

        <Badge
          icon={Timer}
          color="purple"
          label={
            shift.payroll?.allowOvertime
              ? "Overtime Enabled"
              : "No Overtime"
          }
        />

      </div>



      {/* ACTIONS */}

      <div className="mt-8 flex justify-end gap-3">

        <ActionButton
          label="View"
          className="bg-indigo-50 text-indigo-600"
          onClick={() => onView(shift)}
        >
          <Eye size={18} />
        </ActionButton>

        <ActionButton
          label="Edit"
          className="bg-blue-50 text-blue-600"
          onClick={() => onEdit(shift)}
        >
          <Pencil size={18} />
        </ActionButton>

        <ActionButton
          label="Delete"
          className="bg-red-50 text-red-600"
          onClick={() => onDelete(shift)}
        >
          <Trash2 size={18} />
        </ActionButton>

      </div>

    </div>

  );

}



function Info({

  icon: Icon,

  title,

  value,

}) {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <div className="flex items-center gap-2 text-slate-500">

        <Icon size={17} />

        <span className="text-sm font-medium">

          {title}

        </span>

      </div>

      <h3 className="mt-3 text-base font-bold text-slate-800">

        {value || "-"}

      </h3>

    </div>

  );

}



function SmallCard({

  title,

  value,

  color,

}) {

  return (

    <div className="rounded-2xl border border-slate-200 bg-white p-4">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

        {title}

      </p>

      <h2 className={`mt-2 text-lg font-bold ${color}`}>

        {value || "-"}

      </h2>

    </div>

  );

}



function Badge({

  icon: Icon,

  label,

  color,

}) {

  const styles = {

    green: "bg-green-100 text-green-700",

    blue: "bg-blue-100 text-blue-700",

    purple: "bg-purple-100 text-purple-700",

    gray: "bg-slate-100 text-slate-600",

  };

  return (

    <div
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${styles[color]}`}
    >

      <Icon size={16} />

      {label}

    </div>

  );

}