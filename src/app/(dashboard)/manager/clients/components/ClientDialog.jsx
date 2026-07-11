"use client";

import { useState } from "react";
import { X, Building2 } from "lucide-react";

import ClientForm from "./ClientForm";
import useClientForm from "../hooks/useClientForm";
import clientService from "../services/clientService";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ClientDialog({

    open,

    onClose,

    companyId,

    onSaved,

}) {

    const {

        form,

        updateField,

        updateAddress,

        resetForm,

    } = useClientForm();

    const [saving, setSaving] = useState(false);

    const [errors, setErrors] = useState({});

    if (!open) return null;

    async function handleSave() {

        try {

            console.log("1. Starting save...");

            setSaving(true);

            const result = await clientService.create(companyId, form);

            console.log("2. Service returned:", result);

            if (!result.success) {

                console.log("3. Validation failed:", result.errors);

                setErrors(result.errors || {});

                return;

            }

            console.log("4. Client saved successfully");

            resetForm();

            setErrors({});

            onClose();

            onSaved?.();

        } catch (error) {

            console.error("SAVE ERROR:", error);

        } finally {

            setSaving(false);

        }

    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6">

            <div
                className={`
        ${neoShadow}
        w-full
        max-w-4xl
        max-h-[90vh]
        rounded-3xl
        bg-[#F9FAFC]
        overflow-hidden
        flex
        flex-col
    `}
            >

                {/* Header */}

                <div className="flex items-center justify-between border-b border-slate-200 px-8 py-6">

                    <div className="flex items-center gap-4">

                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">

                            <Building2 size={24} />

                        </div>

                        <div>

                            <h2 className="text-2xl font-bold text-slate-800">

                                Add Client

                            </h2>

                            <p className="text-slate-500 mt-1">

                                Create a new client for your projects

                            </p>

                        </div>

                    </div>

                    <button

                        onClick={onClose}

                        className="rounded-xl p-2 hover:bg-slate-100"

                    >

                        <X size={22} />

                    </button>

                </div>

                {/* Form */}

                <div className="max-h-[75vh] overflow-y-auto p-8">

                    <ClientForm

                        form={form}

                        errors={errors}

                        updateField={updateField}

                        updateAddress={updateAddress}

                    />

                </div>

                {/* Footer */}

                <div className="flex justify-end gap-4 border-t border-slate-200 px-8 py-6">

                    <button

                        onClick={onClose}

                        disabled={saving}

                        className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-medium"

                    >

                        Cancel

                    </button>

                    <button

                        onClick={handleSave}

                        disabled={saving}

                        className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-semibold text-white disabled:opacity-50"

                    >

                        {saving ? "Saving..." : "Save Client"}

                    </button>

                </div>

            </div>

        </div>

    );

}