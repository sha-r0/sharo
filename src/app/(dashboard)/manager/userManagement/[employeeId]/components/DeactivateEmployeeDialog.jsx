"use client";

import { useState } from "react";

import {
  AlertTriangle,
  Loader2,
  UserX,
} from "lucide-react";

import toast from "react-hot-toast";

import employeeService from "@/app/allservice/employee/employeeService";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function DeactivateEmployeeDialog({
  employee,
  open,
  onClose,
  onSuccess,
}) {
  const {
    company,
    currentUser,
  } = useAuth();

  const [loading, setLoading] =
    useState(false);

  /* ==========================================
     Derived Data
  ========================================== */

  const companyId =
    company?.id || "";

  const employeeFirestoreId =
    employee?.firestoreId ||
    employee?.id ||
    "";

  const employeeName =
    employee?.personalInfo
      ?.fullName ||
    employee?.fullName ||
    employee?.name ||
    employee?.employeeId ||
    "this employee";

  /* ==========================================
     Deactivate
  ========================================== */

  async function deactivate() {
    if (loading) {
      return;
    }

    if (!companyId) {
      toast.error(
        "Company information is missing."
      );

      return;
    }

    if (!employeeFirestoreId) {
      toast.error(
        "Employee record ID is missing."
      );

      return;
    }

    try {
      setLoading(true);

      const result =
        await employeeService.deactivateEmployee(
          companyId,
          employeeFirestoreId,
          currentUser
        );

      if (
        result?.success === false
      ) {
        toast.error(
          result?.message ||
            "Unable to deactivate employee."
        );

        return;
      }

      toast.success(
        result?.message ||
          "Employee deactivated successfully."
      );

      /*
       * Allow parent page to refresh its local
       * state/cache before closing the modal.
       */
      if (onSuccess) {
        await onSuccess(
          result
        );
      }

      onClose?.();
    } catch (error) {
      console.error(
        "[DeactivateEmployeeDialog] Deactivation failed",
        error
      );

      toast.error(
        error?.message ||
          "Unable to deactivate employee."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================
     Closed
  ========================================== */

  if (!open) {
    return null;
  }

  /* ==========================================
     UI
  ========================================== */

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-black/40
        p-5
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="deactivate-employee-title"
    >
      <div
        className="
          w-full
          max-w-lg
          overflow-hidden
          rounded-3xl
          bg-white
          shadow-2xl
          animate-in
          fade-in
          zoom-in-95
        "
      >
        {/* ======================================
            Header
        ====================================== */}

        <div className="p-8">
          <div
            className="
              mx-auto
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-red-100
            "
          >
            <AlertTriangle
              className="text-red-600"
              size={34}
            />
          </div>

          <h2
            id="deactivate-employee-title"
            className="
              mt-5
              text-center
              text-2xl
              font-bold
              text-slate-900
            "
          >
            Deactivate Employee
          </h2>

          <p
            className="
              mt-3
              text-center
              leading-relaxed
              text-slate-500
            "
          >
            Are you sure you want
            to deactivate
            <br />

            <span className="font-semibold text-slate-800">
              {employeeName}
            </span>
            ?
          </p>
        </div>

        {/* ======================================
            Information
        ====================================== */}

        <div className="px-8">
          <div
            className="
              space-y-3
              rounded-2xl
              border
              border-red-100
              bg-red-50
              p-5
              text-sm
              text-slate-700
            "
          >
            <div>
              ✓ Login access will
              be disabled
            </div>

            <div>
              ✓ Employee will no
              longer appear as
              active
            </div>

            <div>
              ✓ Attendance history
              will remain safe
            </div>

            <div>
              ✓ Salary and expense
              history will remain
              safe
            </div>

            <div>
              ✓ Employee can be
              restored later
            </div>
          </div>
        </div>

        {/* ======================================
            Actions
        ====================================== */}

        <div
          className="
            flex
            justify-end
            gap-3
            p-8
          "
        >
          <button
            type="button"
            onClick={() =>
              onClose?.()
            }
            disabled={loading}
            className="
              h-12
              rounded-xl
              border
              border-slate-300
              px-6
              font-medium
              text-slate-700
              transition
              hover:bg-slate-100
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              deactivate
            }
            disabled={
              loading ||
              !companyId ||
              !employeeFirestoreId
            }
            className="
              flex
              h-12
              items-center
              gap-2
              rounded-xl
              bg-red-600
              px-6
              font-semibold
              text-white
              transition
              hover:bg-red-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={18}
                />

                Deactivating...
              </>
            ) : (
              <>
                <UserX
                  size={18}
                />

                Deactivate Employee
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}