"use client";

import { useState } from "react";

import {
    LayoutDashboard,
    Users,
    Briefcase,
    Receipt,
    CreditCard,
    FileText,
    History,
    Brain,
} from "lucide-react";

import OverviewTab from "./tabs/OverviewTab";
import EmployeeTab from "./tabs/EmployeeTab";
import WorkTab from "./tabs/WorkTab";
import ExpenseTab from "./tabs/ExpenseTab";
import BillingTab from "./tabs/BillingTab";
import DocumentTab from "./tabs/DocumentTab";
import ActivityTab from "./tabs/ActivityTab";
import AITab from "./tabs/AITab";


const tabs = [

    {
        id: "overview",
        label: "Overview",
        icon: LayoutDashboard,
    },

    {
        id: "employees",
        label: "Employees",
        icon: Users,
    },

    {
        id: "work",
        label: "Work",
        icon: Briefcase,
    },

    {
        id: "expenses",
        label: "Expenses",
        icon: Receipt,
    },

    {
        id: "billing",
        label: "Billing",
        icon: CreditCard,
    },

    {
        id: "documents",
        label: "Documents",
        icon: FileText,
    },

    {
        id: "activity",
        label: "Activity",
        icon: History,
    },

    {
        id: "ai",
        label: "AI",
        icon: Brain,
    },

];

const neoShadow =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ProjectTabs({

    project,

}) {

    const [active, setActive] = useState("overview");

    function renderTab() {

        switch (active) {

            case "overview":

                return (

                    <OverviewTab

                        project={project}

                    />

                );

            case "employees":

                return (

                    <EmployeeTab

                        project={project}

                    />

                );

            case "work":

                return (

                    <WorkTab

                        project={project}

                    />

                );

            case "expenses":

                return (

                    <ExpenseTab

                        project={project}

                    />

                );

            case "billing":

                return (

                    <BillingTab

                        project={project}

                    />

                );

            case "documents":

                return (

                    <DocumentTab

                        project={project}

                    />

                );

            case "activity":

                return (

                    <ActivityTab

                        project={project}

                    />

                );

            case "ai":

                return (

                    <AITab

                        project={project}

                    />

                );

            default:

                return null;

        }

    }

    return (

        <div className="space-y-6">

            {/* Tabs */}

            <div
                className={`${neoShadow}
                rounded-3xl
                bg-white
                p-3
                flex
                flex-wrap
                gap-3`}
            >

                {

                    tabs.map((tab) => {

                        const Icon = tab.icon;

                        const selected =

                            active === tab.id;

                        return (

                            <button

                                key={tab.id}

                                onClick={() =>

                                    setActive(tab.id)

                                }

                                className={`
                                flex
                                items-center
                                gap-2
                                rounded-2xl
                                px-5
                                py-3
                                font-semibold
                                transition-all

                                ${selected

                                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"

                                        : "hover:bg-slate-100 text-slate-600"

                                    }

                            `}

                            >

                                <Icon size={18} />

                                {tab.label}

                            </button>

                        );

                    })

                }

            </div>

            {/* Tab Body */}

            <div>

                {

                    renderTab()

                }

            </div>

        </div>

    );

}