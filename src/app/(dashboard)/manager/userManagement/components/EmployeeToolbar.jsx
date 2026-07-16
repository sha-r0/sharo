"use client";

import {
    Search,
    RotateCcw,
    Plus,
} from "lucide-react";

import { useRouter } from "next/navigation";
import PermissionGuard from "@/components/auth/PermissionGuard";

export default function EmployeeToolbar({

    search,
    setSearch,

    department,
    setDepartment,

    role,
    setRole,

    status,
    setStatus,

    departments = [],
    roles = [],

}) {

    const router = useRouter();

    function resetFilters() {

        setSearch("");

        setDepartment("All");

        setRole("All");

        setStatus("All");

    }

    return (

        <div
            className="
                bg-white
                rounded-3xl
                border
                border-slate-200
                shadow-sm
                p-6
            "
        >

            <div className="flex flex-col xl:flex-row gap-4 justify-between">

                {/* LEFT */}

                <div className="flex flex-1 flex-wrap gap-4">

                    {/* Search */}

                    <div
                        className="
                            flex
                            items-center
                            gap-3
                            h-12
                            min-w-[300px]
                            flex-1
                            rounded-xl
                            border
                            border-slate-200
                            px-4
                        "
                    >

                        <Search
                            size={18}
                            className="text-slate-400"
                        />

                        <input

                            value={search}

                            onChange={(e)=>

                                setSearch(e.target.value)

                            }

                            placeholder="Search employee..."

                            className="
                                flex-1
                                outline-none
                                bg-transparent
                            "
                        />

                    </div>

                    {/* Department */}

                    <select

                        value={department}

                        onChange={(e)=>

                            setDepartment(e.target.value)

                        }

                        className="
                            h-12
                            rounded-xl
                            border
                            border-slate-200
                            px-4
                        "

                    >

                        <option value="All">

                            All Departments

                        </option>

                        {departments.map((item)=>(

                            <option

                                key={item}

                                value={item}

                            >

                                {item}

                            </option>

                        ))}

                    </select>

                    {/* Role */}

                    <select

                        value={role}

                        onChange={(e)=>

                            setRole(e.target.value)

                        }

                        className="
                            h-12
                            rounded-xl
                            border
                            border-slate-200
                            px-4
                        "

                    >

                        <option value="All">

                            All Roles

                        </option>

                        {roles.map((item)=>(

                            <option

                                key={item}

                                value={item}

                            >

                                {item}

                            </option>

                        ))}

                    </select>

                    {/* Status */}

                    <select

                        value={status}

                        onChange={(e)=>

                            setStatus(e.target.value)

                        }

                        className="
                            h-12
                            rounded-xl
                            border
                            border-slate-200
                            px-4
                        "

                    >

                        <option>

                            All

                        </option>

                        <option>

                            Active

                        </option>

                        <option>

                            Leave

                        </option>

                        <option>

                            Inactive

                        </option>

                        <option>Suspended</option>

                        <option>Locked</option>

                        <option>Pending</option>

                    </select>

                    {/* Reset */}

                    <button

                        onClick={resetFilters}

                        className="
                            h-12
                            px-5
                            rounded-xl
                            border
                            border-slate-200
                            flex
                            items-center
                            gap-2
                            hover:bg-slate-50
                        "

                    >

                        <RotateCcw size={18}/>

                        Reset

                    </button>

                </div>

                {/* RIGHT */}

                <PermissionGuard permission="employee.create"><button

                    onClick={()=>

                        router.push(

                            "/manager/userManagement/add"

                        )

                    }

                    className="
                        h-12
                        px-6
                        rounded-xl
                        bg-gradient-to-r
                        from-blue-600
                        to-blue-700
                        text-white
                        font-semibold
                        flex
                        items-center
                        justify-center
                        gap-2
                        hover:shadow-lg
                        transition
                    "

                >

                    <Plus size={18}/>

                    Add Employee

                </button></PermissionGuard>

            </div>

        </div>

    );

}
