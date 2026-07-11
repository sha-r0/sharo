"use client";

import {
    Trash2,
    CalendarClock,
} from "lucide-react";

import ActionButton from "../../../expenses/components/ActionButton";

import LeavePolicyService from "../services/LeaveTypeService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveTypeTable({

    companyId,

    leaveTypes,

    onSaved,

}) {

    ///////////////////////////////////////////////////////

    async function handleDelete(id) {

        if (!confirm("Delete Leave Type ?"))
            return;

        try {

            await LeavePolicyService.deleteLeaveType(

                companyId,

                id

            );

            onSaved?.();

        } catch (e) {

            console.error(e);

            alert(e.message);

        }

    }

    ///////////////////////////////////////////////////////

    return (

        <div
            className={`${neo} overflow-hidden rounded-3xl bg-[#F9FAFC]`}
        >

            {/* Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">

                <div>

                    <h2 className="text-2xl font-bold text-slate-800">

                        Leave Types

                    </h2>

                    <p className="mt-1 text-slate-500">

                        All configured leave types.

                    </p>

                </div>

                <div className="rounded-2xl bg-indigo-100 px-5 py-3 font-semibold text-indigo-700">

                    Total :
                    {" "}
                    {leaveTypes.length}

                </div>

            </div>

            {/* Table */}

            <div>

                <div className="grid grid-cols-[120px_2fr_120px_140px_140px_140px_120px] bg-[#EEF4FF] px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-700">

                    <div>

                        Code

                    </div>

                    <div>

                        Leave Name

                    </div>

                    <div>

                        Leaves

                    </div>

                    <div>

                        Weekly Off

                    </div>

                    <div>

                        Holiday

                    </div>

                    <div>

                        Type

                    </div>

                    <div className="text-center">

                        Action

                    </div>

                </div>

                {/* Body */}

                {leaveTypes.length === 0 ? (

                    <div className="py-16 text-center text-slate-500">

                        No Leave Types Found

                    </div>

                ) : (

                    leaveTypes.map((leave) => (

                        <div
                            key={leave.id}
                            className="grid grid-cols-[120px_2fr_120px_140px_140px_140px_120px] items-center border-t border-slate-200 bg-white px-6 py-5 transition hover:bg-slate-50"
                        >

                            {/* Code */}

                            <div>

                                <span className="rounded-full bg-indigo-100 px-3 py-2 text-sm font-semibold text-indigo-700">

                                    {leave.code}

                                </span>

                            </div>

                            {/* Name */}

                            <div>

                                <h3 className="font-semibold text-slate-800">

                                    {leave.name}

                                </h3>

                            </div>

                            {/* Total */}

                            <div>

                                <span className="rounded-full bg-yellow-100 px-3 py-2 text-sm font-semibold text-yellow-700">

                                    {leave.total}

                                </span>

                            </div>

                            {/* Weekly Off */}

                            <div>

                                <BooleanBadge
                                    value={leave.includeWeeklyOff}
                                />

                            </div>

                            {/* Holiday */}

                            <div>

                                <BooleanBadge
                                    value={leave.includeHoliday}
                                />

                            </div>

                            {/* Type */}

                            <div>

                                <TypeBadge
                                    type={leave.type}
                                />

                            </div>

                            {/* Action */}

                            <div className="flex justify-center">

                                <ActionButton
                                    label="Delete"
                                    className="bg-red-50 text-red-600"
                                    onClick={() =>
                                        handleDelete(
                                            leave.id
                                        )
                                    }
                                >

                                    <Trash2 size={18} />

                                </ActionButton>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </div>

    );

}

/* ====================================================== */

function BooleanBadge({

    value,

}) {

    return (

        <span
            className={`rounded-full px-4 py-2 text-sm font-semibold

${value

                    ? "bg-green-100 text-green-700"

                    : "bg-red-100 text-red-700"

                }`}
        >

            {value ? "Yes" : "No"}

        </span>

    );

}

/* ====================================================== */

function TypeBadge({

    type,

}) {

    const color =

        type === "Monthly"

            ? "bg-purple-100 text-purple-700"

            : "bg-blue-100 text-blue-700";

    return (

        <span
            className={`rounded-full px-4 py-2 text-sm font-semibold ${color}`}
        >

            <CalendarClock
                size={14}
                className="mr-1 inline"
            />

            {type}

        </span>

    );

}