"use client";

import { Search, RotateCcw, CalendarDays } from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function DashboardFilters({

    search,

    setSearch,

    month,

    setMonth,

    status,

    setStatus,

}) {

    function resetFilters() {

        setSearch("");

        setStatus("All");

        const today = new Date();

        setMonth(

            `${today.getFullYear()}-${String(

                today.getMonth() + 1

            ).padStart(2, "0")}`

        );

    }

    return (

        <div className={`${neo} rounded-3xl bg-white p-6`}>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

                {/* Search */}

                <div className="relative lg:col-span-6">

                    <Search

                        size={18}

                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                    <input

                        type="text"

                        value={search}

                        onChange={(e) =>

                            setSearch(e.target.value)

                        }

                        placeholder="Search quotation no, client..."

                        className="h-12 w-full rounded-2xl border border-slate-300 pl-11 pr-4 outline-none focus:border-indigo-500"

                    />

                </div>

                {/* Month */}

                <div className="relative lg:col-span-3">

                    <CalendarDays

                        size={18}

                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                    <input

                        type="month"

                        value={month}

                        onChange={(e) =>

                            setMonth(e.target.value)

                        }

                        className="h-12 w-full rounded-2xl border border-slate-300 pl-11 pr-4 outline-none focus:border-indigo-500"

                    />

                </div>

                {/* Status */}

                <div className="lg:col-span-2">

                    <select

                        value={status}

                        onChange={(e) =>

                            setStatus(e.target.value)

                        }

                        className="h-12 w-full rounded-2xl border border-slate-300 px-4 outline-none focus:border-indigo-500"

                    >

                        <option>All</option>

                        <option>Draft</option>

                        <option>Sent</option>

                        <option>Approved</option>

                        <option>Rejected</option>

                    </select>

                </div>

                {/* Reset */}

                <div className="lg:col-span-1">

                    <button

                        onClick={resetFilters}

                        className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white transition hover:bg-slate-100"

                    >

                        <RotateCcw size={18} />

                    </button>

                </div>

            </div>

        </div>

    );

}