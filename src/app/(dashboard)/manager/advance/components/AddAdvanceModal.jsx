"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { X } from "lucide-react";

export default function AddAdvanceModal({ projects = [], employees = [], existing = null, onClose }) {
    const [projectId, setProjectId] = useState(projects[0]?.id || "");
    const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [paymentType, setPaymentType] = useState("Cash");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [submitting, setSubmitting] = useState(false);
    const [category, setCategory] = useState("Personal Advance");

    const [companyId, setCompanyId] = useState(null);

    useEffect(() => {
        const stored = localStorage.getItem("adminUser");

        if (stored) {
            const user = JSON.parse(stored);
            setCompanyId(user.companyDocId);
        }
    }, []);

    useEffect(() => {
        if (!projectId && projects.length) setProjectId(projects[0].id);
    }, [projects]);

    useEffect(() => {
        if (!employeeId && employees.length) setEmployeeId(employees[0].id);
    }, [employees]);

    // Load existing when editing
    useEffect(() => {
        if (existing) {
            setProjectId(existing.projectId || "");
            setEmployeeId(existing.employeeId || "");
            setAmount(
                existing.amount
                    ? String(existing.amount)
                    : existing.amount != null
                        ? String(existing.amount)
                        : ""
            );
            setPaymentType(existing.paymentType || "Cash");
            setDescription(existing.description || "");
            setDate(existing.date || new Date().toISOString().split("T")[0]);
            setCategory(existing.category || "Personal Advance");
        }
    }, [existing]);

    const handleSubmit = async () => {
        if (!companyId) {
            alert("Company not found. Please login again.");
            return;
        }
        if (!employeeId || !amount) {
            alert("Please fill employee and amount.");
            return;
        }

        setSubmitting(true);

        try {
            const employeeObj = employees.find((e) => e.id === employeeId) || {};
            const projectObj = projects.find((p) => p.id === projectId) || {};

            let payload;

            if (category === "Company Advance") {
                // ✅ Company advance — closed in same month
                payload = {
                    projectId: projectObj.id || "",
                    projectName: projectObj.name || "",
                    employeeId: employeeObj.id || "",
                    employeeName: employeeObj.name || "",
                    amount: Number(amount),
                    paymentType,
                    category,
                    description: description || "",
                    date,
                    status: "closed",
                    createdAt: existing?.createdAt || new Date(),
                };
            } else {
                // ✅ PERSONAL ADVANCE — SIMPLE ADDITIVE MODEL (YOUR REQUIREMENT)
                payload = {
                    projectId: projectObj.id || "",
                    projectName: projectObj.name || "",
                    employeeId: employeeObj.id || "",
                    employeeName: employeeObj.name || "",
                    amount: Number(amount),
                    paymentType,
                    category,
                    description: description || "",
                    date,
                    createdAt: existing?.createdAt || new Date(),
                };
            }

            if (existing && existing.id) {
                await updateDoc(
                    doc(db, "Companies", companyId, "Advances", existing.id),
                    payload
                );
                alert("Advance updated");
            } else {
                await addDoc(
                    collection(db, "Companies", companyId, "Advances"),
                    payload
                );
                alert("Advance added");
            }

            onClose && onClose();
        } catch (err) {
            console.error("Failed to save advance", err);
            alert("Failed to save advance. Check console.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md p-4">

            <div className="
      max-w-md w-full rounded-2xl p-6 relative
      bg-white
      border border-gray-200
      shadow-xl
      text-gray-800
    ">

                <button
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                    onClick={onClose}
                >
                    <X size={20} />
                </button>

                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {existing ? "Edit Advance" : "Add Advance"}
                </h3>

                <div className="space-y-3">

                    {/* Employee */}
                    <div>
                        <label className="text-xs text-gray-600">Employee</label>
                        <select
                            value={employeeId}
                            onChange={(e) => setEmployeeId(e.target.value)}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            {employees.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="text-xs text-gray-600">Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Enter amount"
                        />
                    </div>

                    {/* Payment Type */}
                    <div>
                        <label className="text-xs text-gray-600">Payment Type</label>
                        <select
                            value={paymentType}
                            onChange={(e) => setPaymentType(e.target.value)}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Cash">Cash</option>
                            <option value="IDFC Bank">Bank</option>
                            <option value="Personal">Personal</option>
                        </select>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="text-xs text-gray-600">Advance Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="Personal Advance">Personal Advance</option>
                            <option value="Company Advance">Company Advance</option>
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-xs text-gray-600">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Note */}
                    <div>
                        <label className="text-xs text-gray-600">Note</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full p-2 rounded-lg mt-1 bg-white border border-gray-300 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Optional note"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 justify-end mt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-60 transition"
                        >
                            {submitting
                                ? (existing ? "Updating..." : "Adding...")
                                : (existing ? "Update" : "Submit")}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
