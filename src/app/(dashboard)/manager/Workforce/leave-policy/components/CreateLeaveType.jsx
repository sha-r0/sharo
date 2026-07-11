"use client";

import { useState } from "react";
import LeavePolicyService from "../services/LeaveTypeService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const defaultForm = {
    code: "",
    name: "",
    type: "Yearly",
    total: "",

    includeWeeklyOff: true,
    includeHoliday: true,
    paid: true,
    carryForward: true,
};

export default function CreateLeaveType({
    companyId,
    onSaved,
}) {
    const [loading, setLoading] =
        useState(false);

    const [form, setForm] =
        useState(defaultForm);

    ////////////////////////////////////////////////////////

    async function handleSave() {
        try {
            if (!form.code.trim()) {
                alert("Enter Leave Code");
                return;
            }

            if (!form.name.trim()) {
                alert("Enter Leave Name");
                return;
            }

            if (!form.total) {
                alert("Enter Leave Count");
                return;
            }

            setLoading(true);

            await LeavePolicyService.saveLeaveType(
                companyId,
                form
            );

            alert("Leave Type Created");

            setForm(defaultForm);

            onSaved?.();

        } catch (e) {
            console.error(e);
            alert(e.message);
        } finally {
            setLoading(false);
        }
    }

    ////////////////////////////////////////////////////////

    return (
        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >
            <div className="mb-6">

                <h2 className="text-2xl font-bold text-slate-800">

                    Create Leave Type

                </h2>

                <p className="mt-1 text-slate-500">

                    Configure company leave policy.

                </p>

            </div>

            <div className="grid grid-cols-2 gap-5">

                <InputField
                    label="Leave Code"
                    placeholder="CL"
                    value={form.code}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            code: e.target.value,
                        })
                    }
                />

                <InputField
                    label="Leave Name"
                    placeholder="Casual Leave"
                    value={form.name}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            name: e.target.value,
                        })
                    }
                />

                <SelectField
                    label="Leave Type"
                    value={form.type}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            type: e.target.value,
                        })
                    }
                >
                    <option>
                        Yearly
                    </option>

                    <option>
                        Monthly
                    </option>
                </SelectField>

                <InputField
                    type="number"
                    label={
                        form.type === "Monthly"
                            ? "Leaves Per Month"
                            : "Total Leave"
                    }
                    placeholder="12"
                    value={form.total}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            total: e.target.value,
                        })
                    }
                />

            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <CheckField
                    label="Include Weekly Off"
                    checked={form.includeWeeklyOff}
                    onChange={(value) =>
                        setForm({
                            ...form,
                            includeWeeklyOff: value,
                        })
                    }
                />

                <CheckField
                    label="Include Holiday"
                    checked={form.includeHoliday}
                    onChange={(value) =>
                        setForm({
                            ...form,
                            includeHoliday: value,
                        })
                    }
                />

                <CheckField
                    label="Paid Leave"
                    checked={form.paid}
                    onChange={(value) =>
                        setForm({
                            ...form,
                            paid: value,
                        })
                    }
                />

                <CheckField
                    label="Carry Forward"
                    checked={form.carryForward}
                    onChange={(value) =>
                        setForm({
                            ...form,
                            carryForward: value,
                        })
                    }
                />

            </div>

            <div className="mt-8 flex justify-end">

                <button
                    onClick={handleSave}
                    disabled={loading}
                    className={`${neo} rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50`}
                >
                    {loading ? "Saving..." : "Save Leave Type"}
                </button>

            </div>

        </div>
    );
}

/* ====================================================== */

function InputField({
    label,
    ...props
}) {
    return (
        <div>

            <label className="mb-2 block text-sm font-medium text-slate-600">
                {label}
            </label>

            <input
                {...props}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
            />

        </div>
    );
}

/* ====================================================== */

function SelectField({
    label,
    children,
    ...props
}) {
    return (
        <div>

            <label className="mb-2 block text-sm font-medium text-slate-600">
                {label}
            </label>

            <select
                {...props}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-indigo-500"
            >
                {children}
            </select>

        </div>
    );
}

/* ====================================================== */

function CheckField({
    label,
    checked,
    onChange,
}) {
    return (
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50 cursor-pointer">

            <input
                type="checkbox"
                checked={checked}
                onChange={(e) =>
                    onChange(e.target.checked)
                }
                className="h-5 w-5 rounded accent-indigo-600"
            />

            <span className="font-medium text-slate-700">
                {label}
            </span>

        </label>
    );
}