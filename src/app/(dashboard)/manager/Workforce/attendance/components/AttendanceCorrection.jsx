"use client";

import { useEffect, useState } from "react";

import {

    User,

    Calendar,

    Clock,

    MapPin,

    Save,

} from "lucide-react";

import AttendanceService from "../services/AttendanceService";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AttendanceCorrection({

    companyId,

    employees,

    onSaved,

}) {

    //////////////////////////////////////////////////////

    const currentMonth = new Date()
        .toISOString()
        .slice(0, 7);

    const [employeeId, setEmployeeId] =
        useState("");

    const [month, setMonth] =
        useState(currentMonth);

    const [rows, setRows] =
        useState([]);

    const [loading, setLoading] =
        useState(false);

    //////////////////////////////////////////////////////

    async function loadAttendance() {

        if (!employeeId) {

            alert("Please select employee.");

            return;

        }

        try {

            setLoading(true);

            const data =
                await AttendanceService.getEmployeeMonthlyAttendance({

                    companyId,

                    employeeId,

                    month,

                });
            console.log("Attendance Data:", data);

            setRows(data);

            if (data.length === 0) {

                alert("No attendance found.");
            
            }

        } catch (e) {

            console.error(e);

            alert(e.message);

        } finally {

            setLoading(false);

        }

    }

    //////////////////////////////////////////////////////

    function updateRow(

        index,

        field,

        value

    ) {

        setRows((prev) => {

            const copy = [...prev];

            copy[index] = {

                ...copy[index],

                [field]: value,

            };

            return copy;

        });

    }

    //////////////////////////////////////////////////////
    async function handleSave() {

        try {

            setLoading(true);

            await AttendanceService.saveMonthlyAttendanceBatch({

                companyId,

                rows,

            });

            alert(

                "Attendance updated successfully."

            );

            onSaved?.();

        }

        catch (e) {

            console.error(e);

            alert(e.message);

        }

        finally {

            setLoading(false);

        }

    }



    return (

        <div className={`${neo} mt-8 rounded-3xl bg-[#F9FAFC] p-8`}>

            {/* Header */}

            <div className="mb-8">

                <h2 className="text-2xl font-bold text-slate-800">

                    Monthly Attendance Correction

                </h2>

                <p className="mt-1 text-slate-500">

                    Load one employee's attendance for an entire month and update everything at once.

                </p>

            </div>

            {/* Filters */}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

                {/* Employee */}

                <div>

                    <label className="mb-2 block font-medium">

                        Employee

                    </label>

                    <select

                        value={employeeId}

                        onChange={(e) =>
                            setEmployeeId(e.target.value)
                        }

                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"

                    >

                        <option value="">

                            Select Employee

                        </option>

                        {employees.map((emp) => (

                            <option

                                key={emp.id}

                                value={emp.id}

                            >

                                {emp.name}

                            </option>

                        ))}

                    </select>

                </div>

                {/* Month */}

                <div>

                    <label className="mb-2 block font-medium">

                        Month

                    </label>

                    <input

                        type="month"

                        value={month}

                        onChange={(e) =>
                            setMonth(e.target.value)
                        }

                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3"

                    />

                </div>

                {/* Button */}

                <div className="flex items-end">

                    <button

                        onClick={loadAttendance}

                        disabled={loading}

                        className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"

                    >

                        {loading

                            ? "Loading..."

                            : "Load Attendance"}

                    </button>

                </div>

            </div>

            {/* Attendance Table */}

            {rows.length > 0 && (

                <div className="mt-8 overflow-x-auto rounded-2xl border">

                    <table className="min-w-full text-sm">

                        <thead className="bg-slate-100">

                            <tr>

                                <th className="px-4 py-3">

                                    Date

                                </th>

                                <th className="px-4 py-3">

                                    Day

                                </th>

                                <th className="px-4 py-3">

                                    Check In

                                </th>

                                <th className="px-4 py-3">

                                    Check Out

                                </th>

                                <th className="px-4 py-3">

                                    Status

                                </th>

                                <th className="px-4 py-3">

                                    Approval

                                </th>

                                <th className="px-4 py-3">

                                    GPS

                                </th>

                                <th className="px-4 py-3">

                                    Remarks

                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {rows.map((row, index) => (

                                <tr

                                    key={row.id || row.date}

                                    className="border-t"

                                >

                                    <td className="px-4 py-3">

                                        {row.date}

                                    </td>

                                    <td className="px-4 py-3">

                                        {new Date(

                                            row.date

                                        ).toLocaleDateString(

                                            "en-US",

                                            {

                                                weekday: "short",

                                            }

                                        )}

                                    </td>

                                    <td className="px-2 py-2">

                                        <input

                                            type="time"

                                            value={row.checkIn || ""}

                                            onChange={(e) =>
                                                updateRow(

                                                    index,

                                                    "checkIn",

                                                    e.target.value

                                                )
                                            }

                                            className="rounded border px-2 py-1"

                                        />

                                    </td>

                                    <td className="px-2 py-2">

                                        <input

                                            type="time"

                                            value={row.checkOut || ""}

                                            onChange={(e) =>
                                                updateRow(

                                                    index,

                                                    "checkOut",

                                                    e.target.value

                                                )
                                            }

                                            className="rounded border px-2 py-1"

                                        />

                                    </td>

                                    {/* Status */}

                                    <td className="px-2 py-2">

                                        <select

                                            value={row.status}

                                            onChange={(e) =>
                                                updateRow(
                                                    index,
                                                    "status",
                                                    e.target.value
                                                )
                                            }

                                            className="rounded-lg border border-slate-200 px-2 py-1"

                                        >

                                            <option value="present">

                                                Present

                                            </option>

                                            <option value="late">

                                                Late

                                            </option>

                                            <option value="halfday">

                                                Half Day

                                            </option>

                                            <option value="leave">

                                                Leave

                                            </option>

                                            <option value="absent">

                                                Absent

                                            </option>

                                            <option value="holiday">

                                                Holiday

                                            </option>

                                            <option value="weeklyoff">

                                                Weekly Off

                                            </option>

                                        </select>

                                    </td>

                                    {/* Approval */}

                                    <td className="px-2 py-2">

                                        <select

                                            value={row.approvalStatus}

                                            onChange={(e) =>
                                                updateRow(
                                                    index,
                                                    "approvalStatus",
                                                    e.target.value
                                                )
                                            }

                                            className="rounded-lg border border-slate-200 px-2 py-1"

                                        >

                                            <option value="approved">

                                                Approved

                                            </option>

                                            <option value="pending">

                                                Pending

                                            </option>

                                            <option value="rejected">

                                                Rejected

                                            </option>

                                        </select>

                                    </td>

                                    {/* GPS */}

                                    <td className="px-4 py-2 text-center">

                                        <input

                                            type="checkbox"

                                            checked={row.gpsValid}

                                            onChange={(e) =>
                                                updateRow(
                                                    index,
                                                    "gpsValid",
                                                    e.target.checked
                                                )
                                            }

                                        />

                                    </td>

                                    {/* Remarks */}

                                    <td className="px-2 py-2">

                                        <input

                                            type="text"

                                            value={row.remarks || ""}

                                            onChange={(e) =>
                                                updateRow(
                                                    index,
                                                    "remarks",
                                                    e.target.value
                                                )
                                            }

                                            placeholder="Remarks"

                                            className="w-52 rounded-lg border border-slate-200 px-3 py-2"

                                        />

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

            )}

            {/* Footer */}

            {rows.length > 0 && (

                <div className="mt-8 flex items-center justify-between rounded-2xl bg-slate-50 p-6">

                    <div>

                        <h3 className="font-semibold text-slate-800">

                            {rows.length} Attendance Records Loaded

                        </h3>

                        <p className="mt-1 text-sm text-slate-500">

                            Edit any attendance record and click
                            <strong> Save All Changes </strong>
                            to update the entire month.

                        </p>

                    </div>

                    <button

                        onClick={handleSave}

                        disabled={loading}

                        className={`${neo} flex items-center gap-3 rounded-2xl bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50`}

                    >

                        <Save size={18} />

                        {loading

                            ? "Saving..."

                            : "Save All Changes"}

                    </button>

                </div>

            )}

        </div>

    );

}

