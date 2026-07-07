"use client";

import { useRouter } from "next/navigation";

import {

    ChevronRight,

    Phone,

    Briefcase,

    Building2,

    BadgeCheck,

} from "lucide-react";

export default function EmployeeCard({

    employee,

}) {

    const router = useRouter();

    const statusColor = {

        Active:
            "bg-green-100 text-green-700",

        Leave:
            "bg-amber-100 text-amber-700",

        Inactive:
            "bg-red-100 text-red-700",

    };

    return (

        <div

            onClick={() =>

                router.push(

                    `/manager/userManagement/${employee.firestoreId}`

                )

            }

            className="
                bg-white
                border
                border-slate-200
                rounded-3xl
                px-6
                py-5
                cursor-pointer
                hover:border-blue-300
                hover:shadow-lg
                transition-all
                duration-300
            "

        >

            <div className="flex items-center justify-between">

                {/* LEFT */}

                <div className="flex items-center gap-5">

                    {/* Avatar */}

                    {employee.photoUrl ? (

                        <img

                            src={employee.photoUrl}

                            alt={employee.fullName}

                            className="
                                w-16
                                h-16
                                rounded-full
                                object-cover
                                border
                                border-slate-200
                            "

                        />

                    ) : (

                        <div
                            className="
                                w-16
                                h-16
                                rounded-full
                                bg-gradient-to-r
                                from-blue-600
                                to-blue-700
                                flex
                                items-center
                                justify-center
                                text-white
                                text-xl
                                font-bold
                            "
                        >

                            {employee.fullName
                                ?.charAt(0)
                                ?.toUpperCase()}

                        </div>

                    )}

                    {/* Name */}

                    <div>

                        <h3 className="text-lg font-bold text-slate-800">

                            {employee.fullName}

                        </h3>

                        <p className="text-sm text-slate-500 mt-1">

                            Employee ID • {employee.employeeId}

                        </p>

                        <div className="flex items-center gap-2 mt-2">

                            <Phone
                                size={14}
                                className="text-slate-400"
                            />

                            <span className="text-sm text-slate-600">

                                {employee.phone}

                            </span>

                        </div>

                    </div>

                </div>

                {/* CENTER */}

                <div className="hidden lg:flex gap-16">

                    <div>

                        <p className="text-xs text-slate-400 uppercase">

                            Department

                        </p>

                        <div className="flex items-center gap-2 mt-2">

                            <Building2
                                size={16}
                                className="text-blue-600"
                            />

                            <span className="font-medium">

                                {employee.department}

                            </span>

                        </div>

                    </div>

                    <div>

                        <p className="text-xs text-slate-400 uppercase">

                            Designation

                        </p>

                        <div className="flex items-center gap-2 mt-2">

                            <Briefcase
                                size={16}
                                className="text-blue-600"
                            />

                            <span className="font-medium">

                                {employee.designation}

                            </span>

                        </div>

                    </div>

                </div>

                {/* RIGHT */}

                <div className="flex items-center gap-5">

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
                            ${statusColor[employee.status]}
                        `}
                    >

                        <BadgeCheck size={16} />

                        {employee.status}

                    </span>

                    <ChevronRight
                        size={22}
                        className="
                            text-slate-400
                            group-hover:text-blue-600
                        "
                    />

                </div>

            </div>

        </div>

    );

}