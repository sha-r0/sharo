"use client";

import {
    Brain,
    Activity,
    AlertTriangle,
    TrendingUp,
    BadgeIndianRupee,
    Lightbulb,
    Sparkles,
} from "lucide-react";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Card({ icon: Icon, title, value, color }) {
    return (
        <div className={`${neoShadow} rounded-3xl bg-white p-6`}>

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-sm text-slate-500">
                        {title}
                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-slate-800">
                        {value}
                    </h2>

                </div>

                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${color}`}>

                    <Icon size={28} />

                </div>

            </div>

        </div>
    );
}

export default function AITab({ project }) {

    return (

        <div className="space-y-6">

            <div className="grid grid-cols-5 gap-6">

                <Card
                    icon={Activity}
                    title="Health Score"
                    value={`${project.healthScore || 100}%`}
                    color="bg-green-100 text-green-600"
                />

                <Card
                    icon={AlertTriangle}
                    title="Risk Level"
                    value="Low"
                    color="bg-yellow-100 text-yellow-600"
                />

                <Card
                    icon={TrendingUp}
                    title="Completion"
                    value="On Track"
                    color="bg-blue-100 text-blue-600"
                />

                <Card
                    icon={BadgeIndianRupee}
                    title="Profit Prediction"
                    value={`₹${Number(project.totalProfit || 0).toLocaleString()}`}
                    color="bg-emerald-100 text-emerald-600"
                />

                <Card
                    icon={Brain}
                    title="AI Confidence"
                    value="96%"
                    color="bg-violet-100 text-violet-600"
                />

            </div>

            <div className={`${neoShadow} rounded-3xl bg-white p-8`}>

                <div className="mb-6 flex items-center gap-3">

                    <Sparkles className="text-violet-600" />

                    <h2 className="text-2xl font-bold">

                        AI Recommendations

                    </h2>

                </div>

                <div className="space-y-4">

                    <div className="rounded-2xl border border-green-200 bg-green-50 p-5">

                        <div className="flex gap-3">

                            <Lightbulb className="text-green-600 mt-1" />

                            <div>

                                <h3 className="font-semibold">

                                    Project Health

                                </h3>

                                <p className="mt-1 text-slate-600">

                                    Project is progressing normally and is currently within budget.

                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

                        <div className="flex gap-3">

                            <TrendingUp className="text-blue-600 mt-1" />

                            <div>

                                <h3 className="font-semibold">

                                    Productivity

                                </h3>

                                <p className="mt-1 text-slate-600">

                                    Continue current staffing. No additional manpower required.

                                </p>

                            </div>

                        </div>

                    </div>

                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">

                        <div className="flex gap-3">

                            <AlertTriangle className="text-yellow-600 mt-1" />

                            <div>

                                <h3 className="font-semibold">

                                    Financial Alert

                                </h3>

                                <p className="mt-1 text-slate-600">

                                    Monitor material expenses to maintain projected profit margin.

                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}