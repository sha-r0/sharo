"use client";

import {
    ArrowLeft,
    Eye,
    Save,
    FileText,
    FileDown,
    Clock3,
    Send,
    CheckCircle2,
    XCircle,
    AlertTriangle,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function BuilderHeader({

    quotationNumber = "QT-26-27-001",

    status = "Draft",

    saveState = "unsaved",

    onBack,

    onPreview,

    onDraft,

    onPDF,

    onSave,

    saving = false,

    readOnly = false,

}) {

    function getStatus() {

        switch (status) {

            case "Approved":

                return {

                    label: "Approved",

                    color: "bg-green-100 text-green-700",

                    icon: CheckCircle2,

                };

            case "Sent":

                return {

                    label: "Sent",

                    color: "bg-blue-100 text-blue-700",

                    icon: Send,

                };

            case "Rejected":

                return {

                    label: "Rejected",

                    color: "bg-red-100 text-red-700",

                    icon: XCircle,

                };

            case "Expired":

                return {

                    label: "Expired",

                    color: "bg-orange-100 text-orange-700",

                    icon: AlertTriangle,

                };

            default:

                return {

                    label: "Draft",

                    color: "bg-yellow-100 text-yellow-700",

                    icon: Clock3,

                };

        }

    }

    function getSaveState() {

        switch (saveState) {

            case "saving":

                return {

                    label: "Saving...",

                    color: "bg-blue-100 text-blue-700",

                    dot: "bg-blue-500",

                };

            case "saved":

                return {

                    label: "Saved",

                    color: "bg-green-100 text-green-700",

                    dot: "bg-green-500",

                };

            default:

                return {

                    label: "Unsaved Changes",

                    color: "bg-orange-100 text-orange-700",

                    dot: "bg-orange-500",

                };

        }

    }

    const badge = getStatus();

    const StatusIcon = badge.icon;

    const saveBadge = getSaveState();

    return (

        <div
            className={`${neo} sticky top-0 z-40 rounded-3xl border border-slate-200 bg-white/95 p-6 backdrop-blur`}
        >

            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

                {/* LEFT */}

                <div className="flex items-center gap-5">

                    <button

                        onClick={onBack}

                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-300 bg-white transition hover:bg-slate-100"

                    >

                        <ArrowLeft size={22} />

                    </button>

                    <div>

                        <h1 className="text-3xl font-bold">

                            New Quotation

                        </h1>

                        <div className="mt-3 flex flex-wrap items-center gap-3">

                            <span className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold">

                                {quotationNumber}

                            </span>

                            <span
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${badge.color}`}
                            >

                                <StatusIcon size={16} />

                                {badge.label}

                            </span>

                            <span
                                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${saveBadge.color}`}
                            >

                                <span
                                    className={`h-2.5 w-2.5 rounded-full ${saveBadge.dot}`}
                                />

                                {saveBadge.label}

                            </span>

                        </div>

                    </div>

                </div>

                {/* RIGHT */}

                <div className="flex flex-wrap items-center gap-3">

                    <button

                        onClick={onPreview}

                        className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 font-semibold transition hover:bg-slate-100"

                    >

                        <Eye size={18} />

                        Preview

                    </button>

                    {!readOnly && <button

                        onClick={onDraft}

                        className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-100"

                    >

                        <Save size={18} />

                        Save Draft

                    </button>}

                    <button

                        onClick={onPDF}

                        className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3 font-semibold text-green-700 transition hover:bg-green-100"

                    >

                        <FileDown size={18} />

                        Generate PDF

                    </button>

                    {!readOnly && <button

                        disabled={saving}

                        onClick={onSave}

                        className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-7 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"

                    >

                        <FileText size={18} />

                        {saving ? "Saving..." : "Save"}

                    </button>}

                </div>

            </div>

        </div>

    );

}
