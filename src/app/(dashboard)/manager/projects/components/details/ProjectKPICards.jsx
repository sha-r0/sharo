"use client";

import {
    BadgeIndianRupee,
    Wallet,
    TrendingDown,
    TrendingUp,
    CreditCard,
    Clock3,
    Activity,
    Gauge,
} from "lucide-react";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function KPICard({

    icon: Icon,

    title,

    value,

    color,

}) {

    return (

        <div
            className={`${neoShadow}
            rounded-3xl
            bg-white
            p-6
            transition-all
            hover:-translate-y-1`}
        >

            <div className="flex items-center justify-between">

                <div>

                    <p className="text-sm text-slate-500">

                        {title}

                    </p>

                    <h2 className="mt-2 text-3xl font-bold text-slate-800">

                        {value}

                    </h2>

                </div>

                <div
                    className={`h-14 w-14 rounded-2xl flex items-center justify-center ${color}`}
                >

                    <Icon size={28} />

                </div>

            </div>

        </div>

    );

}

export default function ProjectKPICards({

    project,

}) {

    const poAmount = Number(project.poAmount || 0);

    const budget = Number(project.budget || 0);

    const expense = Number(project.totalExpense || 0);

    const received = Number(project.totalReceived || 0);

    const pending = Number(project.totalPending || 0);

    const profit =
        Number(project.totalProfit || poAmount - expense);

    const health =
        Number(project.healthScore || 100);

    const progress =
        Number(project.progress || 0);

    return (

        <div className="grid grid-cols-4 gap-6">

            <KPICard

                icon={BadgeIndianRupee}

                title="PO Amount"

                value={`₹${poAmount.toLocaleString()}`}

                color="bg-green-100 text-green-600"

            />

            <KPICard

                icon={Wallet}

                title="Budget"

                value={`₹${budget.toLocaleString()}`}

                color="bg-blue-100 text-blue-600"

            />

            <KPICard

                icon={TrendingDown}

                title="Expense"

                value={`₹${expense.toLocaleString()}`}

                color="bg-orange-100 text-orange-600"

            />

            <KPICard

                icon={TrendingUp}

                title="Profit"

                value={`₹${profit.toLocaleString()}`}

                color="bg-emerald-100 text-emerald-600"

            />

            <KPICard

                icon={CreditCard}

                title="Received"

                value={`₹${received.toLocaleString()}`}

                color="bg-cyan-100 text-cyan-600"

            />

            <KPICard

                icon={Clock3}

                title="Pending"

                value={`₹${pending.toLocaleString()}`}

                color="bg-red-100 text-red-600"

            />

            <KPICard

                icon={Activity}

                title="Health Score"

                value={`${health}%`}

                color="bg-violet-100 text-violet-600"

            />

            <KPICard

                icon={Gauge}

                title="Progress"

                value={`${progress}%`}

                color="bg-indigo-100 text-indigo-600"

            />

        </div>

    );

}