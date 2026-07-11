"use client";

import { useState } from "react";
import { X, FolderKanban } from "lucide-react";

import useProjectForm from "../../hooks/useProjectForm";
import useProjectData from "../../hooks/useProjectData";

import ProjectStepper from "./ProjectStepper";
import ProjectInfoStep from "./step/ProjectInfoStep";
import ProjectEmployeeStep from "./step/ProjectEmployeeStep";
import ProjectReviewStep from "./step/ProjectReviewStep";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function AddProjectDialog({

    open,

    onClose,

    onSave,

}) {

    const { company } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [saving, setSaving] = useState(false);

    const {

        form,

        updateField,

        addEmployee,

        removeEmployee,

        updateEmployee,

        resetForm,

    } = useProjectForm();

    const {

        loading,

        clients,

        managers,

        employees,

        refresh,

    } = useProjectData(company?.id);

    if (!open) return null;

    function handleClose() {

        resetForm();

        setCurrentStep(1);

        onClose();

    }

    async function handleNext() {

        if (currentStep < 3) {

            setCurrentStep(currentStep + 1);

            return;

        }

        try {

            setSaving(true);

            const result = await onSave(form);

            if (result.success) {

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

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">

            <div
                className={`
                    ${neoShadow}
                    w-full
                    max-w-6xl
                    max-h-[90vh]
                    rounded-[32px]
                    bg-[#F9FAFC]
                    overflow-hidden
                    flex
                    flex-col
                `}
            >

                {/* Header */}

                <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">

                    <div className="flex items-center gap-4">

                        <div className="h-14 w-14 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">

                            <FolderKanban size={28} />

                        </div>

                        <div>

                            <h2 className="text-3xl font-bold text-slate-800">

                                New Project

                            </h2>

                            <p className="mt-1 text-slate-500">

                                Create and configure a new project

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

                <div className="px-8 pt-8">

                    <ProjectStepper

                        currentStep={currentStep}

                    />

                </div>

                {/* Body */}

                <div className="flex-1 overflow-y-auto px-8 py-8">

                    {

                        loading ? (

                            <div className="flex h-80 items-center justify-center">

                                <div className="text-center">

                                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

                                    <p className="mt-4 text-slate-500">

                                        Loading project data...

                                    </p>

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

                                    <ProjectReviewStep

                                        form={form}

                                    />

                                )}

                            </>

                        )

                    }

                </div>

                {/* Footer */}

                <div className="flex items-center justify-between border-t border-slate-200 px-8 py-6">

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

                                ? "Creating..."

                                : currentStep === 3

                                    ? "Create Project"

                                    : "Next →"

                        }

                    </button>

                </div>

            </div>

        </div>

    );

}