"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import useProjects from "./hooks/useProjects";
import useProjectData from "./hooks/useProjectData";
import AddProjectDialog from "./components/form/AddProjectDialog";
import ProjectPortfolioDashboard, { effectiveProjectStatus, matchesProjectIntelligence } from "./components/portfolio/ProjectPortfolioDashboard";
import useProjectPortfolioCosts from "./hooks/useProjectPortfolioCosts";
import { asDate } from "./services/ProjectAnalyticsService";

const projectDate = (value) => {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }
    return asDate(value);
};

const financialYearStart = (date) => date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
const currentFinancialYear = () => String(financialYearStart(new Date()));

export default function ProjectManagementPage() {
    const { company } = useAuth();
    const { loading, refreshing, error, projects, refresh, createProject, updateProject, deleteProject } = useProjects();
    const lookup = useProjectData(company?.id);
    const costedProjects = useProjectPortfolioCosts(company?.id, projects);
    const [filters, setFilters] = useState({ search: "", status: "all", client: "", intelligence: "all", financialYear: currentFinancialYear() });
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const financialYears = useMemo(() => {
        const years = new Set([Number(currentFinancialYear())]);
        costedProjects.forEach((project) => {
            const date = projectDate(project.startDate);
            if (date) years.add(financialYearStart(date));
        });
        return [...years].sort((a, b) => b - a);
    }, [costedProjects]);

    const financialYearProjects = useMemo(() => costedProjects.filter((project) => {
        const date = projectDate(project.startDate);
        return filters.financialYear === "all" || (date && financialYearStart(date) === Number(filters.financialYear));
    }), [costedProjects, filters.financialYear]);

    const filteredProjects = useMemo(() => financialYearProjects.filter((project) => {
        const text = filters.search.trim().toLowerCase();
        const employeeText = (project.employees || []).map((item) => `${item.fullName} ${item.employeeId}`).join(" ");
        const searchMatch = !text || `${project.projectName} ${project.projectId} ${project.clientName} ${project.managerName} ${employeeText}`.toLowerCase().includes(text);
        const projectStatus = effectiveProjectStatus(project).toLowerCase();
        const statusMatch = filters.status === "all" || projectStatus === filters.status || (filters.status === "hold" && projectStatus === "on hold");
        const clientMatch = !filters.client || project.clientId === filters.client;
        const smartMatch = matchesProjectIntelligence(project, filters.intelligence);
        return searchMatch && statusMatch && clientMatch && smartMatch;
    }), [financialYearProjects, filters]);

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
            projects={filteredProjects} allProjects={financialYearProjects} clients={lookup.clients} financialYears={financialYears}
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
