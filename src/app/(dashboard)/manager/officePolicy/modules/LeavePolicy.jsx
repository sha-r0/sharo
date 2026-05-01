"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    setDoc,
    doc,
    Timestamp,
} from "firebase/firestore";

export default function LeavePolicy() {

    ////////////////////////////////////////////////////////////
    // STATES
    ////////////////////////////////////////////////////////////

    const [leaveForm, setLeaveForm] = useState({
        code: "",
        name: "",
        type: "Yearly",
        includeWeeklyOff: true,
        includeHoliday: true,
        paid: true,
        carryForward: true,
    });

    const [holidayForm, setHolidayForm] = useState({
        name: "",
        date: "",
    });

    const [leaveTypes, setLeaveTypes] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [employees, setEmployees] = useState([]);

    const [selectedLeave, setSelectedLeave] = useState("CL");

    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [selectedPolicy, setSelectedPolicy] = useState("");
    const [editedBalances, setEditedBalances] = useState({});
    const [companyId, setCompanyId] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("adminUser");

        if (stored) {
            const user = JSON.parse(stored);
            setCompanyId(user.companyDocId);
        }
    }, []);

    const toggleEmployee = (id) => {
        setSelectedEmployees(prev =>
            prev.includes(id)
                ? prev.filter(e => e !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedEmployees.length === employees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(employees.map(e => e.id));
        }
    };

    ////////////////////////////////////////////////////////////
    // FETCH
    ////////////////////////////////////////////////////////////

    useEffect(() => {
        if (!companyId) return;

        fetchAll();
        runMonthlyLeaveUpdate();
    }, [companyId]);

    const fetchAll = async () => {
        if (!companyId) return;

        const leaveSnap = await getDocs(
            collection(db, "Companies", companyId, "LeaveTypes")
        );

        const holidaySnap = await getDocs(
            collection(db, "Companies", companyId, "Holidays")
        );

        const empSnap = await getDocs(
            collection(db, "Companies", companyId, "Usermanagement")
        );

        setLeaveTypes(leaveSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setHolidays(holidaySnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const allUsers = empSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const activeUsers = allUsers.filter(u => u.isActive !== false);

        setEmployees(activeUsers);
    };

    ////////////////////////////////////////////////////////////
    // SAVE LEAVE TYPE
    ////////////////////////////////////////////////////////////

    const saveLeaveType = async () => {
        if (!companyId) {
            alert("Company not found");
            return;
        }

        // ✅ Validation
        if (!leaveForm.code || !leaveForm.name) {
            alert("Code & Name required");
            return;
        }

        if (!leaveForm.total) {
            alert("Enter number of leaves");
            return;
        }

        const code = leaveForm.code.trim().toUpperCase();

        try {
            // 🔥 DUPLICATE CHECK (IMPORTANT)
            const existing = leaveTypes.find(
                (l) => l.code === code
            );

            if (existing) {
                alert("❌ Leave code already exists");
                return;
            }

            ////////////////////////////////////////////

            const payload = {
                code,
                name: leaveForm.name.trim(),
                type: leaveForm.type,
                total: Number(leaveForm.total),

                includeWeeklyOff: leaveForm.includeWeeklyOff,
                includeHoliday: leaveForm.includeHoliday,
                paid: leaveForm.paid,
                carryForward: leaveForm.carryForward,

                createdAt: Timestamp.now(),
            };

            ////////////////////////////////////////////

            await addDoc(
                collection(db, "Companies", companyId, "LeaveTypes"),
                payload
            );

            alert("✅ Leave Type Created");

            ////////////////////////////////////////////

            setLeaveForm({
                code: "",
                name: "",
                type: "Yearly",
                total: "",
                includeWeeklyOff: true,
                includeHoliday: true,
                paid: true,
                carryForward: true,
            });

            fetchAll();

        } catch (err) {
            console.error(err);
            alert("Error saving leave type");
        }
    };

    ////////////////////////////////////////////////////////////
    // ADD HOLIDAY
    ////////////////////////////////////////////////////////////

    const addHoliday = async () => {
        if (!holidayForm.name || !holidayForm.date) {
            return alert("Fill holiday");
        }

        await addDoc(
            collection(db, "Companies", companyId, "Holidays"),
            {
                ...holidayForm,
                createdAt: Timestamp.now(),
            }
        );

        setHolidayForm({ name: "", date: "" });
        fetchAll();
    };

    ////////////////////////////////////////////////////////////
    // UPDATE LEAVE BALANCE
    ////////////////////////////////////////////////////////////

    const updateAllBalances = async () => {
        try {

            const updates = Object.keys(editedBalances).map(empId => {

                const emp = employees.find(e => e.id === empId);

                return updateDoc(doc(db, "Companies", companyId, "Usermanagement", empId), {
                    leaveBalance: {
                        ...(emp?.leaveBalance || {}),
                        ...Object.fromEntries(
                            Object.entries(editedBalances[empId]).map(([k, v]) => [k, Number(v)])
                        )
                    }
                });

            });

            await Promise.all(updates);

            alert("Leave Balances Updated ✅");

            setEditedBalances({});
            fetchAll();

        } catch (err) {
            console.error(err);
            alert("Error updating");
        }
    };
    const assignPolicyBulk = async () => {
        if (!selectedPolicy) return alert("Select policy");
        if (selectedEmployees.length === 0) return alert("Select employees");

        const policy = leaveTypes.find(p => p.code === selectedPolicy);

        if (!policy) return alert("Invalid policy");

        try {

            const updates = selectedEmployees.map(empId => {

                // 🔥 Get existing employee (for merging balance)
                const emp = employees.find(e => e.id === empId);

                return updateDoc(doc(db, "Companies", companyId, "Usermanagement", empId),
                    {

                        ////////////////////////////////////////////
                        // ✅ ASSIGN POLICY
                        ////////////////////////////////////////////
                        leavePolicy: {
                            code: policy.code,
                            name: policy.name,
                            type: policy.type,
                        },

                        ////////////////////////////////////////////
                        // ✅ ASSIGN / UPDATE LEAVE BALANCE
                        ////////////////////////////////////////////
                        leaveBalance: {
                            ...(emp?.leaveBalance || {}),

                            // 🔥 Add / overwrite selected leave
                            [policy.code]: Number(policy.total || 0),
                        }

                    });

            });

            await Promise.all(updates);

            alert("Policy + Leave Assigned ✅");

            setSelectedEmployees([]);
            setSelectedPolicy("");

            fetchAll();

        } catch (err) {
            console.error(err);
            alert("Error assigning policy");
        }
    };

    const handleDelete = async (id) => {
        const confirmDelete = confirm("Delete this leave type?");
        if (!confirmDelete) return;

        try {
            await deleteDoc(doc(db, "Companies", companyId, "LeaveTypes", id));
            alert("Deleted ✅");
            fetchAll();
        } catch (err) {
            console.error(err);
            alert("Error deleting");
        }
    };

    const applyMonthlyLeaves = async () => {
        try {
            const updates = employees.map(async (emp) => {

                let updatedBalance = { ...(emp.leaveBalance || {}) };

                leaveTypes.forEach((l) => {
                    if (l.type === "Monthly") {
                        updatedBalance[l.code] =
                            (updatedBalance[l.code] || 0) + Number(l.total || 0);
                    }
                });

                await updateDoc(doc(db, "Companies", companyId, "Usermanagement", emp.id),
                    {
                        leaveBalance: updatedBalance,
                    });

            });

            await Promise.all(updates);

        } catch (err) {
            console.error("Monthly leave error:", err);
        }
    };

    const runMonthlyLeaveUpdate = async () => {
        try {
            const now = new Date();
            const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
            if (!companyId) return;

            const settingsRef = doc(db, "Companies", companyId, "AppSettings", "leaveConfig");
            const snap = await getDoc(settingsRef);

            const lastKey = snap.exists() ? snap.data().lastLeaveUpdate : null;

            // ✅ Already updated
            if (lastKey === currentKey) return;

            ////////////////////////////////////////////
            // 🔥 APPLY MONTHLY LEAVE
            ////////////////////////////////////////////

            await applyMonthlyLeaves();

            ////////////////////////////////////////////
            // 🔥 SAVE CURRENT MONTH
            ////////////////////////////////////////////

            await updateDoc(settingsRef, {
                lastLeaveUpdate: currentKey,
            }).catch(async () => {
                // if doc not exist → create
                await setDoc(settingsRef, {
                    lastLeaveUpdate: currentKey,
                });
            });

            console.log("Monthly leave applied ✅");

        } catch (err) {
            console.error(err);
        }
    };


    ////////////////////////////////////////////////////////////

    return (
        <div className="min-h-screen space-y-6">

            {/* HEADER */}
            <h2 className="text-xl font-semibold">Leave Management</h2>

            {/* TOP GRID */}
            <div className="grid md:grid-cols-2 gap-6">

                {/* LEAVE TYPE */}
                <Card title="Create Leave Type">

                    <div className="grid grid-cols-2 gap-4">

                        <Input
                            placeholder="Leave Code"
                            label="Code"
                            value={leaveForm.code}
                            onChange={e => setLeaveForm({ ...leaveForm, code: e.target.value })}
                        />

                        <Input
                            placeholder="Leave Name"
                            label="Name"
                            value={leaveForm.name}
                            onChange={e => setLeaveForm({ ...leaveForm, name: e.target.value })}
                        />

                        <Select
                            label="Type"
                            value={leaveForm.type}
                            onChange={e => setLeaveForm({ ...leaveForm, type: e.target.value })}
                        >
                            <option>Yearly</option>
                            <option>Monthly</option>
                        </Select>

                        {/* 🔥 NEW FIELD */}
                        <Input
                            type="number"
                            placeholder="Enter number"
                            label={
                                leaveForm.type === "Monthly"
                                    ? "Leaves per Month"
                                    : "Total Leaves (Yearly)"
                            }
                            value={leaveForm.total || ""}
                            onChange={e =>
                                setLeaveForm({
                                    ...leaveForm,
                                    total: e.target.value
                                })
                            }
                        />

                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">

                        <Check label="Include Weekly Off"
                            checked={leaveForm.includeWeeklyOff}
                            onChange={v => setLeaveForm({ ...leaveForm, includeWeeklyOff: v })}
                        />

                        <Check label="Include Holiday"
                            checked={leaveForm.includeHoliday}
                            onChange={v => setLeaveForm({ ...leaveForm, includeHoliday: v })}
                        />

                        <Check label="Paid Leave"
                            checked={leaveForm.paid}
                            onChange={v => setLeaveForm({ ...leaveForm, paid: v })}
                        />

                        <Check label="Carry Forward"
                            checked={leaveForm.carryForward}
                            onChange={v => setLeaveForm({ ...leaveForm, carryForward: v })}
                        />

                    </div>

                    <button onClick={saveLeaveType} className="btn mt-4 bg-blue-700 text-white px-2 py-1 rounded-lg">Save</button>

                </Card>

                {/* HOLIDAY */}
                <Card title="Holidays">

                    <div className="flex gap-3">
                        <Input placeholder="Holiday Name"
                            value={holidayForm.name}
                            onChange={e => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        />

                        <Input type="date"
                            value={holidayForm.date}
                            onChange={e => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        />

                        <button onClick={addHoliday} className="btn bg-blue-700 text-white px-3 rounded-lg">Add</button>
                    </div>

                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                        {holidays.map(h => (
                            <div key={h.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                                <span>{h.name}</span>
                                <span>{h.date}</span>
                            </div>
                        ))}
                    </div>

                </Card>

            </div>

            {/* LEAVE TYPES TABLE */}
            <Card title="Leave Types">

                <div className="overflow-hidden rounded-xl border border-gray-200">

                    <table className="w-full text-sm">

                        {/* HEADER */}
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Code</th>
                                <th className="text-left px-4 py-3">Name</th>
                                <th className="text-left px-4 py-3">Leaves</th> {/* ✅ NEW */}
                                <th className="text-left px-4 py-3">Weekly Off</th>
                                <th className="text-left px-4 py-3">Holiday</th>
                                <th className="text-left px-4 py-3">Type</th>
                                <th className="text-right px-4 py-3">Action</th> {/* ✅ NEW */}
                            </tr>
                        </thead>

                        {/* BODY */}
                        <tbody className="divide-y">

                            {leaveTypes.map((l) => (
                                <tr
                                    key={l.id}
                                    className="hover:bg-blue-50 transition"
                                >

                                    {/* CODE */}
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {l.code}
                                    </td>

                                    {/* NAME */}
                                    <td className="px-4 py-3 text-gray-700">
                                        {l.name}
                                    </td>

                                    {/* LEAVES COUNT */}
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                                            {l.total || 0}
                                        </span>
                                    </td>

                                    {/* WEEKLY OFF */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${l.includeWeeklyOff
                                            ? "bg-green-100 text-green-600"
                                            : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {l.includeWeeklyOff ? "Yes" : "No"}
                                        </span>
                                    </td>

                                    {/* HOLIDAY */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${l.includeHoliday
                                            ? "bg-green-100 text-green-600"
                                            : "bg-gray-100 text-gray-500"
                                            }`}>
                                            {l.includeHoliday ? "Yes" : "No"}
                                        </span>
                                    </td>

                                    {/* TYPE */}
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${l.type === "Monthly"
                                            ? "bg-purple-100 text-purple-600"
                                            : "bg-blue-100 text-blue-600"
                                            }`}>
                                            {l.type}
                                        </span>
                                    </td>

                                    {/* ACTION */}
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDelete(l.id)}
                                            className="text-red-500 text-xs hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>

                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </Card>

            <Card title="Assign Leave Policy">

                <div className="flex gap-3 mb-4">

                    <select
                        className="input"
                        onChange={(e) => setSelectedPolicy(e.target.value)}
                    >
                        <option>Select Policy</option>
                        {leaveTypes.map(l => (
                            <option key={l.id} value={l.code}>
                                {l.code} - {l.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={assignPolicyBulk}
                        className="bg-blue-600 text-white px-4 rounded-lg"
                    >
                        Assign
                    </button>

                </div>

                {/* SELECT ALL */}
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="checkbox"
                        onChange={selectAll}
                        checked={selectedEmployees.length === employees.length}
                    />
                    <span className="text-sm">Select All</span>
                </div>

                {/* EMPLOYEE LIST */}
                <div className="max-h-60 overflow-y-auto space-y-2">

                    {employees.map(emp => (
                        <div
                            key={emp.id}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedEmployees.includes(emp.id)}
                                    onChange={() => toggleEmployee(emp.id)}
                                />
                                <span>{emp.name}</span>
                            </div>

                            <span className="text-xs text-gray-400">
                                {emp.leavePolicy?.code || "No Policy"}
                            </span>

                        </div>
                    ))}

                </div>

            </Card>

            {/* EMPLOYEE LEAVE */}
            <Card>

                {/* HEADER ROW */}
                <div className="flex items-center justify-between mb-4">

                    <h3 className="text-lg font-semibold text-gray-800">
                        Leave Opening Entry
                    </h3>

                    <button
                        onClick={updateAllBalances}
                        className="bg-green-600 text-white px-4 py-1.5 rounded-lg hover:bg-green-700 transition"
                    >
                        Update
                    </button>

                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200">

                    <table className="w-full text-sm">

                        {/* HEADER */}
                        <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                            <tr>
                                <th className="text-left px-4 py-3">Employee</th>


                                {leaveTypes.map((l) => (
                                    <th key={l.id} className="text-left px-4 py-3">
                                        {l.code}
                                    </th>
                                ))}

                            </tr>
                        </thead>

                        {/* BODY */}
                        <tbody className="divide-y">

                            {employees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50">

                                    {/* EMPLOYEE NAME */}
                                    <td className="px-4 py-3 font-medium text-gray-800">
                                        {emp.name}
                                    </td>

                                    {/* LEAVE BALANCE COLUMNS */}
                                    {leaveTypes.map((l) => (
                                        <td key={l.id} className="px-4 py-2">

                                            <input
                                                type="number"
                                                className="input w-20"
                                                value={
                                                    editedBalances[emp.id]?.[l.code] ??
                                                    emp.leaveBalance?.[l.code] ??
                                                    0
                                                }
                                                onChange={(e) => {
                                                    setEditedBalances(prev => ({
                                                        ...prev,
                                                        [emp.id]: {
                                                            ...(prev[emp.id] || {}),
                                                            [l.code]: e.target.value
                                                        }
                                                    }));
                                                }}
                                            />

                                        </td>
                                    ))}

                                </tr>
                            ))}

                        </tbody>

                    </table>

                </div>

            </Card>

        </div>
    );
}

////////////////////////////////////////////////////////////

function Card({ title, children }) {
    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}

function Input(props) {
    return <input {...props} className="input w-full" />;
}

function Select({ children, ...props }) {
    return <select {...props} className="input w-full">{children}</select>;
}

function Check({ label, checked, onChange }) {
    return (
        <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}