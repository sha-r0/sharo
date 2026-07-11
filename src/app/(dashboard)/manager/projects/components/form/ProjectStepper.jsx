"use client";

import {
    Check,
    FolderKanban,
    Users,
    ClipboardCheck,
} from "lucide-react";

const steps = [

    {
        id: 1,
        title: "Project Info",
        icon: FolderKanban,
    },

    {
        id: 2,
        title: "Employees",
        icon: Users,
    },

    {
        id: 3,
        title: "Review",
        icon: ClipboardCheck,
    },

];

export default function ProjectStepper({

    currentStep,

}) {

    return (

        <div className="flex items-center justify-center mb-4">

            {steps.map((step, index) => {

                const active = currentStep === step.id;

                const completed = currentStep > step.id;

                const Icon = step.icon;

                return (

                    <div
                        key={step.id}
                        className="flex items-center"
                    >

                        {/* Circle */}

                        <div className="flex flex-col items-center">

                            <div
                                className={`
                                relative
                                flex
                                h-12
                                w-12
                                items-center
                                justify-center
                                rounded-2xl
                                transition-all
                                duration-300

                                ${
                                    completed
                                        ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg"
                                        : active
                                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl scale-105"
                                        : "bg-white text-slate-400 border border-slate-200"
                                }
                            `}
                            >

                                {completed ? (

                                    <Check size={22} />

                                ) : (

                                    <Icon size={22} />

                                )}

                            </div>

                            <span
                                className={`
                                mt-3
                                text-sm
                                font-semibold
                                whitespace-nowrap

                                ${
                                    active
                                        ? "text-blue-600"
                                        : completed
                                        ? "text-green-600"
                                        : "text-slate-500"
                                }
                            `}
                            >

                                {step.title}

                            </span>

                        </div>

                        {/* Line */}

                        {index !== steps.length - 1 && (

                            <div className="mx-6 mb-8">

                                <div
                                    className={`
                                    h-1
                                    w-36
                                    rounded-full
                                    transition-all

                                    ${
                                        currentStep > step.id
                                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                            : "bg-slate-200"
                                    }
                                `}
                                />

                            </div>

                        )}

                    </div>

                );

            })}

        </div>

    );

}