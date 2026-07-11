"use client";

import { useState } from "react";
import {
    CalendarDays,
    Plus,
    Eye,
    Pencil,
    Trash2,
} from "lucide-react";

import ActionButton from "../../../expenses/components/ActionButton";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function HolidayCalendar() {

    const [holidays] = useState([
        {
            id: 1,
            date: "01 Jan 2026",
            day: "Thursday",
            name: "New Year",
            type: "National Holiday",
        },
        {
            id: 2,
            date: "26 Jan 2026",
            day: "Monday",
            name: "Republic Day",
            type: "National Holiday",
        },
        {
            id: 3,
            date: "08 Mar 2026",
            day: "Sunday",
            name: "Holi",
            type: "Festival",
        },
        {
            id: 4,
            date: "15 Aug 2026",
            day: "Saturday",
            name: "Independence Day",
            type: "National Holiday",
        },
        {
            id: 5,
            date: "02 Oct 2026",
            day: "Friday",
            name: "Gandhi Jayanti",
            type: "National Holiday",
        },
        {
            id: 6,
            date: "01 Nov 2026",
            day: "Sunday",
            name: "Diwali",
            type: "Festival",
        },
    ]);

    return (

        <div className="space-y-7">

            {/* Table */}

            <div
                className={`${neo} overflow-hidden rounded-[30px] bg-[#F9FAFC]`}
            >

                {/* Header */}

                <div className="grid grid-cols-4 bg-[#EEF4FF] px-8 py-6 font-semibold text-slate-700">

                    <div>Date</div>

                    <div>Holiday</div>

                    <div>Category</div>

                    <div className="text-center">

                        Action

                    </div>

                </div>

                {/* Rows */}

                {holidays.map((holiday) => (

                    <div
                        key={holiday.id}
                        className="grid grid-cols-4 items-center border-t border-slate-200 bg-white px-8 py-5 transition hover:bg-slate-50"
                    >

                        {/* Date */}

                        <div>

                            <h3 className="text-lg font-bold text-slate-800">

                                {holiday.date}

                            </h3>

                            <p className="text-sm text-slate-500">

                                {holiday.day}

                            </p>

                        </div>

                        {/* Holiday */}

                        <div>

                            <h3 className="text-lg font-semibold text-slate-800">

                                {holiday.name}

                            </h3>

                        </div>

                        {/* Category */}

                        <div>

                            <HolidayBadge
                                type={holiday.type}
                            />

                        </div>

                        {/* Action */}

                        <div className="flex justify-center gap-3">

                            <ActionButton
                                label="View"
                                className="bg-indigo-50 text-indigo-600"
                            >
                                <Eye size={18} />
                            </ActionButton>

                            <ActionButton
                                label="Edit"
                                className="bg-blue-50 text-blue-600"
                            >
                                <Pencil size={18} />
                            </ActionButton>

                            <ActionButton
                                label="Delete"
                                className="bg-red-50 text-red-600"
                            >
                                <Trash2 size={18} />
                            </ActionButton>

                        </div>

                    </div>

                ))}

            </div>

            {/* Empty State */}

            {holidays.length === 0 && (

                <div
                    className={`${neo} rounded-3xl bg-[#F9FAFC] py-24 text-center`}
                >

                    <CalendarDays
                        size={60}
                        className="mx-auto text-slate-300"
                    />

                    <h2 className="mt-6 text-2xl font-bold text-slate-700">

                        No Holidays Found

                    </h2>

                    <p className="mt-2 text-slate-500">

                        Click "Add Holiday" to create your first holiday.

                    </p>

                </div>

            )}

        </div>

    );

}

/* ========================================================= */

function HolidayBadge({
    type,
}) {

    const styles = {

        "National Holiday":
            "bg-green-100 text-green-700",

        Festival:
            "bg-orange-100 text-orange-700",

        "Restricted Holiday":
            "bg-purple-100 text-purple-700",

        "Company Holiday":
            "bg-blue-100 text-blue-700",

    };

    return (

        <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${styles[type] ||
                "bg-slate-100 text-slate-700"
                }`}
        >

            {type}

        </span>

    );

}