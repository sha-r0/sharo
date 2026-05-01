"use client";

import ProjectFormDialog from "./components/AddNewProject";
import { useState } from "react";
import { useUsers } from "@/app/allhooks/useUsers"; // ✅ ADD THIS
import { createProject, deleteProject, getProjects, updateProject } from "@/app/allservice/projectService";
import { useEffect } from "react";

export default function Projects() {

    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(1);

    const [projects, setProjects] = useState([]);
    const [loadingProjects, setLoadingProjects] = useState(true);

    const [editMode, setEditMode] = useState(false);
    const [editingProjectId, setEditingProjectId] = useState(null);

    const companyId = "NHffb3JNbL8iaYgT7dZ6";

    // ✅ FETCH USERS HERE (FIX)
    const { users, loading } = useUsers(companyId);

    // 🔥 FORM STATE
    const [formData, setFormData] = useState({
        name: "",
        client: "",
        poAmount: "",
        budget: 0,
        billing: false,
        startDate: "",
        endDate: "",
        description: "",
        status: "Pending",
        assignedEmployees: [{ id: "", name: "", salary: 0, hoursWorked: 0, targetHours: 0, expenseFromHours: 0 }],
    });

    const setField = (key, value) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    // 🔥 EMPLOYEE HANDLERS
    const addEmployeeRow = () => {
        setFormData((p) => ({
            ...p,
            assignedEmployees: [
                ...p.assignedEmployees,
                {
                    id: "",
                    name: "",
                    salary: 0,
                    hoursWorked: 0,
                    targetHours: 0,
                    expenseFromHours: 0,
                },
            ],
        }));
    };

    const removeEmployeeRow = (index) => {
        setFormData((p) => {
            const arr = [...p.assignedEmployees];
            arr.splice(index, 1);
            return { ...p, assignedEmployees: arr };
        });
    };

    // ✅ FIXED (NOW WORKS)
    const onSelectEmployeeForRow = (index, empId) => {
        const emp = users.find((u) => u.id === empId);

        if (!emp) return;

        const arr = [...formData.assignedEmployees];

        arr[index] = {
            ...arr[index],
            id: emp.id,
            name: emp.name,
            salary: emp.salary,
        };

        setFormData((prev) => ({
            ...prev,
            assignedEmployees: arr,
        }));
    };

    // ✅ FIXED (EXPENSE CALCULATION)
    const onChangeHoursForRow = (index, hours) => {
        const arr = [...formData.assignedEmployees];

        const h = Number(hours || 0);
        const salary = arr[index].salary || 0;

        const perHour = salary / 160;

        arr[index] = {
            ...arr[index],
            hoursWorked: h,
            expenseFromHours: h * perHour,
        };

        setFormData((prev) => ({
            ...prev,
            assignedEmployees: arr,
        }));
    };

    // 🔥 CALCULATIONS
    const previewTotalExpense = formData.assignedEmployees.reduce(
        (sum, e) => sum + (e.expenseFromHours || 0),
        0
    );

    const previewProfit =
        Number(formData.budget || 0) - previewTotalExpense;

    // 🔥 SAVE
    const handleSaveProject = async () => {
        try {
            console.log("PROJECT DATA:", formData);

            const payload = {
                ...formData,
                budget: Number(formData.budget || 0),
                totalExpense: previewTotalExpense,
                profit: previewProfit,
            }; 

            let newId = null;

            if (editMode) {
                // 🔥 UPDATE
                await updateProject(companyId, editingProjectId, payload);

                setProjects((prev) =>
                    prev.map((p) =>
                        p.id === editingProjectId ? { ...p, ...payload } : p
                    )
                );

                alert("Project Updated ✅");

            } else {
                // 🔥 CREATE
                newId = await createProject(companyId, payload);

                setProjects((prev) => [{ id: newId, ...payload }, ...prev]);

                console.log("Saved Project ID:", newId);

                alert("Project Saved ✅");
            }

            // 🔥 RESET STATES
            setOpen(false);
            setStep(1);
            setEditMode(false);
            setEditingProjectId(null);

            setFormData({
                name: "",
                client: "",
                poAmount: "",
                budget: 0,
                billing: false,
                startDate: "",
                endDate: "",
                description: "",
                status: "Pending",
                assignedEmployees: [
                    {
                        id: "",
                        name: "",
                        salary: 0,
                        hoursWorked: 0,
                        targetHours: 0,
                        expenseFromHours: 0,
                    },
                ],
            });

        } catch (error) {
            console.error("🔥 FIREBASE ERROR:", error);
            alert(error.message);
        }
    };

    const loadProjects = async () => {
        try {
            setLoadingProjects(true);

            const data = await getProjects(companyId);

            setProjects(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleEditProject = (project) => {
        setEditMode(true);
        setEditingProjectId(project.id);

        setFormData({
            name: project.name || "",
            client: project.client || "",
            poAmount: project.poAmount || "",
            budget: project.budget || 0,
            billing: project.billing || false,
            startDate: project.startDate || "",
            endDate: project.endDate || "",
            description: project.description || "",
            status: project.status || "Pending",
            assignedEmployees: project.assignedEmployees || [],
        });

        setStep(1);
        setOpen(true);
    };

    const handleDeleteProject = async (projectId) => {
        const confirmDelete = confirm("Delete this project?");

        if (!confirmDelete) return;

        try {
            await deleteProject(companyId, projectId);

            // 🔥 remove from UI instantly
            setProjects((prev) => prev.filter((p) => p.id !== projectId));

        } catch (err) {
            console.error(err);
            alert("Delete failed ❌");
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    return (
        <div className="min-h-screen">

            {/* HEADER */}
            <div className="flex justify-between mb-6">
                <h1 className="text-3xl font-bold">Project Management</h1>

                <button
                    onClick={() => setOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    + Add New Project
                </button>
            </div>

            {/* PROJECT CARDS */}
            <div className="w-full">
                {loadingProjects ? (
                    <div>Loading projects...</div>
                ) : projects.length === 0 ? (
                    <div>No projects found</div>
                ) : (
                    <div className="space-y-6">
                        {projects.map((p) => (
                            <div
                                key={p.id}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 relative"
                            >

                                {/* HEADER */}
                                <h2 className="text-2xl font-semibold text-green-600 mb-1">
                                    {p.name}
                                </h2>

                                <p className="text-gray-500 mb-4">
                                    Client: {p.client}
                                </p>

                                {/* TOP TAGS */}
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <span className="chip">PO Amount: ₹{p.poAmount || 0}</span>
                                    <span className="chip blue">Budget: ₹{p.budget || 0}</span>
                                    <span className="chip orange">Total Expense: ₹{p.totalExpense || 0}</span>
                                    <span className="chip green">Profit: ₹{p.profit || 0}</span>
                                    <span className="chip">Status: {p.status}</span>
                                </div>

                                <hr className="mb-4" />

                                {/* PROGRESS + ACTION */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1 mr-6">
                                        <div className="text-sm mb-1 font-medium">
                                            Progress (time-based)
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 h-2 bg-gray-200 rounded-full">
                                                <div className="h-2 bg-gray-400 rounded-full w-[0%]"></div>
                                            </div>
                                            <span className="text-sm">0%</span>
                                        </div>
                                    </div>

                                    {/* RIGHT ACTIONS */}
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="border rounded px-2 py-1 text-sm"
                                            value={p.status}
                                            onChange={(e) => {
                                                console.log("status change", e.target.value);
                                            }}
                                        >
                                            {["Pending", "In Progress", "Completed", "Delayed"].map((s) => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>

                                        <button
                                            className="px-3 py-1 border rounded text-sm"
                                            onClick={() => handleEditProject(p)}
                                        >
                                            EDIT
                                        </button>

                                        <button
                                            className="px-3 py-1 border border-red-500 text-red-500 rounded text-sm"
                                            onClick={() => handleDeleteProject(p.id)}
                                        >
                                            DELETE
                                        </button>
                                    </div>
                                </div>

                                {/* DATES */}
                                <p className="text-sm text-gray-500 mb-4">
                                    Start: {p.startDate || "-"} • End: {p.endDate || "-"}
                                </p>

                                {/* BOTTOM STATS */}
                                <div className="flex flex-wrap gap-3 text-sm">
                                    <span className="chip">
                                        Aggregated Hours: 0.00 hrs
                                    </span>

                                    <span className="chip blue">
                                        Aggregated Amount: ₹0.00
                                    </span>

                                    <span className="chip orange">
                                        Normal Expenses: ₹0.00
                                    </span>

                                    {/* Example employee */}
                                    {p.assignedEmployees?.map((emp, idx) => (
                                        <span key={idx} className="chip">
                                            {emp.name} • {emp.targetHours || 0}h
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL */}
            <ProjectFormDialog
                open={open}
                onClose={() => setOpen(false)}
                step={step}
                setStep={setStep}
                formData={formData}
                setField={setField}
                companyId={companyId}
                onSelectEmployeeForRow={onSelectEmployeeForRow}
                onChangeHoursForRow={onChangeHoursForRow}
                addEmployeeRow={addEmployeeRow}
                removeEmployeeRow={removeEmployeeRow}
                previewTotalExpense={previewTotalExpense}
                previewProfit={previewProfit}
                handleSaveProject={handleSaveProject}
            />

        </div>
    );
}