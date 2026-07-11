"use client";

import {
    Pencil,
    CheckCircle,
    XCircle,
    Receipt,
} from "lucide-react";

import ActionButton from "./ActionButton";
import ExpenseStatusBadge from "./ExpenseStatusBadge";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ExpenseRow({
    expense,
    onEdit,
    onApprove,
    onReject,
    onViewBill,
}) {
    return (
        <div
            className={`${neo} grid grid-cols-8 items-center rounded-3xl bg-[#F9FAFC] px-6 py-5 hover:-translate-y-1 transition-all`}
        >

            <div>
                <div className="font-semibold">
                    {expense.employeeName}
                </div>
                <div className="text-xs text-gray-500">
                    {expense.employeeId}
                </div>
            </div>

            <div>{expense.projectName}</div>

            <div>{expense.category}</div>

            <div className="truncate">
                {expense.description}
            </div>

            <div className="font-bold text-blue-600">
                ₹{Number(expense.amount || 0).toLocaleString()}
            </div>

            <div>{expense.date}</div>

            <div>
                <ExpenseStatusBadge status={expense.status} />
            </div>

            <div className="flex justify-center gap-2">

            <ActionButton
                        label={
                            expense.billUrl?.trim()
                                ? "View Bill"
                                : "No Bill Uploaded"
                        }
                        className={
                            expense.billUrl?.trim()
                                ? "bg-slate-50 text-slate-700"
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }
                        onClick={() => {

                            if (!expense.billUrl?.trim()) return;

                            onViewBill(expense);

                        }}
                    >
                        <Receipt size={17} />
                    </ActionButton>

                <ActionButton
                    label="Edit"
                    className="bg-blue-50 text-blue-600"
                    onClick={() => onEdit(expense)}
                >
                    <Pencil size={16} />
                </ActionButton>

                {expense.status === "pending" && (
                    <>
                        <ActionButton
                            label="Approve"
                            className="bg-green-50 text-green-600"
                            onClick={() => onApprove(expense)}
                        >
                            <CheckCircle size={18} />
                        </ActionButton>

                        <ActionButton
                            label="Reject"
                            className="bg-red-50 text-red-600"
                            onClick={() => onReject(expense)}
                        >
                            <XCircle size={18} />
                        </ActionButton>
                    </>
                )}

            </div>

        </div>
    );
}