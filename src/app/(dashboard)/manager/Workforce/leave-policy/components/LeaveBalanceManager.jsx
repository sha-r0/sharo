"use client";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

import LeavePolicyService from "../services/LeaveTypeService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveBalanceManager({

    companyId,

    employees,

    leaveTypes,

    onSaved,

}) {

    const [balances, setBalances] =
        useState({});

    const [loading, setLoading] =
        useState(false);

    ///////////////////////////////////////////////////////

    useEffect(() => {

        const obj = {};

        employees.forEach((emp) => {

            obj[emp.id] = {};

            leaveTypes.forEach((leave) => {

                obj[emp.id][leave.code] =

                    emp.leaveBalance?.[
                        leave.code
                    ]?.balance ?? 0;

            });

        });

        setBalances(obj);

    }, [employees, leaveTypes]);

    ///////////////////////////////////////////////////////

    function updateValue(

        empId,

        code,

        value

    ) {

        setBalances((prev) => ({

            ...prev,

            [empId]: {

                ...prev[empId],

                [code]: value,

            },

        }));

    }

    ///////////////////////////////////////////////////////

    async function handleUpdate(employee) {

        try {

            await LeavePolicyService.updateEmployeeBalance(

                companyId,

                employee.id,

                employee,

                balances[employee.id]

            );

            alert("Updated");

            onSaved?.();

        } catch (e) {

            console.error(e);

            alert(e.message);

        }

    }

    ///////////////////////////////////////////////////////

    return (

        <div className="space-y-6">

            {/* Header */}

            <div
                className={`${neo} flex items-center justify-between rounded-3xl bg-[#F9FAFC] p-7`}
            >

                <div>

                    <h2 className="text-3xl font-bold text-slate-800">

                        Employee Leave Balance

                    </h2>

                    <p className="mt-2 text-slate-500">

                        View and update employee leave balance.

                    </p>

                </div>

            </div>

            {/* Employee List */}

            {employees.length === 0 ? (

                <div
                    className={`${neo} rounded-3xl bg-white py-20 text-center text-slate-500`}
                >

                    No Employees Found

                </div>

            ) : (

                employees.map((emp) => (

                    <div
                        key={emp.id}
                        className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
                    >

                        {/* Employee Header */}

                        <div className="flex items-center justify-between">

                            <div className="flex items-center gap-5">

                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100">

                                    <User
                                        size={26}
                                        className="text-indigo-600"
                                    />

                                </div>

                                <div>

                                    <h3 className="text-xl font-bold text-slate-800">

                                        {emp.personalInfo?.fullName}

                                    </h3>

                                    <p className="mt-1 text-slate-500">

                                        Employee ID :
                                        {" "}
                                        {emp.employeeId || emp.login?.employeeId}

                                    </p>

                                    <p className="text-slate-500">

                                        {emp.employment?.department}

                                    </p>

                                </div>

                            </div>

                            <div className="rounded-2xl bg-blue-100 px-5 py-2 font-semibold text-blue-700">

                                {Object.keys(
                                    emp.leavePolicies || {}
                                ).length}

                                {" "}
                                Leave Types

                            </div>

                        </div>

                        {/* Leave Balance Grid */}

                        <div className="mt-8 grid grid-cols-4 gap-5">

                            {leaveTypes.map((leave) => {

                                const assigned =
                                    emp.leavePolicies?.[
                                    leave.code
                                    ];

                                return (

                                    <div
                                        key={leave.code}
                                        className="rounded-2xl border border-slate-200 bg-white p-5"
                                    >

                                        <div className="flex items-center justify-between">

                                            <h4 className="text-lg font-bold text-slate-800">

                                                {leave.code}

                                            </h4>

                                            {assigned ? (

                                                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">

                                                    Assigned

                                                </span>

                                            ) : (

                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">

                                                    Not Assigned

                                                </span>

                                            )}

                                        </div>

                                        <p className="mt-2 text-sm text-slate-500">

                                            {leave.name}

                                        </p>

                                        <input

                                            type="number"

                                            min={0}

                                            disabled={!assigned}

                                            value={
                                                balances[emp.id]?.[
                                                leave.code
                                                ] ?? 0
                                            }

                                            onChange={(e) =>
                                                updateValue(
                                                    emp.id,
                                                    leave.code,
                                                    Number(e.target.value)
                                                )
                                            }

                                            className={`mt-5 h-12 w-full rounded-xl border text-center text-xl font-bold outline-none transition ${assigned
                                                    ? "border-indigo-200 bg-white focus:border-indigo-500"
                                                    : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                                }`}

                                        />

                                    </div>

                                );

                            })}

                        </div>

                        {/* Footer */}

                        <div className="mt-8 flex justify-end">

                            <button

                                onClick={() =>
                                    handleUpdate(emp)
                                }

                                disabled={loading}

                                className={`${neo} rounded-2xl bg-green-600 px-8 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50`}

                            >

                                {loading
                                    ? "Saving..."
                                    : "Save Changes"}

                            </button>

                        </div>

                    </div>

                ))

            )}

        </div>

    );

}