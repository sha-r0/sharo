"use client";

import {
    MapPin,
    CheckCircle2,
    XCircle,
    Users,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GPSSummaryCards({

    summary = {},

}) {

    const cards = [

        {

            title: "Total GPS Punches",

            value: summary.totalPunches || 0,

            icon: MapPin,

            color: "from-indigo-500 to-blue-600",

        },

        {

            title: "GPS Valid",

            value: summary.gpsValid || 0,

            icon: CheckCircle2,

            color: "from-emerald-500 to-green-600",

        },

        {

            title: "GPS Invalid",

            value: summary.gpsInvalid || 0,

            icon: XCircle,

            color: "from-red-500 to-rose-600",

        },

        {

            title: "Employees",

            value: summary.employees || 0,

            icon: Users,

            color: "from-orange-500 to-amber-600",

        },

    ];

    return (

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

            {cards.map((card) => {

                const Icon = card.icon;

                return (

                    <div

                        key={card.title}

                        className={`${neo} rounded-3xl bg-[#F9FAFC] p-6 transition hover:-translate-y-1 hover:shadow-xl`}

                    >

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-sm font-medium text-slate-500">

                                    {card.title}

                                </p>

                                <h2 className="mt-3 text-4xl font-bold text-slate-800">

                                    {card.value}

                                </h2>

                            </div>

                            <div

                                className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${card.color} text-white`}

                            >

                                <Icon size={30} />

                            </div>

                        </div>

                    </div>

                );

            })}

        </div>

    );

}