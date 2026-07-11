"use client";

import {
    Eye,
    Pencil,
    Trash2,
    CalendarDays,
    Coins,
    CheckCircle2,
    XCircle,
} from "lucide-react";

import ActionButton from "../../../expenses/components/ActionButton";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveTypeCard({
    leave,
    onView,
    onEdit,
    onDelete,
}) {
    return (
        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-6 transition hover:-translate-y-1`}
        >

            {/* Header */}

            <div className="flex items-start justify-between">

                <div className="flex items-center gap-4">

                    <div
                        className="h-14 w-4 rounded-full"
                        style={{
                            background: leave.basic?.color || "#2563EB",
                        }}
                    />

                    <div>

                        <div className="flex items-center gap-3">

                            <h2 className="text-2xl font-bold text-slate-800">
                                {leave.basic?.name}
                            </h2>

                            <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${leave.basic?.active
                                        ? "bg-green-100 text-green-700"
                                        : "bg-red-100 text-red-700"
                                    }`}
                            >
                                {leave.basic?.active
                                    ? "Active"
                                    : "Inactive"}
                            </span>

                        </div>

                        <p className="mt-2 text-sm text-slate-500">

                            Code :
                            <span className="ml-1 font-semibold">

                                {leave.basic?.code}

                            </span>

                        </p>

                    </div>

                </div>

                <div>

                    {leave.rules?.paid ? (

                        <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">

                            Paid Leave

                        </span>

                    ) : (

                        <span className="rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-700">

                            Unpaid

                        </span>

                    )}

                </div>

            </div>

            {/* Summary */}

            <div className="mt-8 grid grid-cols-3 gap-5">

                <Info
                    icon={CalendarDays}
                    title="Annual Allocation"
                    value={`${leave.limits?.annualAllocation || 0} Days`}
                />

                <Info
                    icon={Coins}
                    title="Monthly Accrual"
                    value={`${leave.limits?.monthlyAccrual || 0} Days`}
                />

                <Info
                    icon={
                        leave.rules?.paid
                            ? CheckCircle2
                            : XCircle
                    }
                    title="Leave Type"
                    value={
                        leave.rules?.paid
                            ? "Paid"
                            : "Unpaid"
                    }
                />

            </div>

            {/* Rule Chips */}

            <div className="mt-8 flex flex-wrap gap-3">

                {leave.rules?.carryForward && (
                    <Chip label="Carry Forward" />
                )}

                {leave.rules?.halfDay && (
                    <Chip label="Half Day" />
                )}

                {leave.rules?.approval && (
                    <Chip label="Approval" />
                )}

                {leave.rules?.attachment && (
                    <Chip label="Attachment" />
                )}

                {leave.rules?.negativeBalance && (
                    <Chip label="Negative Balance" />
                )}

            </div>

            {/* Bottom Summary */}

            <div className="mt-8 grid grid-cols-3 gap-4">

                <SmallCard
                    title="Maximum Per Request"
                    value={`${leave.limits?.maxPerRequest || 0} Days`}
                    color="text-blue-600"
                />

                <SmallCard
                    title="Carry Forward"
                    value={`${leave.limits?.maxCarryForward || 0} Days`}
                    color="text-emerald-600"
                />

                <SmallCard
                    title="Gender"
                    value={
                        leave.applicable?.gender
                            ? leave.applicable.gender.charAt(0).toUpperCase() +
                            leave.applicable.gender.slice(1)
                            : "All"
                    }
                    color="text-purple-600"
                />

            </div>

            {/* Actions */}

            <div className="mt-8 flex justify-end gap-3">

                <ActionButton
                    label="View"
                    className="bg-indigo-50 text-indigo-600"
                    onClick={() => onView(leave)}
                >
                    <Eye size={18} />
                </ActionButton>

                <ActionButton
                    label="Edit"
                    className="bg-blue-50 text-blue-600"
                    onClick={() => onEdit(leave)}
                >
                    <Pencil size={18} />
                </ActionButton>

                <ActionButton
                    label="Delete"
                    className="bg-red-50 text-red-600"
                    onClick={() => onDelete(leave)}
                >
                    <Trash2 size={18} />
                </ActionButton>

            </div>

        </div>

    );

}

/* -------------------------------------- */

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

            <h3 className="mt-3 text-lg font-bold text-slate-800">
                {value}
            </h3>

        </div>

    );

}

/* -------------------------------------- */

function SmallCard({
    title,
    value,
    color,
}) {

    return (

        <div className="rounded-2xl border border-slate-200 bg-white p-4">

            <p className="text-xs uppercase tracking-wide text-slate-500">
                {title}
            </p>

            <h2 className={`mt-2 text-lg font-bold ${color}`}>
                {value}
            </h2>

        </div>

    );

}

/* -------------------------------------- */

function Chip({
    label,
}) {

    return (

        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">

            {label}

        </div>

    );

}