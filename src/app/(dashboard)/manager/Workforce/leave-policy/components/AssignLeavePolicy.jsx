"use client";

import { useState } from "react";
import { Users } from "lucide-react";

import LeavePolicyService from "../services/LeaveTypeService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AssignLeavePolicy({

    companyId,

    employees,

    leaveTypes,

    onSaved,

}) {

    const [selectedPolicy, setSelectedPolicy] =
        useState("");

    const [selectedEmployees, setSelectedEmployees] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    ///////////////////////////////////////////////////////

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

    ///////////////////////////////////////////////////////

    function toggleAll() {

        if (
            selectedEmployees.length ===
            employees.length
        ) {

            setSelectedEmployees([]);

        } else {

            setSelectedEmployees(

                employees.map((e) => e.id)

            );

        }

    }

    ///////////////////////////////////////////////////////

    async function handleAssign() {

        try {

            if (!selectedPolicy) {

                alert("Select Leave Policy");

                return;

            }

            if (
                selectedEmployees.length === 0
            ) {

                alert("Select Employees");

                return;

            }

            setLoading(true);

            await LeavePolicyService.assignPolicyBulk(

                companyId,

                employees,

                leaveTypes,

                selectedEmployees,

                selectedPolicy

            );

            alert(
                "Leave Policy Assigned"
            );

            setSelectedEmployees([]);

            setSelectedPolicy("");

            onSaved?.();

        } catch (e) {

            console.error(e);

            alert(e.message);

        } finally {

            setLoading(false);

        }

    }

    ///////////////////////////////////////////////////////

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7`}
        >

            <div className="mb-6">

                <h2 className="text-2xl font-bold text-slate-800">

                    Assign Leave Policy

                </h2>

                <p className="mt-1 text-slate-500">

                    Assign leave policy to employees.

                </p>

            </div>

            {/* Policy */}

            <div className="grid grid-cols-2 gap-6">

                <div>

                    <label className="mb-2 block text-sm font-medium text-slate-600">

                        Leave Policy

                    </label>

                    <select

                        value={selectedPolicy}

                        onChange={(e) =>
                            setSelectedPolicy(
                                e.target.value
                            )
                        }

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="">

                            Select Leave Policy

                        </option>

                        {leaveTypes.map((leave) => (

                            <option
                                key={leave.id}
                                value={leave.code}
                            >

                                {leave.name}

                            </option>

                        ))}

                    </select>

                </div>

            </div>

            {/* Employee */}

            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">

                <div className="flex items-center justify-between bg-[#EEF4FF] px-6 py-4">

                    <label className="flex items-center gap-3">

                        <input

                            type="checkbox"

                            checked={
                                employees.length > 0 &&
                                selectedEmployees.length ===
                                employees.length
                            }

                            onChange={toggleAll}

                        />

                        <span className="font-semibold">

                            Select All Employees

                        </span>

                    </label>

                    <div className="font-semibold text-indigo-700">

                        {selectedEmployees.length}
                        {" "}
                        Selected

                    </div>

                </div>

                <div className="max-h-[350px] overflow-y-auto">

                    {employees.map((emp) => (

                        <label

                            key={emp.id}

                            className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4 hover:bg-slate-50"

                        >

                            <div className="flex items-center gap-4">

                                <input

                                    type="checkbox"

                                    checked={selectedEmployees.includes(
                                        emp.id
                                    )}

                                    onChange={() =>
                                        toggleEmployee(emp.id)
                                    }

                                />

                                <Users
                                    size={18}
                                    className="text-slate-500"
                                />

                                <div>

                                    <h3 className="font-semibold">

                                        {emp.personalInfo?.fullName}

                                    </h3>

                                    <p className="text-sm text-slate-500">

                                        {emp.employeeId || emp.login?.employeeId}

                                    </p>

                                </div>

                            </div>

                            <div className="flex items-center gap-4">

                                <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">

                                    {emp.employment?.department}

                                </span>

                                <div className="flex flex-wrap gap-2">

                                    {emp.leavePolicies &&
                                        Object.keys(emp.leavePolicies).length > 0 ? (

                                        Object.values(emp.leavePolicies).map(
                                            (policy) => (

                                                <span
                                                    key={policy.code}
                                                    className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700"
                                                >
                                                    {policy.code}
                                                </span>

                                            )
                                        )

                                    ) : (

                                        <span className="rounded-full bg-orange-100 px-4 py-2 text-sm font-semibold text-orange-700">

                                            No Leave Assigned

                                        </span>

                                    )}

                                </div>

                            </div>

                        </label>

                    ))}

                    {employees.length === 0 && (

                        <div className="py-16 text-center text-slate-500">

                            No Employees Found

                        </div>

                    )}

                </div>

            </div>

            {/* Footer */}

            <div className="mt-8 flex justify-end">

                <button

                    onClick={handleAssign}

                    disabled={loading}

                    className={`${neo} rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50`}

                >

                    {loading

                        ? "Assigning..."

                        : "Assign Leave Policy"}

                </button>

            </div>

        </div>

    );

}