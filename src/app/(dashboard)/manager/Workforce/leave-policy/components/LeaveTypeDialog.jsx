"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import StepBasic from "./steps/StepBasic";
import StepRules from "./steps/StepRules";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveTypeDialog({
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
            alert("Please enter Leave Name.");
            return false;
        }

        if (!form.code.trim()) {
            alert("Please enter Leave Code.");
            return false;
        }

        return true;
    }

    function nextStep() {

        if (step === 1 && !validateStepOne()) {
            return;
        }

        setStep(2);

    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-8">

            <div
                className={`${neo} w-full max-w-6xl rounded-3xl bg-[#F9FAFC]`}
            >

                {/* Header */}

                <div className="flex items-center justify-between border-b px-8 py-6">

                    <div>

                        <h2 className="text-3xl font-bold text-slate-800">

                            {editMode
                                ? "Edit Leave Type"
                                : "Create Leave Type"}

                        </h2>

                        <p className="mt-2 text-sm text-slate-500">

                            Configure leave type, rules and allocation.

                        </p>

                    </div>

                    <button

                        onClick={onClose}

                        className="rounded-xl p-2 hover:bg-slate-100"

                    >

                        <X size={22} />

                    </button>

                </div>



                {/* Step Bar */}

                <div className="border-b bg-white px-8 py-5">

                    <div className="flex items-center">

                        <StepItem
                            number={1}
                            title="Basic"
                            active={step === 1}
                            complete={step > 1}
                        />

                        <div className="mx-5 h-[2px] flex-1 bg-slate-200" />

                        <StepItem
                            number={2}
                            title="Rules & Limits"
                            active={step === 2}
                            complete={false}
                        />

                    </div>

                </div>



                {/* Body */}

                <div className="max-h-[70vh] overflow-y-auto p-8">

                    {step === 1 && (

                        <StepBasic
                            form={form}
                            setForm={setForm}
                        />

                    )}

                    {step === 2 && (

                        <StepRules
                            form={form}
                            setForm={setForm}
                        />

                    )}

                </div>

                {/* Footer */}

                <div className="flex items-center justify-between border-t px-8 py-5">

                    <button
                        onClick={() => {

                            if (step === 1) {
                                onClose();
                            } else {
                                setStep(1);
                            }

                        }}
                        className="rounded-xl border border-slate-300 px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
                    >
                        {step === 1 ? "Cancel" : "Previous"}
                    </button>

                    {step === 1 ? (

                        <button
                            onClick={nextStep}
                            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
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

                            disabled={saving}

                            className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {saving
                                ? "Saving..."
                                : editMode
                                    ? "Update Leave Type"
                                    : "Create Leave Type"}

                        </button>

                    )}

                </div>

            </div>

        </div>

    );

}

/* ====================================================== */

function StepItem({

    number,

    title,

    active,

    complete,

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