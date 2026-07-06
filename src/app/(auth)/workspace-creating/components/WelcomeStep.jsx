"use client";

import {
    ArrowRight,
    Building2,
    BriefcaseBusiness,
    Clock3,
    Wallet,
    CalendarCheck2,
    Sparkles,
} from "lucide-react";

export default function WelcomeStep({ onNext, currentUser }) {
    const items = [
        {
            icon: Building2,
            title: "Company Profile",
            description: "Logo, industry and company information",
        },
        {
            icon: Clock3,
            title: "Working Hours",
            description: "Office timings, shifts & weekly offs",
        },
    ];

    const neoShadow = "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#eef4ff] via-white to-[#eef4ff]">

            {/* Background Glow */}

            <div className="absolute -top-40 -left-40 h-[420px] w-[420px] rounded-full bg-blue-400/20 blur-3xl" />

            <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-indigo-400/20 blur-3xl" />

            <div className="absolute left-1/2 top-0 h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative flex min-h-screen items-center justify-center px-8">

                <div className="w-full max-w-6xl">

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

                        {/* LEFT */}

                        <div>

                            <div className={`inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md ${neoShadow}`} >

                                <Sparkles className="h-4 w-4 text-indigo-600" />

                                <span className="text-sm font-medium text-slate-600">
                                    Workspace Setup
                                </span>

                            </div>

                            <h1 className="mt-8 text-6xl font-black leading-tight text-slate-900">

                                Welcome

                                <span className="block bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">

                                    {currentUser?.name || "to SHARO"}

                                </span>

                            </h1>

                            <p className="mt-8 max-w-xl text-xl leading-9 text-slate-600">

                                Let's configure your digital workspace.

                                This one-time setup takes around

                                <span className="font-bold text-indigo-600">
                                    {" "}1 minutes
                                </span>

                                {" "}and you'll be ready to manage your business.

                            </p>

                            <div className="mt-10 flex items-center gap-5">

                                <button
                                    onClick={onNext}
                                    className={`group flex h-16 items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-8 text-lg font-semibold text-white shadow-xl transition-all duration-300 hover:scale-[1.03] ${neoShadow}`}
                                >
                                    Start Setup

                                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                                </button>

                                <div>

                                    <p className="text-sm text-slate-500">
                                        Estimated Time
                                    </p>

                                    <p className="text-lg font-bold text-slate-900">
                                        1 Minutes
                                    </p>

                                </div>

                            </div>

                        </div>

                        {/* RIGHT */}

                        <div>

                            <div className={`rounded-[34px] border border-white/60 bg-white/70 p-8 shadow-2xl backdrop-blur-xl ${neoShadow}`}>

                                <div className="mb-8 flex items-center justify-between">

                                    <div>

                                        <h2 className="text-2xl font-bold text-slate-900">
                                            What we'll configure
                                        </h2>

                                        <p className="mt-2 text-slate-500">
                                            Everything needed to start using SHARO.
                                        </p>

                                    </div>

                                    <div className="rounded-2xl bg-indigo-50 p-4">

                                        <Sparkles className="h-7 w-7 text-indigo-600" />

                                    </div>

                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                                    {items.map((item, index) => {

                                        const Icon = item.icon;

                                        return (

                                            <div
                                                key={index}
                                                className={`group rounded-3xl border border-slate-100 bg-white p-6 transition-all duration-300 hover:-translate-y-2 hover:border-indigo-200 hover:shadow-2xl ${neoShadow}`}
                                            >

                                                <div className="flex flex-col h-full">

                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-cyan-50 flex items-center justify-center">

                                                        <Icon className="h-7 w-7 text-indigo-600" />

                                                    </div>

                                                    <h3 className="mt-6 text-lg font-semibold text-slate-900">
                                                        {item.title}
                                                    </h3>

                                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                                        {item.description}
                                                    </p>

                                                </div>

                                            </div>

                                        );

                                    })}

                                </div>

                                <div className={`mt-10 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white ${neoShadow}`}>

                                    <h3 className="text-lg font-bold">
                                        You're almost ready 🚀
                                    </h3>

                                    <p className="mt-2 text-sm text-indigo-100">

                                        After completing setup your workspace
                                        will be fully configured with payroll,
                                        leave management, attendance,
                                        company settings and more.

                                    </p>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}