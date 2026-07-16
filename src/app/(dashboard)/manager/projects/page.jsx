"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import useProjects from "./hooks/useProjects";
import useProjectData from "./hooks/useProjectData";
import AddProjectDialog from "./components/form/AddProjectDialog";
import ProjectPortfolioDashboard from "./components/portfolio/ProjectPortfolioDashboard";
import useProjectPortfolioCosts from "./hooks/useProjectPortfolioCosts";

export default function ProjectManagementPage() {
    const { company } = useAuth();
    const { loading, refreshing, error, projects, refresh, createProject, updateProject, deleteProject } = useProjects();
    const lookup = useProjectData(company?.id);
    const costedProjects = useProjectPortfolioCosts(company?.id, projects);
    const [filters, setFilters] = useState({ search: "", status: "all", client: "", intelligence: "all" });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const filteredProjects = useMemo(() => costedProjects.filter((project) => {
        const text = filters.search.trim().toLowerCase();
        const employeeText = (project.employees || []).map((item) => `${item.fullName} ${item.employeeId}`).join(" ");
        const searchMatch = !text || `${project.projectName} ${project.projectId} ${project.clientName} ${project.managerName} ${employeeText}`.toLowerCase().includes(text);
        const projectStatus = String(project.status || "").toLowerCase();
        const statusMatch = filters.status === "all" || projectStatus === filters.status || (filters.status === "hold" && projectStatus === "on hold");
        const clientMatch = !filters.client || project.clientId === filters.client;
        const expense = Number(project.totalExpense || 0); const budget = Number(project.budget || 0); const revenue = Number(project.poAmount || 0);
        const profit = Number(project.totalProfit ?? revenue - expense);
        const delayed = project.overdue || projectStatus === "delayed" || (project.endDate && project.endDate < new Date().toISOString().slice(0,10) && projectStatus !== "completed");
        const smartMatch = filters.intelligence === "all" || (filters.intelligence === "delayed" && delayed) ||
            (filters.intelligence === "critical" && Number(project.healthScore ?? 100) < 60) ||
            (filters.intelligence === "loss" && profit < 0) ||
            (filters.intelligence === "profit" && revenue > 0 && profit / revenue >= .2) ||
            (filters.intelligence === "budget" && budget > 0 && expense > budget) ||
            (filters.intelligence === "vendor" && expense > 0 && Number(project.vendorCost || project.vendorExpense || 0) / expense >= .5);
        return searchMatch && statusMatch && clientMatch && smartMatch;
    }), [costedProjects, filters]);

    const openCreate = () => { setEditingProject(null); setDialogOpen(true); };
    const openEdit = (project) => { setEditingProject(project); setDialogOpen(true); };
    const closeDialog = () => { setDialogOpen(false); setEditingProject(null); };

    const saveProject = async (form) => {
        if (!editingProject) {
            const result = await createProject(form);
            if (result?.success) toast.success("Project created successfully.");
            return result;
        }
        const retainedVendorIds = new Set((form.vendors || []).flatMap((item) => [item.vendorId, item.firestoreId]).filter(Boolean));
        const removedPaidVendor = (editingProject.vendors || []).find((item) => Number(item.paidAmount || 0) > 0 && ![item.vendorId, item.firestoreId].filter(Boolean).some((id) => retainedVendorIds.has(id)));
        if (removedPaidVendor) return { success: false, message: `${removedPaidVendor.vendorName || "Vendor"} has payment history and cannot be removed from this project.` };
        const update = {
            projectName: form.projectName.trim(), clientId: form.clientId, clientName: form.clientName,
            managerId: form.managerId, managerName: form.managerName, projectType: form.projectType,
            executionModel: form.executionModel,
            poAmount: Number(form.poAmount || 0), budget: Number(form.budget || 0), startDate: form.startDate,
            endDate: form.endDate, priority: form.priority, status: form.status, description: form.description,
            location: form.location,
            employees: (form.employees || []).map((item) => ({
                firestoreId: item.firestoreId || item.id || "", employeeId: item.employeeId || "",
                fullName: item.fullName || "", designation: item.designation || "", salary: Number(item.salary || 0),
                hours: Number(item.hours || 0),
            })),
            employeeCount: form.employees?.length || 0,
            vendors: (form.vendors || []).map((item) => ({
                firestoreId: item.firestoreId || item.id || item.vendorId || "", vendorId: item.vendorId || item.firestoreId || item.id || "",
                vendorCode: item.vendorCode || "", vendorName: item.vendorName || item.companyName || "", contactPerson: item.contactPerson || "", phone: item.phone || "",
                allocatedAmount: Number(item.allocatedAmount || 0), paidAmount: Number(item.paidAmount || 0),
                remainingAmount: Math.max(0, Number(item.allocatedAmount || 0) - Number(item.paidAmount || 0)),
                paymentPercent: Number(item.allocatedAmount || 0) ? Number(item.paidAmount || 0) / Number(item.allocatedAmount) * 100 : 0,
                scope: item.scope || "", targetCompletion: item.targetCompletion || null, paymentTerms: item.paymentTerms || "", notes: item.notes || "",
                progress: Number(item.progress || 0), status: item.status || "assigned",
            })),
            vendorCount: form.vendors?.length || 0,
        };
        const result = await updateProject(editingProject.id, update);
        toast.success("Project updated successfully.");
        return result;
    };

    const changeStatus = async (project, status) => {
        setBusyId(project.id);
        try { await updateProject(project.id, { status }); toast.success(`Project marked ${status}.`); }
        catch (statusError) { console.error(statusError); toast.error("Could not update project status."); }
        finally { setBusyId(null); }
    };

    const removeProject = async (project) => {
        if (!window.confirm(`Delete “${project.projectName}”? This action cannot be undone.`)) return;
        setBusyId(project.id);
        try { await deleteProject(project.id); toast.success("Project deleted."); }
        catch (deleteError) { console.error(deleteError); toast.error("Could not delete the project."); }
        finally { setBusyId(null); }
    };

    return <>
        <ProjectPortfolioDashboard
            projects={filteredProjects} allProjects={costedProjects} clients={lookup.clients}
            loading={loading} refreshing={refreshing} error={error || lookup.error}
            filters={filters} onFilter={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
            onRefresh={refresh} onCreate={openCreate} onEdit={openEdit} onDelete={removeProject}
            onStatus={changeStatus} busyId={busyId}
        />
        <AddProjectDialog
            open={dialogOpen} project={editingProject} onClose={closeDialog} onSave={saveProject}
            clients={lookup.clients} managers={lookup.managers} employees={lookup.employees} loadingData={lookup.loading}
            vendors={lookup.vendors}
        />
    </>;
}
