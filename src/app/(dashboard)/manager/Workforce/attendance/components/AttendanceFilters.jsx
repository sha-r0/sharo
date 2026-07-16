"use client";

import {
    Search,
    CalendarDays,
    Building2,
    Clock3,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AttendanceFilters({

    filters,

    setFilters,

    departments = [],

    shifts = [],

}) {

    ////////////////////////////////////////////////////

    function update(key, value) {

        setFilters((prev) => ({

            ...prev,

            [key]: value,

        }));

    }

    ////////////////////////////////////////////////////

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >

            <div className="grid grid-cols-6 gap-5">

                {/* From */}

                <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">

                        <CalendarDays size={16} />

                        From

                    </label>

                    <input

                        type="date"

                        value={filters.fromDate}

                        onChange={(e) =>
                            update(
                                "fromDate",
                                e.target.value
                            )
                        }

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"

                    />

                </div>

                {/* To */}

                <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">

                        <CalendarDays size={16} />

                        To

                    </label>

                    <input

                        type="date"

                        value={filters.toDate}

                        onChange={(e) =>
                            update(
                                "toDate",
                                e.target.value
                            )
                        }

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"

                    />

                </div>

                {/* Search */}

                <div className="col-span-2">

                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">

                        <Search size={16} />

                        Search Employee

                    </label>

                    <input

                        type="text"

                        value={filters.search}

                        onChange={(e) =>
                            update(
                                "search",
                                e.target.value
                            )
                        }

                        placeholder="Search by employee name..."

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"

                    />

                </div>

                {/* Department */}

                <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">

                        <Building2 size={16} />

                        Department

                    </label>

                    <select

                        value={filters.department}

                        onChange={(e) =>
                            update(
                                "department",
                                e.target.value
                            )
                        }

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="">

                            All Departments

                        </option>

                        {departments.map((d) => (

                            <option
                                key={d}
                                value={d}
                            >

                                {d}

                            </option>

                        ))}

                    </select>

                </div>

                {/* Shift */}

                <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600">

                        <Clock3 size={16} />

                        Shift

                    </label>

                    <select

                        value={filters.shift}

                        onChange={(e) =>
                            update(
                                "shift",
                                e.target.value
                            )
                        }

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="">

                            All Shifts

                        </option>

                        {shifts.map((shift) => (

                            <option
                                key={shift}
                                value={shift}
                            >

                                {shift}

                            </option>

                        ))}

                    </select>

                </div>

            </div>

            {/* View Toggle */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-6">

                {/* Summary / Detailed */}

                <div>

                    <label className="mb-3 block text-sm font-medium text-slate-600">

                        View

                    </label>

                    <div className="flex rounded-2xl border border-slate-200 bg-white p-1">

                        <button

                            onClick={() =>
                                update(
                                    "view",
                                    "summary"
                                )
                            }

                            className={`rounded-xl px-6 py-2 text-sm font-semibold transition ${filters.view === "summary"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}

                        >

                            Summary

                        </button>

                        <button

                            onClick={() =>
                                update(
                                    "view",
                                    "detailed"
                                )
                            }

                            className={`rounded-xl px-6 py-2 text-sm font-semibold transition ${filters.view === "detailed"
                                ? "bg-indigo-600 text-white"
                                : "text-slate-600 hover:bg-slate-100"
                                }`}

                        >

                            Detailed

                        </button>

                    </div>

                </div>

                {/* Active Filters */}

                <div className="flex flex-wrap items-center gap-2">

                    {filters.department && (

                        <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700">

                            {filters.department}

                        </span>

                    )}

                    {filters.shift && (

                        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">

                            {filters.shift}

                        </span>

                    )}

                    {filters.search && (

                        <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">

                            "{filters.search}"

                        </span>

                    )}

                </div>

            </div>

        </div>

    );

}