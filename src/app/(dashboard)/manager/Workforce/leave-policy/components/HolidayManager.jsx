"use client";

import { useState } from "react";

import {
    CalendarPlus,
    Trash2,
} from "lucide-react";

import LeavePolicyService from "../services/LeaveTypeService";
import ActionButton from "../../../expenses/components/ActionButton";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const defaultForm = {
    name: "",
    date: "",
};

export default function HolidayManager({

    companyId,

    holidays,

    onSaved,

}) {

    const [loading, setLoading] =
        useState(false);

    const [form, setForm] =
        useState(defaultForm);

    ///////////////////////////////////////////////////////

    async function handleSave() {

        try {

            if (!form.name.trim()) {
                alert("Enter Holiday Name");
                return;
            }

            if (!form.date) {
                alert("Select Holiday Date");
                return;
            }

            setLoading(true);

            await LeavePolicyService.saveHoliday(

                companyId,

                form

            );

            alert("Holiday Added");

            setForm(defaultForm);

            onSaved?.();

        } catch (e) {

            console.error(e);

            alert(e.message);

        } finally {

            setLoading(false);

        }

    }

    ///////////////////////////////////////////////////////

    async function handleDelete(id) {

        if (
            !confirm("Delete Holiday ?")
        )
            return;

        try {

            await LeavePolicyService.deleteHoliday(

                companyId,

                id

            );

            onSaved?.();

        } catch (e) {

            console.error(e);

        }

    }

    ///////////////////////////////////////////////////////

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >

            <div className="mb-6">

                <h2 className="text-2xl font-bold text-slate-800">

                    Holiday Calendar

                </h2>

                <p className="mt-1 text-slate-500">

                    Define company holidays.

                </p>

            </div>

            <div className="grid grid-cols-[1fr_220px_auto] gap-4">

                <InputField
                    label="Holiday Name"
                    placeholder="Independence Day"
                    value={form.name}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            name: e.target.value,
                        })
                    }
                />

                <InputField
                    type="date"
                    label="Holiday Date"
                    value={form.date}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            date: e.target.value,
                        })
                    }
                />

                <button

                    onClick={handleSave}

                    disabled={loading}

                    className={`${neo} mt-7 flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 font-semibold text-white`}

                >

                    <CalendarPlus size={18} />

                    {loading
                        ? "Saving..."
                        : "Add"}

                </button>

            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">

                <div className="grid grid-cols-[2fr_180px_120px] bg-[#EEF4FF] px-6 py-4 font-semibold text-slate-700">

                    <div>

                        Holiday

                    </div>

                    <div>

                        Date

                    </div>

                    <div className="text-center">

                        Action

                    </div>

                </div>

                {/* Holiday List */}

                {holidays.length === 0 ? (

                    <div className="py-14 text-center text-slate-500">

                        No Holidays Added

                    </div>

                ) : (

                    holidays.map((holiday) => (

                        <div
                            key={holiday.id}
                            className="grid grid-cols-[2fr_180px_120px] items-center border-t border-slate-200 bg-white px-6 py-4 transition hover:bg-slate-50"
                        >

                            {/* Holiday Name */}

                            <div>

                                <h3 className="font-semibold text-slate-800">

                                    {holiday.name}

                                </h3>

                            </div>

                            {/* Date */}

                            <div>

                                <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">

                                    {holiday.date}

                                </span>

                            </div>

                            {/* Action */}

                            <div className="flex justify-center">

                                <ActionButton
                                    label="Delete"
                                    className="bg-red-50 text-red-600"
                                    onClick={() =>
                                        handleDelete(
                                            holiday.id
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

/* ===================================================== */

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