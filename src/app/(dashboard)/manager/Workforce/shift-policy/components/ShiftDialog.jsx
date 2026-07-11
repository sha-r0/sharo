"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

import StepBasic from "./step/StepBasic";
import StepAttendance from "./step/StepAttendance";
import StepGpsPayroll from "./step/StepGpsPayroll";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ShiftDialog({
    open,
    onClose,
    form,
    setForm,
    onSave,
    editMode,
}) {

    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setStep(1);
        }
    }, [open]);

    if (!open) return null;

    function validateStepOne() {

        if (!form.name.trim()) {
            alert("Please enter Shift Name");
            return false;
        }

        if (!form.startTime) {
            alert("Please select Start Time");
            return false;
        }

        if (!form.endTime) {
            alert("Please select End Time");
            return false;
        }

        return true;
    }

    function validateStepTwo() {

        if (!form.minimumWorkingHours) {
            alert("Please enter Minimum Working Hours");
            return false;
        }

        return true;
    }

    function nextStep() {

        if (step === 1 && !validateStepOne()) {
            return;
        }

        if (step === 2 && !validateStepTwo()) {
            return;
        }

        setStep((prev) => prev + 1);

    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">

            <div
                className={`${neo} w-full max-w-7xl rounded-3xl bg-[#F9FAFC]`}
            >

                {/* HEADER */}

                <div className="flex items-center justify-between border-b px-8 py-6">

                    <div>

                        <h2 className="text-3xl font-bold text-slate-800">

                            {editMode
                                ? "Edit Shift Policy"
                                : "Create Shift Policy"}

                        </h2>

                        <p className="mt-1 text-sm text-slate-500">

                            Configure working hours, attendance, GPS and payroll rules.

                        </p>

                    </div>

                    <button

                        onClick={onClose}

                        className="rounded-xl p-2 hover:bg-slate-100"

                    >

                        <X />

                    </button>

                </div>



                {/* STEP BAR */}

                <div className="border-b bg-white px-8 py-5">

                    <div className="flex items-center justify-between">

                        <StepItem
                            active={step === 1}
                            complete={step > 1}
                            number={1}
                            title="Basic"
                        />

                        <div className="h-[2px] flex-1 bg-slate-200 mx-5" />

                        <StepItem
                            active={step === 2}
                            complete={step > 2}
                            number={2}
                            title="Attendance"
                        />

                        <div className="h-[2px] flex-1 bg-slate-200 mx-5" />

                        <StepItem
                            active={step === 3}
                            complete={false}
                            number={3}
                            title="GPS & Payroll"
                        />

                    </div>

                </div>



                {/* BODY */}

                <div className="max-h-[72vh] overflow-y-auto p-8">

                    {step === 1 && (

                        <StepBasic
                            form={form}
                            setForm={setForm}
                        />

                    )}

                    {step === 2 && (

                        <StepAttendance
                            form={form}
                            setForm={setForm}
                        />

                    )}

                    {step === 3 && (

                        <StepGpsPayroll
                            form={form}
                            setForm={setForm}
                        />

                    )}

                </div>



                {/* FOOTER */}

                <div className="flex items-center justify-between border-t px-8 py-5">

                    <button

                        onClick={() =>

                            step === 1
                                ? onClose()
                                : setStep(step - 1)

                        }

                        className="rounded-xl border px-6 py-3 font-medium"

                    >

                        {step === 1
                            ? "Cancel"
                            : "Previous"}

                    </button>

                    {step < 3 ? (

                        <button

                            onClick={nextStep}

                            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white"

                        >

                            Next

                        </button>

                    ) : (

                        <button

                            onClick={async () => {

                                setSaving(true);

                                try {

                                    await onSave();

                                } finally {

                                    setSaving(false);

                                }

                            }}

                            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white"

                        >

                            {saving
                                ? "Saving..."
                                : editMode
                                    ? "Update Shift"
                                    : "Create Shift"}

                        </button>

                    )}

                </div>

            </div>

        </div>

    );

}

function StepItem({

    active,

    complete,

    number,

    title,

}) {

    return (

        <div className="flex items-center gap-3">

            <div
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold
  
          ${active

                        ? "bg-indigo-600 text-white"

                        : complete

                            ? "bg-green-600 text-white"

                            : "bg-slate-200 text-slate-600"

                    }`}
            >

                {complete ? "✓" : number}

            </div>

            <div>

                <p
                    className={`font-semibold
  
            ${active
                            ? "text-indigo-600"
                            : "text-slate-500"
                        }`}
                >

                    {title}

                </p>

            </div>

        </div>

    );

}