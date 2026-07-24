"use client";

import {
    FilePlus2,
    Settings2,
  } from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function DashboardHeader({

    onNew, onEditTemplate,

}) {

    return (

        <div className={`${neo} rounded-3xl bg-white p-8`}>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                <div>

                    <h1 className="text-3xl font-bold tracking-tight">

                        Quotation Dashboard

                    </h1>

                    <p className="mt-2 text-slate-500">

                        Manage quotations, drafts and approvals.

                    </p>

                </div>

                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={onEditTemplate}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                        <Settings2 size={17} />
                        Edit Template
                    </button>

                    <button
                        type="button"
                        onClick={onNew}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        <FilePlus2 size={17} />
                        New Quotation
                    </button>
                </div>

            </div>

        </div>

    );

}