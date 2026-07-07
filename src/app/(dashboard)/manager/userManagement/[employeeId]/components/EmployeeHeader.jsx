"use client";

import { useRouter } from "next/navigation";

import {

    ArrowLeft,

    Mail,

    Phone,

    Building2,

    Briefcase,

    Calendar,

    Edit,

    UserX,

    ShieldCheck,

    BadgeCheck,

    MapPin,

} from "lucide-react";

export default function EmployeeHeader({

    employee,

    onEdit,

    onDeactivate,

}) {

    const router = useRouter();

    const statusStyle = {

        Active: {

            bg: "bg-emerald-100",

            text: "text-emerald-700",

            dot: "bg-emerald-500",

        },

        Leave: {

            bg: "bg-amber-100",

            text: "text-amber-700",

            dot: "bg-amber-500",

        },

        Inactive: {

            bg: "bg-red-100",

            text: "text-red-700",

            dot: "bg-red-500",

        },

    };

    const status =

        statusStyle[employee.status] ||

        statusStyle.Active;

    return (

        <div className="space-y-5">

            {/* =======================================
                    Back
            ======================================= */}

            <button

                onClick={() => router.back()}

                className="
                    flex
                    items-center
                    gap-2
                    text-slate-500
                    hover:text-blue-600
                    transition
                "

            >

                <ArrowLeft size={18} />

                Back to Employees

            </button>

            {/* =======================================
                    Profile Card
            ======================================= */}

            <div
                className="
                    overflow-hidden
                    rounded-[32px]
                    border
                    border-slate-200
                    bg-white
                    shadow-sm
                "
            >

                {/* Top Accent */}

                <div
                    className="
                        h-2
                        bg-gradient-to-r
                        from-blue-600
                        via-indigo-600
                        to-violet-600
                    "
                />

                <div className="p-8">

                    <div className="flex flex-col xl:flex-row justify-between gap-8">

                        {/* LEFT */}

                        <div className="flex gap-6">

                            {/* Avatar */}

                            {employee.photoUrl ? (

                                <img

                                    src={employee.photoUrl}

                                    alt={employee.fullName}

                                    className="
                                        w-28
                                        h-28
                                        rounded-3xl
                                        object-cover
                                        border
                                        border-slate-200
                                        shadow-md
                                    "

                                />

                            ) : (

                                <div
                                    className="
                                        w-28
                                        h-28
                                        rounded-3xl
                                        bg-gradient-to-r
                                        from-blue-600
                                        to-indigo-700
                                        flex
                                        items-center
                                        justify-center
                                        text-white
                                        text-5xl
                                        font-bold
                                    "
                                >

                                    {employee.fullName?.charAt(0)}

                                </div>

                            )}

                            {/* Name */}

                            <div className="flex flex-col justify-center">

                                <div className="flex flex-wrap items-center gap-3">

                                    <h1 className="text-4xl font-bold text-slate-900">

                                        {employee.fullName}

                                    </h1>

                                    <span

                                        className={`
                                            inline-flex
                                            items-center
                                            gap-2
                                            rounded-full
                                            px-4
                                            py-2
                                            text-sm
                                            font-semibold
                                            ${status.bg}
                                            ${status.text}
                                        `}

                                    >

                                        <span

                                            className={`
                                                w-2.5
                                                h-2.5
                                                rounded-full
                                                ${status.dot}
                                            `}

                                        />

                                        {employee.status}

                                    </span>

                                </div>

                                <div className="flex items-center gap-2 mt-3">

                                    <Briefcase
                                        size={18}
                                        className="text-blue-600"
                                    />

                                    <p className="text-lg text-slate-600">

                                        {employee.designation}

                                    </p>

                                </div>

                                <div className="flex flex-wrap gap-6 mt-6 text-sm">

                                    <div>

                                        <p className="text-slate-400">

                                            Employee ID

                                        </p>

                                        <p className="font-semibold">

                                            {employee.employeeId}

                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-slate-400">

                                            Department

                                        </p>

                                        <p className="font-semibold">

                                            {employee.department}

                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-slate-400">

                                            Role

                                        </p>

                                        <p className="font-semibold">

                                            {employee.role}

                                        </p>

                                    </div>

                                    <div>

                                        <p className="text-slate-400">

                                            Joined

                                        </p>

                                        <p className="font-semibold">

                                            {employee.joiningDate}

                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                        {/* RIGHT */}

                        <div className="flex flex-col sm:flex-row xl:flex-col gap-3">

                            <button

                                onClick={onEdit}

                                className="
                                    h-12
                                    px-6
                                    rounded-2xl
                                    bg-blue-600
                                    hover:bg-blue-700
                                    text-white
                                    font-semibold
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                    transition
                                "

                            >

                                <Edit size={18} />

                                Edit Employee

                            </button>

                            {employee.status !== "Inactive" && (

                                <button

                                    onClick={onDeactivate}

                                    className="
                                        h-12
                                        px-6
                                        rounded-2xl
                                        border
                                        border-red-200
                                        text-red-600
                                        hover:bg-red-50
                                        font-semibold
                                        flex
                                        items-center
                                        justify-center
                                        gap-2
                                        transition
                                    "

                                >

                                    <UserX size={18} />

                                    Deactivate

                                </button>

                            )}

                        </div>

                    </div>

                    {/* =======================================
                            Quick Information
                    ======================================= */}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 mt-10">

                        <div
                            className="
        rounded-2xl
        border
        border-slate-200
        p-5
        hover:border-blue-300
        hover:shadow-md
        transition
    "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                w-11
                h-11
                rounded-xl
                bg-blue-50
                flex
                items-center
                justify-center
            "
                                >

                                    <Mail
                                        size={20}
                                        className="text-blue-600"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs uppercase tracking-wide text-slate-400">

                                        Email

                                    </p>

                                    <p className="font-semibold text-slate-800 break-all">

                                        {employee.email}

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div
                            className="
        rounded-2xl
        border
        border-slate-200
        p-5
        hover:border-blue-300
        hover:shadow-md
        transition
    "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                w-11
                h-11
                rounded-xl
                bg-green-50
                flex
                items-center
                justify-center
            "
                                >

                                    <Phone
                                        size={20}
                                        className="text-green-600"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs uppercase tracking-wide text-slate-400">

                                        Phone

                                    </p>

                                    <p className="font-semibold">

                                        {employee.phone}

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div
                            className="
        rounded-2xl
        border
        border-slate-200
        p-5
        hover:border-blue-300
        hover:shadow-md
        transition
    "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                w-11
                h-11
                rounded-xl
                bg-violet-50
                flex
                items-center
                justify-center
            "
                                >

                                    <Building2
                                        size={20}
                                        className="text-violet-600"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs uppercase tracking-wide text-slate-400">

                                        Department

                                    </p>

                                    <p className="font-semibold">

                                        {employee.department}

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div
                            className="
        rounded-2xl
        border
        border-slate-200
        p-5
        hover:border-blue-300
        hover:shadow-md
        transition
    "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                w-11
                h-11
                rounded-xl
                bg-amber-50
                flex
                items-center
                justify-center
            "
                                >

                                    <ShieldCheck
                                        size={20}
                                        className="text-amber-600"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs uppercase tracking-wide text-slate-400">

                                        Role

                                    </p>

                                    <p className="font-semibold">

                                        {employee.role}

                                    </p>

                                </div>

                            </div>

                        </div>

                        <div
                            className="
        rounded-2xl
        border
        border-slate-200
        p-5
        hover:border-blue-300
        hover:shadow-md
        transition
    "
                        >

                            <div className="flex items-center gap-3">

                                <div
                                    className="
                w-11
                h-11
                rounded-xl
                bg-rose-50
                flex
                items-center
                justify-center
            "
                                >

                                    <Calendar
                                        size={20}
                                        className="text-rose-600"
                                    />

                                </div>

                                <div>

                                    <p className="text-xs uppercase tracking-wide text-slate-400">

                                        Joining Date

                                    </p>

                                    <p className="font-semibold">

                                        {employee.joiningDate}

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