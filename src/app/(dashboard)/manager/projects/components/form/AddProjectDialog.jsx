"use client";

import { useState } from "react";
import { X, FolderKanban } from "lucide-react";

import useProjectForm from "../../hooks/useProjectForm";

import ProjectStepper from "./ProjectStepper";
import ProjectInfoStep from "./step/ProjectInfoStep";
import ProjectEmployeeStep from "./step/ProjectEmployeeStep";
import ProjectReviewStep from "./step/ProjectReviewStep";
import ProjectVendorStep from "./step/ProjectVendorStep";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AddProjectDialog({

    open,

    onClose,

    onSave,

    project = null,

    clients = [],

    managers = [],

    employees = [],
    vendors = [],

    loadingData = false,

}) {

    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);

    const {

        form,

        updateField,

        addEmployee,

        removeEmployee,

        updateEmployee,

        addVendor,

        removeVendor,

        updateVendor,

        resetForm,

    } = useProjectForm(project);

    if (!open) return null;

    function handleClose() {

        resetForm();

        setCurrentStep(1);

        onClose();

    }

    async function handleNext() {

        if (currentStep === 1) {
            if (!form.projectName.trim()) return alert("Project name is required.");
            if (!form.clientId) return alert("Please select a client.");
            if (!form.startDate || !form.endDate) return alert("Start and end dates are required.");
            if (form.endDate < form.startDate) return alert("End date cannot be before the start date.");
            if (Number(form.budget || 0) < 0 || Number(form.poAmount || 0) < 0) return alert("Financial values cannot be negative.");
        }

        if (currentStep === 3 && ["outsourced", "hybrid"].includes(form.executionModel) && !form.vendors.length) return alert("This execution model requires at least one vendor.");
        if (currentStep === 3 && form.vendors.some((item) => Number(item.allocatedAmount || 0) <= 0)) return alert("Every assigned vendor requires an allocated amount.");
        if (currentStep === 3 && form.vendors.some((item) => Number(item.allocatedAmount || 0) < Number(item.paidAmount || 0))) return alert("Vendor allocation cannot be reduced below the amount already paid.");

        if (currentStep < 4) {

            setCurrentStep(currentStep + 1);

            return;

        }

        try {

            setSaving(true);

            const result = await onSave(form);

            if (result?.success) {

                handleClose();

            } else {

                alert(result.message || "Failed to create project.");

            }

        } catch (error) {

            console.error(error);

            alert(error.message);

        } finally {

            setSaving(false);

        }

    }

    function handleBack() {

        if (currentStep === 1) {

            handleClose();

            return;

        }

        setCurrentStep(currentStep - 1);

    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-2 sm:p-6">

            <div
                className={`
                    ${neoShadow}
                    w-full
                    max-w-6xl
                    max-h-[96vh]
                    rounded-2xl
                    sm:max-h-[90vh]
                    sm:rounded-[32px]
                    bg-[#F9FAFC]
                    overflow-hidden
                    flex
                    flex-col
                `}
            >

                {/* Header */}

                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-8 sm:py-6">

                    <div className="flex items-center gap-4">

                        <div className="hidden h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 items-center justify-center text-white sm:flex">

                            <FolderKanban size={28} />

                        </div>

                        <div>

                            <h2 className="text-xl font-bold text-slate-800 sm:text-3xl">

                                {project ? "Edit Project" : "New Project"}

                            </h2>

                            <p className="mt-1 text-slate-500">

                                {project ? "Update project information and assignments" : "Create and configure a new project"}

                            </p>

                        </div>

                    </div>

                    <button

                        onClick={handleClose}

                        className="rounded-2xl p-3 hover:bg-slate-100"

                    >

                        <X size={22} />

                    </button>

                </div>

                {/* Stepper */}

                <div className="px-3 pt-5 sm:px-8 sm:pt-8">

                    <ProjectStepper

                        currentStep={currentStep}

                    />

                </div>

                {/* Body */}

                <div className="flex-1 overflow-y-auto px-2 py-5 sm:px-8 sm:py-8">

                    {

                        loadingData ? (

                            <div className="space-y-5 py-5" aria-label="Loading project data">
                                <div className="h-7 w-52 animate-pulse rounded-lg bg-slate-200" />
                                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <div key={index} className="h-12 animate-pulse rounded-2xl bg-slate-200" />
                                    ))}
                                </div>
                            </div>

                        ) : (

                            <>
                                {currentStep === 1 && (

                                    <ProjectInfoStep

                                        form={form}

                                        updateField={updateField}

                                        clients={clients}

                                        managers={managers}

                                    />

                                )}

                                {currentStep === 2 && (

                                    <ProjectEmployeeStep

                                        form={form}

                                        employees={employees}

                                        addEmployee={addEmployee}

                                        removeEmployee={removeEmployee}

                                        updateEmployee={updateEmployee}

                                    />

                                )}

                                {currentStep === 3 && (

                                    <ProjectVendorStep form={form} vendors={vendors} addVendor={addVendor} removeVendor={removeVendor} updateVendor={updateVendor} />

                                )}

                                {currentStep === 4 && (

                                    <ProjectReviewStep

                                        form={form}

                                    />

                                )}

                            </>

                        )

                    }

                </div>

                {/* Footer */}

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 sm:px-8 sm:py-6">

                    <button
                        disabled={saving}

                        onClick={handleBack}

                        className={`${neoShadow}
    rounded-2xl
    bg-white
    px-8
    py-3
    font-medium
    hover:-translate-y-0.5
    transition-all`}

                    >

                        {

                            currentStep === 1

                                ? "Cancel"

                                : "← Back"

                        }

                    </button>

                    <button
                        disabled={saving}

                        onClick={handleNext}

                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-semibold text-white hover:-translate-y-0.5 transition-all"

                    >

                        {

                            saving

                                ? (project ? "Updating..." : "Creating...")

                                : currentStep === 4

                                    ? (project ? "Update Project" : "Create Project")

                                    : "Next →"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}
