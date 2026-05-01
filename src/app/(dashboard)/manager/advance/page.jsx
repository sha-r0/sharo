"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AddAdvanceModal from "./components/AddAdvanceModal";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import {
    PlusCircle,
    FileMinus2,
    Search,
    Calendar,
    Briefcase,
    RotateCcw,
    MoreHorizontal
} from "lucide-react";

// ⭐ FORMAT DATE (DD-MM-YYYY)
const formatDate = (v) => {
    if (!v) return "";
    const d = new Date(v);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

export default function AdvancePage() {
    const [advances, setAdvances] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [employeeFilter, setEmployeeFilter] = useState("");
    const [query, setQuery] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingData, setEditingData] = useState(null);
    const [companyId, setCompanyId] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("adminUser");

        if (stored) {
            const user = JSON.parse(stored);
            setCompanyId(user.companyDocId);
        }
    }, []);

    useEffect(() => {
        if (!companyId) return;

        const loadEmployees = async () => {
            try {
                const snap = await getDocs(
                    collection(db, "Companies", companyId, "Usermanagement")
                );

                setEmployees(
                    snap.docs.map((d) => ({
                        id: d.id,
                        name: d.data().name,
                    }))
                );
            } catch (err) {
                console.error("Failed to load employees", err);
            }
        };

        loadEmployees();
    }, [companyId]);

    // Fetch advances
    const fetchAdvances = async () => {
        setLoading(true);
        try {
            const snap = await getDocs(
                collection(db, "Companies", companyId, "Advances")
            );
            const list = snap.docs.map((d) => {
                const data = d.data();
                return {
                    id: d.id,
                    projectId: data.projectId || "",
                    projectName: data.projectName || "",
                    employeeId: data.employeeId || "",
                    employeeName: data.employeeName || "",
                    amount: Number(data.amount) || 0,
                    paymentType: data.paymentType || "",
                    description: data.description || "",
                    date: data.date || "", // ⭐ saved from modal
                };
            });

            list.sort((a, b) => new Date(b.date) - new Date(a.date));

            setAdvances(list);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!companyId) return;
        fetchAdvances();
    }, [companyId]);

    const filtered = advances.filter((a) => {
        if (employeeFilter && a.employeeName !== employeeFilter) return false;
        if (fromDate && new Date(a.date) < new Date(fromDate)) return false;
        if (toDate && new Date(a.date) > new Date(toDate)) return false;

        if (query) {
            const q = query.toLowerCase();
            if (
                !(a.employeeName.toLowerCase().includes(q) ||
                    a.projectName.toLowerCase().includes(q) ||
                    (a.description?.toLowerCase() || "").includes(q))
            ) {
                return false;
            }
        }
        return true;
    });

    const totalAmount = filtered.reduce((sum, a) => sum + Number(a.amount), 0);

    const exportToExcel = () => {
        const rows = filtered.map((r) => ({
            Employee: r.employeeName,
            Project: r.projectName,
            Description: r.description,
            Amount: r.amount,
            Payment_Type: r.paymentType,
            Date: formatDate(r.date), // ⭐ format in excel
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Advances");
        const file = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        saveAs(new Blob([file]), `Advances_${formatDate(new Date())}.xlsx`);
    };

    const handleEdit = (advance) => {
        setEditingData(advance);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm("Delete this advance?")) return;
        try {
            await deleteDoc(
                doc(db, "Companies", companyId, "Advances", id)
            );
            fetchAdvances();
        } catch (err) {
            console.error("Delete failed", err);
            alert("Delete failed.");
        }
    };

    return (
        <div className="w-full min-h-screen  text-black p-6">
            <div className="max-w-8xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black">Advances</h1>
                        <p className="text-sm text-black/50">Manage all employee advances</p>
                    </div>

                    <div className="flex items-center gap-3">

                        <button
                            onClick={fetchAdvances}
                            className="hidden sm:flex items-center gap-2 bg-[#F8F9FD] border border-white px-4 py-2 rounded-lg hover:bg-[#fff] transition"
                        >
                            <RotateCcw size={16} /> Refresh
                        </button>

                        <button
                            onClick={exportToExcel}
                            className="hidden sm:flex items-center gap-2 bg-[#F8F9FD] border border-white px-4 py-2 rounded-lg hover:bg-[#fff] transition"
                        >
                            <FileMinus2 size={16} /> Export
                        </button>

                        <button
                            onClick={() => {
                                setEditingData(null);
                                setShowModal(true);
                            }}
                            className="flex items-center gap-2 text-white bg-[#205BF0] hover:bg-blue-500 px-4 py-2 rounded-lg shadow-sm transition"
                        >
                            <PlusCircle size={16} /> Add Advance
                        </button>

                    </div>
                </div>


                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                    <div className="bg-[#F8F9FD] rounded-xl p-5 border border-white shadow">

                        <p className="text-xs text-black/50">
                            Total Amount
                        </p>

                        <h2 className="text-2xl font-semibold text-[#205BF0] mt-2">
                            ₹ {totalAmount}
                        </h2>

                    </div>


                    <div className="bg-[#F8F9FD] rounded-xl p-5 border border-white shadow">

                        <p className="text-xs text-black/50">
                            Employees
                        </p>

                        <h2 className="text-2xl font-semibold mt-2">
                            {employees.length}
                        </h2>

                    </div>


                    <div className="bg-[#F8F9FD] rounded-xl p-5 border border-white shadow">

                        <p className="text-xs text-black/50">
                            Entries
                        </p>

                        <h2 className="text-2xl font-semibold mt-2">
                            {filtered.length}
                        </h2>

                    </div>

                </div>


                {/* Filters */}
                <div className="py-4">

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">


                        {/* Search */}
                        <div className="md:col-span-2 flex items-center gap-2 bg-[#F8F9FD] px-3 py-2 rounded-lg border border-white">

                            <Search size={16} className="text-black/40" />

                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search..."
                                className="bg-transparent outline-none text-sm w-full text-black placeholder:text-black/40"
                            />

                        </div>


                        {/* From Date */}
                        <div className="flex items-center gap-2 bg-[#F8F9FD] px-3 py-2 rounded-lg border border-white">

                            <Calendar size={16} className="text-black/40" />

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent outline-none text-sm text-black"
                            />

                        </div>


                        {/* To Date */}
                        <div className="flex items-center gap-2 bg-[#F8F9FD] px-3 py-2 rounded-lg border border-white">

                            <Calendar size={16} className="text-black/40" />

                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent outline-none text-sm text-black"
                            />

                        </div>


                        {/* Employee Filter */}
                        <select
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            className="bg-[#F8F9FD] border border-white px-3 py-2 rounded-lg text-sm outline-none text-black"
                        >

                            <option value="">
                                All Employees
                            </option>

                            {employees.map((e) => (
                                <option key={e.id} value={e.name}>
                                    {e.name}
                                </option>
                            ))}

                        </select>


                        {/* Total */}
                        <div className="text-right bg-[#F8F9FD] border border-white px-3 py-2 rounded-lg font-bold text-[#205BF0]">

                            ₹ {totalAmount}

                        </div>


                    </div>

                </div>


                {/* Desktop Table */}
                <div className="hidden md:block bg-[#F8F9FD] rounded-2xl shadow border border-white overflow-x-auto">

                    <table className="w-full">

                        <thead className="bg-[#F8F9FD]">

                            <tr>

                                <th className="px-4 py-3 text-left text-xs text-black/50">
                                    Employee
                                </th>

                                <th className="px-4 py-3 text-left text-xs text-black/50">
                                    Description
                                </th>

                                <th className="px-4 py-3 text-right text-xs text-black/50">
                                    Amount
                                </th>

                                <th className="px-4 py-3 text-left text-xs text-black/50">
                                    Payment
                                </th>

                                <th className="px-4 py-3 text-left text-xs text-black/50">
                                    Date
                                </th>

                                <th className="px-4 py-3 text-xs text-black/50">
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>
                                    <td colSpan={7} className="text-center py-6 text-black/40">
                                        Loading...
                                    </td>
                                </tr>

                            ) : filtered.length === 0 ? (

                                <tr>
                                    <td colSpan={7} className="text-center py-6 text-black/40">
                                        No data
                                    </td>
                                </tr>

                            ) : (

                                filtered.map((a) => (

                                    <tr
                                        key={a.id}
                                        className="border-t border-black/5 transition"
                                    >

                                        <td className="px-4 py-3">
                                            {a.employeeName}
                                        </td>

                                        <td className="px-4 py-3 text-black/70">
                                            {a.description}
                                        </td>

                                        <td className="px-4 py-3 text-right font-semibold text-[#205BF0]">
                                            ₹ {a.amount}
                                        </td>

                                        <td className="px-4 py-3 text-black/70">
                                            {a.paymentType}
                                        </td>

                                        <td className="px-4 py-3 text-black/70">
                                            {formatDate(a.date)}
                                        </td>

                                        <td className="px-4 py-3">

                                            <div className="flex gap-2 justify-end">

                                                <button
                                                    onClick={() => handleEdit(a)}
                                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    onClick={() => handleDelete(a.id)}
                                                    className="px-3 py-1 text-xs bg-red-500 text-white rounded"
                                                >
                                                    Delete
                                                </button>

                                                {/* <button className="px-2 py-1 text-xs bg-[#232734] rounded">
                          <MoreHorizontal size={14} />
                        </button> */}

                                            </div>

                                        </td>

                                    </tr>

                                ))

                            )}

                        </tbody>

                    </table>

                </div>


                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">

                    {filtered.map((a) => (

                        <div
                            key={a.id}
                            className="bg-[#161a21] rounded-xl p-4 shadow border border-white/10"
                        >

                            <div className="font-bold text-white">
                                {a.employeeName}
                            </div>

                            <div className="text-white/50 text-xs mt-2">
                                Date: {formatDate(a.date)}
                            </div>

                            <div className="text-white/60 text-xs mt-2">
                                {a.description}
                            </div>

                            <div className="flex justify-between items-center mt-3">

                                <div className="font-semibold text-blue-400 text-lg">
                                    ₹ {a.amount}
                                </div>

                                <div className="flex gap-2">

                                    <button
                                        onClick={() => handleEdit(a)}
                                        className="px-3 py-1 text-xs bg-blue-900/40 text-blue-400 rounded"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() => handleDelete(a.id)}
                                        className="px-3 py-1 text-xs bg-red-900/40 text-red-400 rounded"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>

                        </div>

                    ))}

                </div>


                {/* Modal */}
                {showModal && (
                    <AddAdvanceModal
                        employees={employees}
                        projects={projects}
                        existing={editingData}
                        onClose={() => {
                            setEditingData(null);
                            setShowModal(false);
                            fetchAdvances();
                        }}
                    />
                )}

            </div>
        </div>

    );
}
