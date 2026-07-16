"use client";

import { Info } from "lucide-react";
import AttendanceService from "../services/AttendanceService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AttendanceTable({

    days = [],

    report = [],

    view = "summary",

}) {

    return (

        <div
            className={`${neo} overflow-hidden rounded-3xl bg-[#F9FAFC]`}
        >

            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-7 py-5">

                <div>

                    <h2 className="text-2xl font-bold text-slate-800">

                        Attendance Report

                    </h2>

                    <p className="mt-1 text-slate-500">

                        Employee attendance for selected period.

                    </p>

                </div>

                <div className="rounded-xl bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-700">

                    {report.length} Employees

                </div>

            </div>

            {/* Table */}

            <div className="overflow-auto">

                <table className="min-w-max border-separate border-spacing-0">

                    <thead>

                        <tr>

                            {/* Sticky Employee */}

                            <th
                                className="sticky left-0 z-30 w-72 border-b border-r border-slate-200 bg-[#EEF4FF] px-6 py-4 text-left text-sm font-bold uppercase tracking-wide text-slate-700"
                            >

                                Employee

                            </th>

                            {days.map((day) => {

                                const d = new Date(day);

                                return (

                                    <th

                                        key={day}

                                        className="min-w-[85px] border-b border-slate-200 bg-[#EEF4FF] px-3 py-4 text-center"

                                    >

                                        <div className="text-sm font-bold text-slate-700">

                                            {String(
                                                d.getDate()
                                            ).padStart(2, "0")}

                                        </div>

                                        <div className="mt-1 text-xs text-slate-500">

                                            {d.toLocaleDateString(

                                                "en-US",

                                                {

                                                    weekday:
                                                        "short",

                                                }

                                            )}

                                        </div>

                                    </th>

                                );

                            })}

                        </tr>

                    </thead>

                    <tbody>

                        {report.map((row) => (

                            <tr
                                key={row.id}
                                className="hover:bg-slate-50"
                            >

                                {/* Employee */}

                                <td className="sticky left-0 z-20 border-b border-r border-slate-200 bg-white px-6 py-4">

                                    <div>

                                        <h3 className="font-semibold text-slate-800">

                                            {row.employee.name}

                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">

                                            {row.employee.employeeId}

                                        </p>

                                        <p className="text-xs text-slate-400">

                                            {row.employee.department}

                                        </p>

                                    </div>

                                </td>

                                {/* Attendance Cells */}

                                {days.map((day) => {

                                    const status =
                                        row.days?.[day];

                                    const detail =
                                        row.details?.[day];

                                    return (

                                        <td
                                            key={day}
                                            className="border-b border-slate-200 px-2 py-3 text-center"
                                        >

                                            {view === "summary" ? (

                                                <span
                                                    className={`inline-flex min-w-[42px] justify-center rounded-xl px-3 py-2 text-xs font-bold ${AttendanceService.getStatusColor(
                                                        status
                                                    )}`}
                                                    title={
                                                        detail?.status ||
                                                        status
                                                    }
                                                >

                                                    {status}

                                                </span>

                                            ) : (

                                                <div className="group relative">

                                                    <div className="mx-auto flex h-12 w-16 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white text-[11px]">

                                                        <span className="font-semibold text-slate-700">

                                                            {detail?.checkIn ||
                                                                "--:--"}

                                                        </span>

                                                        <span className="text-slate-400">

                                                            {detail?.checkOut ||
                                                                "--:--"}

                                                        </span>

                                                    </div>

                                                    {/* Tooltip */}

                                                    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-3 hidden w-52 -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl group-hover:block">

                                                        <div className="mb-3 flex items-center gap-2">

                                                            <Info
                                                                size={16}
                                                                className="text-indigo-600"
                                                            />

                                                            <span className="font-semibold text-slate-800">

                                                                Attendance

                                                            </span>

                                                        </div>

                                                        <div className="space-y-2 text-sm">

                                                            <div className="flex justify-between">

                                                                <span className="text-slate-500">

                                                                    Check In

                                                                </span>

                                                                <span className="font-medium">

                                                                    {detail?.checkIn ||
                                                                        "--:--"}

                                                                </span>

                                                            </div>

                                                            <div className="flex justify-between">

                                                                <span className="text-slate-500">

                                                                    Check Out

                                                                </span>

                                                                <span className="font-medium">

                                                                    {detail?.checkOut ||
                                                                        "--:--"}

                                                                </span>

                                                            </div>

                                                            <div className="flex justify-between">

                                                                <span className="text-slate-500">

                                                                    Hours

                                                                </span>

                                                                <span className="font-medium">

                                                                    {detail?.totalHours ||
                                                                        "0.00"}

                                                                </span>

                                                            </div>

                                                            <div className="flex justify-between">

                                                                <span className="text-slate-500">

                                                                    Status

                                                                </span>

                                                                <span className="font-semibold text-indigo-600">

                                                                    {detail?.status ||
                                                                        "Absent"}

                                                                </span>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                            )}

                                        </td>

                                    );

                                })}

                            </tr>

                        ))}

                        {report.length === 0 && (

                            <tr>

                                <td
                                    colSpan={days.length + 1}
                                    className="py-20 text-center"
                                >

                                    <div className="mx-auto max-w-sm">

                                        <div className="mb-4 flex justify-center">

                                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">

                                                <Info
                                                    size={30}
                                                    className="text-slate-400"
                                                />

                                            </div>

                                        </div>

                                        <h3 className="text-xl font-semibold text-slate-700">

                                            No Attendance Found

                                        </h3>

                                        <p className="mt-2 text-slate-500">

                                            Select employees and date range to generate the attendance report.

                                        </p>

                                    </div>

                                </td>

                            </tr>

                        )}

                    </tbody>

                </table>

            </div>

        </div>

    );

}