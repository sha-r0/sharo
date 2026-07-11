"use client";

import { Pencil } from "lucide-react";

export default function ProjectFilters({

    projects = [],

    status,
    setStatus,

    client,
    setClient,

    financialYear,
    setFinancialYear,

    clients = [],

    onEdit,

}) {

    const neoShadow =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    const tabs = [

        {
            key: "all",
            label: "All",
            count: projects.length,
        },

        {
            key: "pending",
            label: "Pending",
            count: projects.filter(
                p => p.status === "Pending"
            ).length,
        },

        {
            key: "running",
            label: "Running",
            count: projects.filter(
                p => p.status === "Running"
            ).length,
        },

        {
            key: "completed",
            label: "Completed",
            count: projects.filter(
                p => p.status === "Completed"
            ).length,
        },

        {
            key: "hold",
            label: "On Hold",
            count: projects.filter(
                p =>
                    p.status === "Hold" ||
                    p.status === "On Hold"
            ).length,
        },

        {
            key: "loss",
            label: "Loss",
            count: projects.filter(
                p => Number(p.totalProfit || 0) < 0
            ).length,
        },

    ];

    return (

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">

            {/* Status */}

            <div className="flex flex-wrap items-center gap-3">

                {tabs.map((tab) => {

                    const active = status === tab.key;

                    return (

                        <button

                            key={tab.key}

                            onClick={() => setStatus(tab.key)}

                            className={`${neoShadow}
                                h-11
                                rounded-2xl
                                px-5
                                flex
                                items-center
                                gap-2
                                transition-all
                                hover:-translate-y-0.5

                                ${
                                    active

                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"

                                        : "bg-[#F9FAFC] text-slate-700 hover:text-blue-600"

                                }`}

                        >

                            <span className="font-semibold">

                                {tab.label}

                            </span>

                            <span

                                className={`rounded-full px-2 py-0.5 text-xs font-semibold

                                ${

                                    active

                                        ? "bg-white/20"

                                        : "bg-slate-100 text-slate-500"

                                }`}

                            >

                                {tab.count}

                            </span>

                        </button>

                    );

                })}

            </div>

            {/* Right Side */}

            <div className="flex items-center gap-3">

                {/* Client */}

                <select

                    value={client}

                    onChange={(e) =>

                        setClient(e.target.value)

                    }

                    className={`${neoShadow}
                    h-11
                    rounded-2xl
                    bg-[#F9FAFC]
                    px-4
                    outline-none`}

                >

                    <option value="">

                        All Clients

                    </option>

                    {

                        clients.map((client) => (

                            <option

                                key={client.id}

                                value={client.id}

                            >

                                {client.clientName}

                            </option>

                        ))

                    }

                </select>

                {/* Financial Year */}

                <select

                    value={financialYear}

                    onChange={(e) =>

                        setFinancialYear(

                            e.target.value

                        )

                    }

                    className={`${neoShadow}
                    h-11
                    rounded-2xl
                    bg-[#F9FAFC]
                    px-4
                    outline-none`}

                >

                    <option value="">

                        Financial Year

                    </option>

                    <option value="2026-27">

                        2026-27

                    </option>

                    <option value="2025-26">

                        2025-26

                    </option>

                    <option value="2024-25">

                        2024-25

                    </option>

                </select>

                {/* Edit */}

                <button

                    onClick={onEdit}

                    className={`${neoShadow}
                    h-11
                    rounded-2xl
                    bg-[#F9FAFC]
                    px-5
                    flex
                    items-center
                    gap-2
                    font-semibold
                    hover:-translate-y-0.5
                    transition-all`}

                >

                    <Pencil size={16} />

                    Edit

                </button>

            </div>

        </div>

    );

}