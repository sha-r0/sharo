"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import StepBasic from "./step/StepBasic";
import StepAttendance from "./step/StepAttendance";
import StepGpsPayroll from "./step/StepGpsPayroll";

export default function ShiftDialog({ open, onClose, form, setForm, onSave, mode = "create", shift }) {
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const readOnly = mode === "view";

    useEffect(() => {
        if (!open) return undefined;
        setStep(1);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [open, mode, shift?.id]);

    if (!open) return null;

    function validateStepOne() {
        if (!form.name.trim()) { alert("Please enter Shift Name"); return false; }
        if (!form.startTime) { alert("Please select Start Time"); return false; }
        if (!form.endTime) { alert("Please select End Time"); return false; }
        return true;
    }

    function validateStepTwo() {
        if (!form.minimumWorkingHours) { alert("Please enter Minimum Working Hours"); return false; }
        return true;
    }

    function nextStep() {
        if (!readOnly && step === 1 && !validateStepOne()) return;
        if (!readOnly && step === 2 && !validateStepTwo()) return;
        setStep((previous) => previous + 1);
    }

    async function save() {
        setSaving(true);
        try { await onSave(); } finally { setSaving(false); }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-5">
            <div role="dialog" aria-modal="true" aria-labelledby="shift-policy-dialog-title" className="flex max-h-[94vh] w-full max-w-[1160px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-[#F9FAFC] shadow-2xl shadow-slate-950/20 sm:max-h-[88vh]">
                <header className="flex shrink-0 items-start justify-between gap-5 border-b border-slate-200 bg-white px-4 py-4 sm:px-7 sm:py-5">
                    <div>
                        <h2 id="shift-policy-dialog-title" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                            {readOnly ? "View Shift Policy" : mode === "edit" ? "Edit Shift Policy" : "Create Shift Policy"}
                        </h2>
                        <p className="mt-1 text-sm leading-5 text-slate-500">Configure working hours, attendance, GPS and payroll rules.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close shift policy form" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200">
                        <X size={20} />
                    </button>
                </header>

                <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3.5 sm:px-7 sm:py-4">
                    <div className="flex items-center justify-between">
                        <StepItem active={step === 1} complete={step > 1} number={1} title="Basic" />
                        <div className={`mx-2 h-px min-w-3 flex-1 sm:mx-5 ${step > 1 ? "bg-indigo-200" : "bg-slate-200"}`} />
                        <StepItem active={step === 2} complete={step > 2} number={2} title="Attendance" />
                        <div className={`mx-2 h-px min-w-3 flex-1 sm:mx-5 ${step > 2 ? "bg-indigo-200" : "bg-slate-200"}`} />
                        <StepItem active={step === 3} complete={false} number={3} title="GPS & Payroll" />
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-7 sm:py-6">
                    {step === 1 && <StepBasic form={form} setForm={setForm} readOnly={readOnly} />}
                    {step === 2 && <StepAttendance form={form} setForm={setForm} readOnly={readOnly} />}
                    {step === 3 && <StepGpsPayroll form={form} setForm={setForm} readOnly={readOnly} />}
                </div>

                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3.5 sm:px-7 sm:py-4">
                    <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">{readOnly ? "Close" : "Cancel"}</button>
                    <div className="flex items-center gap-2.5">
                        {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-200">Back</button>}
                        {step < 3 ? (
                            <button type="button" onClick={nextStep} className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2">Next</button>
                        ) : !readOnly ? (
                            <button type="button" disabled={saving} onClick={save} className="h-11 rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                                {saving ? "Saving..." : mode === "edit" ? "Update Shift" : "Create Shift"}
                            </button>
                        ) : null}
                    </div>
                </footer>
            </div>
        </div>
    );
}

function StepItem({ active, complete, number, title }) {
    return (
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold sm:h-10 sm:w-10 ${active ? "bg-indigo-600 text-white" : complete ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                {complete ? <Check size={17} strokeWidth={2.5} /> : number}
            </div>
            <span className={`truncate text-xs font-semibold sm:text-sm ${active ? "text-indigo-700" : "text-slate-500"}`}>{title}</span>
        </div>
    );
}
