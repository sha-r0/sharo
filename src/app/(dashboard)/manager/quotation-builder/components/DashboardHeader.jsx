"use client";

import { Plus } from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function DashboardHeader({

    onNew,

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

                <button

                    onClick={onNew}

                    className="inline-flex items-center gap-3 rounded-2xl bg-indigo-600 px-7 py-4 text-white font-semibold transition hover:bg-indigo-700"

                >

                    <Plus size={20} />

                    New Quotation

                </button>

            </div>

        </div>

    );

}