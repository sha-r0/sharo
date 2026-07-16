"use client";

import {
    Building2,
    Landmark,
    FileText,
    PenTool,
    Check,
} from "lucide-react";

const steps = [

    {
        id: 1,
        title: "Branding",
        icon: Building2,
    },

    {
        id: 2,
        title: "Bank",
        icon: Landmark,
    },

    {
        id: 3,
        title: "Terms",
        icon: FileText,
    },

    {
        id: 4,
        title: "Signature",
        icon: PenTool,
    },

];

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function Stepper({

    step,

}) {

    return (

        <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-8`}>

            <div className="flex items-center justify-between">

                {steps.map((item, index) => {

                    const Icon = item.icon;

                    const active =
                        step === item.id;

                    const completed =
                        step > item.id;

                    return (

                        <div

                            key={item.id}

                            className="flex flex-1 items-center"

                        >

                            <div className="flex flex-col items-center">

                                <div

                                    className={`flex h-14 w-14 items-center justify-center rounded-full transition-all

                                    ${completed

                                            ? "bg-green-500 text-white"

                                            : active

                                                ? "bg-indigo-600 text-white"

                                                : "bg-white border border-slate-300 text-slate-500"

                                        }`}

                                >

                                    {

                                        completed

                                            ?

                                            <Check size={24} />

                                            :

                                            <Icon size={22} />

                                    }

                                </div>

                                <p

                                    className={`mt-3 text-sm font-medium

                                    ${active

                                            ? "text-indigo-600"

                                            : "text-slate-500"

                                        }`}

                                >

                                    {item.title}

                                </p>

                            </div>

                            {

                                index < steps.length - 1 &&

                                <div

                                    className={`mx-3 h-1 flex-1 rounded-full

                                    ${step > item.id

                                            ? "bg-green-500"

                                            : "bg-slate-200"

                                        }`}

                                />

                            }

                        </div>

                    );

                })}

            </div>

        </div>

    );

}