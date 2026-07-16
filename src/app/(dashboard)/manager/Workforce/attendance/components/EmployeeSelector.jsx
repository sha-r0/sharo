"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function EmployeeSelector({

    employees = [],

    selectedEmployees = [],

    setSelectedEmployees,

}) {

    const [search, setSearch] = useState("");

    ////////////////////////////////////////////////////

    const filteredEmployees = useMemo(() => {

        return employees.filter((emp) => {

            const keyword = search.toLowerCase();

            return (

                emp.name?.toLowerCase().includes(keyword) ||

                emp.employeeId?.toLowerCase().includes(keyword) ||

                emp.department?.toLowerCase().includes(keyword)

            );

        });

    }, [employees, search]);

    ////////////////////////////////////////////////////

    function toggleEmployee(id) {

        if (selectedEmployees.includes(id)) {

            setSelectedEmployees(

                selectedEmployees.filter(

                    (x) => x !== id

                )

            );

        } else {

            setSelectedEmployees([

                ...selectedEmployees,

                id,

            ]);

        }

    }

    ////////////////////////////////////////////////////

    function toggleAll() {

        if (

            filteredEmployees.length > 0 &&

            filteredEmployees.every((emp) =>

                selectedEmployees.includes(emp.id)

            )

        ) {

            setSelectedEmployees(

                selectedEmployees.filter(

                    (id) =>

                        !filteredEmployees.some(

                            (emp) => emp.id === id

                        )

                )

            );

        } else {

            const ids = filteredEmployees.map(

                (emp) => emp.id

            );

            setSelectedEmployees([

                ...new Set([

                    ...selectedEmployees,

                    ...ids,

                ]),

            ]);

        }

    }

    ////////////////////////////////////////////////////

    const allSelected =

        filteredEmployees.length > 0 &&

        filteredEmployees.every((emp) =>

            selectedEmployees.includes(emp.id)

        );

    ////////////////////////////////////////////////////

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >

            <div className="mb-6 flex items-center justify-between">

                <div>

                    <h2 className="text-2xl font-bold text-slate-800">

                        Select Employees

                    </h2>

                    <p className="mt-1 text-slate-500">

                        Choose employees for the attendance report.

                    </p>

                </div>

                <div className="rounded-2xl bg-indigo-100 px-5 py-2 font-semibold text-indigo-700">

                    {selectedEmployees.length}

                    {" "}Selected

                </div>

            </div>

            {/* Search */}

            <div className="relative mb-6">

                <Search
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input

                    type="text"

                    placeholder="Search employee..."

                    value={search}

                    onChange={(e) =>
                        setSearch(e.target.value)
                    }

                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-indigo-500"

                />

            </div>

            {/* Select All */}

            <div className="mb-4 flex items-center justify-between rounded-2xl bg-[#EEF4FF] px-5 py-4">

                <label className="flex items-center gap-3">

                    <input

                        type="checkbox"

                        checked={allSelected}

                        onChange={toggleAll}

                    />

                    <span className="font-semibold text-slate-700">

                        Select All

                    </span>

                </label>

                <span className="text-sm text-slate-500">

                    {filteredEmployees.length} Employees

                </span>

            </div>

            {/* Employee List */}

            <div className="max-h-[420px] overflow-y-auto space-y-3">
                {filteredEmployees.map((emp) => {

                    const selected =
                        selectedEmployees.includes(
                            emp.id
                        );

                    return (

                        <label
                            key={emp.id}
                            className={`flex cursor-pointer items-center justify-between rounded-2xl border p-5 transition ${selected
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                                }`}
                        >

                            <div className="flex items-center gap-4">

                                <input
                                    type="checkbox"
                                    checked={selected}
                                    onChange={() =>
                                        toggleEmployee(
                                            emp.id
                                        )
                                    }
                                />

                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100">

                                    <Users
                                        size={22}
                                        className="text-indigo-600"
                                    />

                                </div>

                                <div>

                                    <h3 className="font-semibold text-slate-800">

                                        {emp.name}

                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">

                                        ID : {emp.employeeId}

                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-3">

                                {emp.department && (

                                    <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">

                                        {emp.department}

                                    </span>

                                )}

                                {emp.shift && (

                                    <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">

                                        {emp.shift}

                                    </span>

                                )}

                            </div>

                        </label>

                    );

                })}

                {filteredEmployees.length === 0 && (

                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">

                        <Users
                            size={44}
                            className="mx-auto mb-4 text-slate-300"
                        />

                        <h3 className="text-lg font-semibold text-slate-700">

                            No Employees Found

                        </h3>

                        <p className="mt-2 text-slate-500">

                            Try changing your search keyword.

                        </p>

                    </div>

                )}

            </div>

        </div>

    );

}