"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    orderBy,
    limit,
    startAfter,
} from "firebase/firestore";
import ExpenseFilters from "../components/Filter";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const normalizeStatus = (status) => {
    if (!status) return "pending";
    return status.toString().trim().toLowerCase();
};

const getCurrentFY = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

export default function Expenses() {

    const [expenses, setExpenses] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [projects, setProjects] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [employeeMap, setEmployeeMap] = useState({});
    const [categories, setCategories] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);

    const [COMPANY_ID, setCompanyId] = useState(null);

    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const [selectedFY, setSelectedFY] = useState(getCurrentFY());
    const [expenseTab, setExpenseTab] = useState("total");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [nameFilter, setNameFilter] = useState("");
    const [projectFilter, setProjectFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");

    const [totalExpense, setTotalExpense] = useState(0);
    const [totalAdvance, setTotalAdvance] = useState(0);
    const [totalUnapproved, setTotalUnapproved] = useState(0);
    const [remainingAmount, setRemainingAmount] = useState(0);

    const filteredExpenses = expenses.filter((e) => {
        const expDate = e.date ? new Date(e.date) : null;

        if (fromDate && expDate && expDate < new Date(fromDate)) return false;
        if (toDate && expDate && expDate > new Date(toDate)) return false;

        if (nameFilter && e.employee !== nameFilter) return false;
        if (projectFilter && e.project !== projectFilter) return false;
        if (categoryFilter && e.category !== categoryFilter) return false;

        if (expenseTab === "approved" && e.status !== "approved") return false;
        if (expenseTab === "unapproved" && e.status !== "pending") return false;

        return true;
    });

    useEffect(() => {
        let expenseTotal = 0;
        let advanceTotal = 0;
        let unapprovedTotal = 0;

        filteredExpenses.forEach((e) => {
            if (e.status === "approved") {
                expenseTotal += e.amount;
            }

            if (e.status === "pending") {
                unapprovedTotal += e.amount;
            }
        });

        advances.forEach((a) => {
            advanceTotal += a.amount;
        });

        setTotalExpense(expenseTotal);
        setTotalAdvance(advanceTotal);
        setTotalUnapproved(unapprovedTotal);
        setRemainingAmount(advanceTotal - expenseTotal);
    }, [filteredExpenses, advances]);

    const PAGE_SIZE = 20;

    // ✅ SAFE LOCALSTORAGE
    useEffect(() => {
        if (typeof window === "undefined") return;

        const stored = localStorage.getItem("adminUser");
        if (stored) {
            const user = JSON.parse(stored);
            setCompanyId(user.companyDocId);
        }
    }, []);

    // ✅ LOAD META DATA (NO EXPENSE HERE)
    useEffect(() => {
        if (!COMPANY_ID) return;

        async function loadMeta() {

            let projectMap = {};
            let empMap = {};

            const projSnap = await getDocs(collection(db, "Projectmanagement"));
            projSnap.forEach((doc) => {
                projectMap[doc.id] = doc.data().name;
            });
            setProjects(Object.values(projectMap));

            const empSnap = await getDocs(
                collection(db, `Companies/${COMPANY_ID}/Usermanagement`)
            );

            empSnap.forEach((doc) => {
                const data = doc.data();
            
                const key =
                    data.employeeId || doc.id; // 🔥 fallback safety
            
                empMap[key] =
                    data.employeeName || data.name || "Unknown";
            });

            setEmployeeMap(empMap);
            setEmployees(Object.values(empMap));
            setFilteredEmployees(Object.values(empMap));

            const advSnap = await getDocs(
                collection(db, `Companies/${COMPANY_ID}/Advances`)
              );
            let adv = [];
            advSnap.forEach((d) => {
                const data = d.data();
                adv.push({
                    id: d.id,
                    employee: data.employeeName || empMap[data.employeeId] || "Unknown",
                    project: data.projectName || "Unknown",
                    amount: Number(data.amount || 0),
                    date: data.date || "",
                });
            });

            setAdvances(adv);
        }

        loadMeta();
    }, [COMPANY_ID]);

    // ✅ PAGINATION (ONLY SOURCE OF EXPENSES)
    const loadExpenses = async (isLoadMore = false) => {
        if (!COMPANY_ID) return;

        let q = query(
            collection(db, `Companies/${COMPANY_ID}/Expenses`),
            orderBy("createdAt", "desc"),
            limit(PAGE_SIZE)
        );

        if (isLoadMore && lastDoc) {
            q = query(
                collection(db, `Companies/${COMPANY_ID}/Expenses`),
                orderBy("createdAt", "desc"),
                startAfter(lastDoc),
                limit(PAGE_SIZE)
            );
        }

        const snapshot = await getDocs(q);

        const newData = snapshot.docs.map((d) => {
            const data = d.data();

            return {
                id: d.id,
                firestoreUserId: data.employeeId,
                employee: data.employeeName || employeeMap[data.employeeId] || "Unknown",
                project: data.projectName || "Unknown",
                amount: Number(data.amount || 0),
                category: data.category || "General",
                description: data.description || "",
                status: normalizeStatus(data.status),
                date: data.date || "",

                travelFrom: data.travelFrom || "",
                travelTo: data.travelTo || "",
                labourCount: data.labourCount || "",
                labourRate: data.labourRate || "",
                foodItems: data.foodItems || [],
                hotelType: data.hotelType || "",
                locationType: data.locationType || "",
                title: data.title || "",
            };
        });

        if (isLoadMore) {
            setExpenses((prev) => {
                const combined = [...prev, ...newData];
                return Array.from(new Map(combined.map(i => [i.id, i])).values());
            });
        } else {
            setExpenses(newData);
        }

        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        setLastDoc(lastVisible);

        if (snapshot.docs.length < PAGE_SIZE) {
            setHasMore(false);
        }
    };

    // ✅ LOAD FIRST TIME AFTER MAP READY
    useEffect(() => {
        if (!COMPANY_ID || Object.keys(employeeMap).length === 0) return;

        setExpenses([]);
        setLastDoc(null);
        setHasMore(true);

        loadExpenses(false);
    }, [COMPANY_ID, employeeMap]);

    const loadMore = async () => {
        if (!hasMore || loadingMore) return;

        setLoadingMore(true);
        await loadExpenses(true);
        setLoadingMore(false);
    };

    // ✅ APPROVE / REJECT
    const approve = async (userId, expenseId) => {
        await updateDoc(doc(db, `Companies/${COMPANY_ID}/Expenses/${expenseId}`), {
            status: "approved",
        });

        setExpenses((prev) =>
            prev.map((e) =>
                e.id === expenseId ? { ...e, status: "approved" } : e
            )
        );
    };

    const reject = async (userId, expenseId) => {
        await updateDoc(doc(db, `Companies/${COMPANY_ID}/Expenses/${expenseId}`), {
            status: "rejected",
        });

        setExpenses((prev) =>
            prev.map((e) =>
                e.id === expenseId ? { ...e, status: "rejected" } : e
            )
        );
    };

    const exportToExcel = () => {
        const approvedExpenses = expenses.filter(
            (e) => e.status === "approved"
        );

        const ws = XLSX.utils.json_to_sheet(approvedExpenses);
        const wb = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(wb, ws, "Approved Expenses");

        saveAs(
            new Blob([
                XLSX.write(wb, { type: "array", bookType: "xlsx" }),
            ]),
            "ApprovedExpenses.xlsx"
        );
    };

    return (
        <div className="w-full py-2 font-sans min-h-screen text-black ">
            <div className="">

                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                    <h2 className="text-3xl font-bold text-black mb-5">
                        Expense Approvals
                    </h2>

                    <select
                        value={selectedFY}
                        onChange={(e) => setSelectedFY(e.target.value)}
                        className="border p-2 rounded"
                    >
                        <option value="">Select Financial Year</option>
                        <option value="2025-2026">2025-2026</option>
                        <option value="2026-2027">2026-2027</option>
                        <option value="2027-2028">2027-2028</option>
                        <option value="2028-2029">2028-2029</option>
                    </select>
                </div>

                <ExpenseFilters
                    fromDate={fromDate}
                    toDate={toDate}
                    nameFilter={nameFilter}
                    projectFilter={projectFilter}
                    categoryFilter={categoryFilter}
                    setFromDate={setFromDate}
                    setToDate={setToDate}
                    setNameFilter={setNameFilter}
                    setProjectFilter={setProjectFilter}
                    setCategoryFilter={setCategoryFilter}
                    employeeList={filteredEmployees}
                    projectList={projects}
                    categoryList={categories}
                    onExport={exportToExcel}
                />

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mt-6">

                    <div
                        onClick={() => setExpenseTab("total")}
                        className={`bg-[#F8F9FD] shadow p-4 rounded-xl border border-white cursor-pointer 
             ${expenseTab === "total" ? "ring-2 ring-blue-500" : ""}`}
                    >
                        <h4 className="text-sm text-[#6F7195]">Total Expense</h4>
                        <p className="text-2xl font-bold text-[#205BF0]">
                            ₹{(Number(totalExpense) + Number(totalUnapproved)).toFixed(2)}
                        </p>
                    </div>

                    <div
                        onClick={() => setExpenseTab("approved")}
                        className={`bg-[#F8F9FD] shadow p-4 rounded-xl border border-white cursor-pointer 
            ${expenseTab === "approved" ? "ring-2 ring-blue-500" : ""}`}
                    >
                        <h4 className="text-sm text-[#6F7195]">Approved Expense</h4>
                        <p className="text-2xl font-bold text-[#205BF0]">
                            ₹{Number(totalExpense).toFixed(2)}
                        </p>
                    </div>

                    <div
                        onClick={() => setExpenseTab("unapproved")}
                        className={`bg-[#F8F9FD] shadow p-4 rounded-xl border border-white cursor-pointer 
            ${expenseTab === "unapproved" ? "ring-2 ring-blue-500" : ""}`}
                    >
                        <h4 className="text-sm text-[#6F7195]">Unapproved Expense</h4>
                        <p className="text-2xl font-bold text-[#205BF0]">
                            ₹{Number(totalUnapproved).toFixed(2)}</p>
                    </div>

                    <div className="bg-[#F8F9FD] shadow p-4 rounded-xl border border-white">
                        <h4 className="text-sm text-[#6F7195]">Total Advance</h4>
                        <p className="text-2xl font-bold text-yellow-600">
                            ₹{Number(totalAdvance).toFixed(2)}
                        </p>
                    </div>

                    <div className="bg-[#F8F9FD] shadow p-4 rounded-xl border border-white">
                        <h4 className="text-sm text-[#6F7195]">Remaining Amount</h4>
                        <p
                            className={`text-2xl font-bold ${remainingAmount >= 0
                                ? "text-green-400"
                                : "text-red-400"
                                }`}
                        >
                            ₹{Number(remainingAmount).toFixed(2)}
                        </p>
                    </div>
                </div>

                {/* Expenses Table */}
                <div className="overflow-x-auto mt-6">
                    <table className="min-w-full text-sm border-separate border-spacing-y-3">
                        <thead>
                            <tr className="text-xs uppercase text-[#6F7195] text-left">
                                <th className="px-4 py-2">Employee</th>
                                <th className="px-4 py-2">Project</th>
                                <th className="px-4 py-2">Category</th>
                                <th className="px-4 py-2">Details</th>
                                <th className="px-4 py-2">Amount</th>
                                <th className="px-4 py-2">Date</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredExpenses.map((e) => (
                                <tr
                                    key={e.id}
                                    className="bg-[#F8F9FD] border border-white rounded-xl hover:bg-white"
                                >
                                    <td className="px-4 py-3 text-black">{e.employee}</td>
                                    <td className="px-4 py-3 text-gray-700">{e.project}</td>
                                    <td className="px-4 py-3 text-gray-700">{e.category}</td>

                                    {/* Dynamic Details */}
                                    <td className="px-4 py-3 text-gray-700">
                                        <p>{e.description}</p>

                                        <div className="text-[11px] text-gray-500 mt-1 leading-4 space-y-1">
                                            {e.travelFrom && <p><b>From:</b> {e.travelFrom}</p>}
                                            {e.travelTo && <p><b>To:</b> {e.travelTo}</p>}
                                            {e.locationType && <p><b>Location:</b> {e.locationType}</p>}
                                            {e.labourCount && <p><b>Labour Count:</b> {e.labourCount}</p>}
                                            {e.labourRate && <p><b>Labour Rate:</b> {e.labourRate}</p>}
                                            {e.hotelType && <p><b>Hotel:</b> {e.hotelType}</p>}
                                            {e.title && <p><b>Title:</b> {e.title}</p>}
                                            {Array.isArray(e.foodItems) && e.foodItems.length > 0 && (
                                                <p><b>Food Items:</b> {e.foodItems.join(", ")}</p>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 font-semibold text-[#205BF0]">
                                        ₹{Number(e.amount).toFixed(2)}
                                    </td>

                                    <td className="px-4 py-3 text-gray-700">{e.date}</td>

                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-3 py-1 text-xs rounded-full font-medium ${e.status === "approved"
                                                ? "bg-green-200 text-green-900"
                                                : e.status === "rejected"
                                                    ? "bg-red-200 text-red-900"
                                                    : "bg-yellow-200 text-yellow-700"
                                                }`}
                                        >
                                            {e.status}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-right">
                                        {normalizeStatus(e.status) === "pending" && (
                                            <div className="flex gap-2 justify-end">
                                                <button
                                                    onClick={() => approve(e.firestoreUserId, e.id)}
                                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md"
                                                >
                                                    Approve
                                                </button>

                                                <button
                                                    onClick={() => reject(e.firestoreUserId, e.id)}
                                                    className="px-3 py-1 border border-red-500 text-red-400 text-xs rounded-md hover:bg-red-900/30"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>

                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="flex justify-center mt-6">
                        {hasMore && (
                            <button
                                onClick={loadMore}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md"
                            >
                                {loadingMore ? "Loading..." : "Load More"}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );

}
