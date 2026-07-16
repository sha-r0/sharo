"use client";

import {
    FileText,
    FileEdit,
    Send,
    CheckCircle2,
    XCircle,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function SummaryCards({

    summary,

}) {

    const cards = [

        {

            title: "Total Quotations",

            value: summary.total,

            icon: FileText,

            color: "text-indigo-600",

            bg: "bg-indigo-100",

        },

        {

            title: "Draft",

            value: summary.draft,

            icon: FileEdit,

            color: "text-slate-700",

            bg: "bg-slate-100",

        },

        {

            title: "Sent",

            value: summary.sent,

            icon: Send,

            color: "text-blue-600",

            bg: "bg-blue-100",

        },

        {

            title: "Approved",

            value: summary.approved,

            icon: CheckCircle2,

            color: "text-green-600",

            bg: "bg-green-100",

        },

        {

            title: "Rejected",

            value: summary.rejected,

            icon: XCircle,

            color: "text-red-600",

            bg: "bg-red-100",

        },

    ];

    return (

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">

            {

                cards.map((card) => {

                    const Icon = card.icon;

                    return (

                        <div

                            key={card.title}

                            className={`${neo} rounded-3xl bg-white p-6 transition hover:-translate-y-1`}

                        >

                            <div className="flex items-center justify-between">

                                <div>

                                    <p className="text-sm text-slate-500">

                                        {card.title}

                                    </p>

                                    <h2 className="mt-3 text-4xl font-bold">

                                        {card.value}

                                    </h2>

                                </div>

                                <div

                                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.bg}`}

                                >

                                    <Icon

                                        size={28}

                                        className={card.color}

                                    />

                                </div>

                            </div>

                        </div>

                    );

                })

            }

        </div>

    );

}