"use client";

import { Fragment, useState } from "react";

import {
    ChevronDown,
    ChevronUp,
    MapPin,
    Clock,
    ShieldCheck,
    ShieldX,
} from "lucide-react";
import GPSExpandedRoute from "./GPSExpandedRoute";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GPSTable({

    rows = [],

    loading,

}) {

    const [expanded, setExpanded] = useState(null);

    function formatTime(time) {

        if (!time) return "--";

        try {
            const value = typeof time?.toDate === "function" ? time.toDate() : new Date(time);
            if (Number.isNaN(value.getTime())) return "--";

            return value

                .toLocaleTimeString([], {

                    hour: "2-digit",

                    minute: "2-digit",

                });

        }

        catch {

            return "--";

        }

    }

    return (

        <div className={`${neo} rounded-3xl bg-[#F9FAFC] overflow-hidden`}>

            <div className="overflow-x-auto">

                <table className="min-w-full">

                    <thead className="bg-slate-100">

                        <tr>

                            <th className="px-6 py-4 text-left">

                            </th>

                            <th className="px-6 py-4 text-left">

                                Employee

                            </th>

                            <th className="px-6 py-4 text-left">

                                Date

                            </th>

                            <th className="px-6 py-4 text-left">

                                Check In

                            </th>

                            <th className="px-6 py-4 text-left">

                                Check Out

                            </th>

                            <th className="px-6 py-4 text-left">

                                GPS

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {rows.map((row) => (

                            <Fragment key={row.id}>
                                <tr
                                    className="border-t bg-white hover:bg-slate-50"

                                >

                                    <td className="px-6 py-4">

                                        <button

                                            onClick={() =>

                                                setExpanded(

                                                    expanded === row.id

                                                        ? null

                                                        : row.id

                                                )

                                            }

                                        >

                                            {

                                                expanded === row.id

                                                    ?

                                                    <ChevronUp size={18} />

                                                    :

                                                    <ChevronDown size={18} />

                                            }

                                        </button>

                                    </td>

                                    <td className="px-6 py-4">

                                        <div>

                                            <div className="font-semibold">

                                                {row.employeeName}

                                            </div>

                                            <div className="text-xs text-slate-500">

                                                {row.employeeId}

                                            </div>

                                        </div>

                                    </td>

                                    <td className="px-6 py-4">

                                        {row.date}

                                    </td>

                                    <td className="px-6 py-4">

                                        {formatTime(

                                            row.checkIn

                                        )}

                                    </td>

                                    <td className="px-6 py-4">

                                        {formatTime(

                                            row.checkOut

                                        )}

                                    </td>

                                    <td className="px-6 py-4">

                                        {

                                            row.gpsValid ?

                                                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-green-700">

                                                    <ShieldCheck size={16} />

                                                    Valid

                                                </span>

                                                :

                                                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-red-700">

                                                    <ShieldX size={16} />

                                                    Invalid

                                                </span>

                                        }

                                    </td>

                                </tr>

                                {
                                    expanded === row.id && (

                                        <tr>

                                            <td
                                                colSpan={6}
                                                className="bg-slate-50 p-6"
                                            >

                                                <GPSExpandedRoute
                                                    row={row}
                                                />

                                            </td>

                                        </tr>

                                    )
                                }

                            </Fragment>

                        ))}

                    </tbody>

                </table>

            </div>

            {loading && (
                <div className="space-y-3 p-6" aria-label="Loading GPS report">
                    {[0, 1, 2, 3].map((item) => (
                        <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-200/70" />
                    ))}
                </div>
            )}

            {

                !loading && rows.length === 0 &&

                <div className="p-20 text-center text-slate-500">

                    No GPS attendance found.

                </div>

            }

        </div>

    );

}
