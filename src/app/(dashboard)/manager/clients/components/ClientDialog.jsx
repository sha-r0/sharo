"use client";

import { useEffect, useState } from "react";
import { Building2, X } from "lucide-react";

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
  client = null,
}) {
  const isEditMode = Boolean(client?.id);

  const {
    form,
    updateField,
    updateAddress,
    resetForm,
  } = useClientForm(client);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");

  useEffect(() => {
    if (open) {
      setErrors({});
      setGeneralError("");
    }
  }, [open, client]);

  if (!open) return null;

  async function handleSave() {
    if (!companyId) {
      setGeneralError("Company information is unavailable.");
      return;
    }

    try {
      setSaving(true);
      setErrors({});
      setGeneralError("");

      let result;

      if (isEditMode) {
        result = await clientService.updateClient(
          companyId,
          client.id,
          form,
        );
      } else {
        result = await clientService.create(companyId, form);
      }

      if (result?.success === false) {
        setErrors(result.errors || {});
        setGeneralError(result.message || "Please check the form.");
        return;
      }

      resetForm();
      onClose();
      await onSaved?.();
    } catch (error) {
      console.error("Client save failed:", error);

      setGeneralError(
        error?.message || "Unable to save client.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (saving) return;

    resetForm();
    setErrors({});
    setGeneralError("");
    onClose();
  }

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/40 p-4
        backdrop-blur-sm
      "
    >
      <div
        className={`
          ${neoShadow}
          flex max-h-[92vh] w-full max-w-4xl
          flex-col overflow-hidden
          rounded-3xl bg-[#F9FAFC]
        `}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
              <Building2 size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
                {isEditMode ? "Edit Client" : "Add Client"}
              </h2>

              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                {isEditMode
                  ? "Update the selected client information"
                  : "Create a new client for your projects"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            aria-label="Close dialog"
            className="rounded-xl p-2 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-8">
          {generalError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {generalError}
            </div>
          )}

          <ClientForm
            form={form}
            errors={errors}
            updateField={updateField}
            updateAddress={updateAddress}
          />
        </div>

        <div className="flex justify-end gap-4 border-t border-slate-200 px-5 py-5 sm:px-8 sm:py-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-medium transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-3 font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
          >
            {saving
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
                ? "Update Client"
                : "Save Client"}
          </button>
        </div>
      </div>
    </div>
  );
}