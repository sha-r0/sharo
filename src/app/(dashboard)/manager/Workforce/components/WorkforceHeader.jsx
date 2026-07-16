"use client";

import { useRouter } from "next/navigation";
import {
    UsersRound,
    CalendarClock,
    ClipboardList,
    UserPlus,
    ScanFace,
    MapPinned,
    FileBarChart2,
    Banknote as BanknoteIndianRupee,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function WorkforceHeader() {
    const router = useRouter();

    const actions = [
        {
            label: "Payroll",
            icon: BanknoteIndianRupee,
            href: "/manager/Workforce/payroll",
            bg: "bg-blue-50",
            color: "text-blue-600",
        },
        {
            label: "Shift Policy",
            icon: CalendarClock,
            href: "/manager/Workforce/shift-policy",
            bg: "bg-indigo-50",
            color: "text-indigo-600",
        },
        {
            label: "Leave Policy",
            icon: ClipboardList,
            href: "/manager/Workforce/leave-policy",
            bg: "bg-emerald-50",
            color: "text-emerald-600",
        },
        // {
        //     label: "Employee",
        //     icon: UserPlus,
        //     href: "/dashboard/employees",
        //     bg: "bg-blue-50",
        //     color: "text-blue-600",
        // },
        {
            label: "Attendance",
            icon: ScanFace,
            href: "/manager/Workforce/attendance",
            bg: "bg-orange-50",
            color: "text-orange-600",
        },
        {
            label: "GPS Approval",
            icon: MapPinned,
            href: "/manager/Workforce/gps-approval",
            bg: "bg-cyan-50",
            color: "text-cyan-600",
        },
        // {
        //     label: "Reports",
        //     icon: FileBarChart2,
        //     href: "/dashboard/workforce/reports",
        //     bg: "bg-pink-50",
        //     color: "text-pink-600",
        // },
    ];

    return (
        <div className="flex items-center justify-between">

            {/* Left */}

            <div className="flex items-center gap-5">

                <div
                    className={`${neo} flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white`}
                >
                    <UsersRound size={24} />
                </div>

                <h1 className="text-3xl font-bold text-slate-800">
                    Workforce Management
                </h1>

            </div>

            {/* Right */}

            <div className="flex items-center gap-2">

                {actions.map(({ label, icon: Icon, href, bg, color }) => (
                    <button
                        key={label}
                        onClick={() => router.push(href)}
                        className={`${neo} flex h-12 gap-2 items-center rounded-2xl ${bg} px-4 transition-all duration-300 hover:scale-[1.03]`}
                    >
                        <div className="flex h-10 shrink-0 items-center justify-center">
                            <Icon size={21} className={color} strokeWidth={1.5} />
                        </div>

                        <span className={` text-sm font-semibold ${color}`}>
                            {label}
                        </span>
                    </button>
                ))}

            </div>

        </div>
    );
}
