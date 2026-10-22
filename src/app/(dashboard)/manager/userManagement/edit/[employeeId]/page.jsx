"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { toast } from "react-hot-toast";

import { ArrowLeft } from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeForm from "../../components/ EmployeeForm";

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();

  const employeeId =
    params?.employeeId ||
    params?.id ||
    "";

  const { company } =
    useAuth();

  const companyId =
    company?.id || "";

  const [loading, setLoading] =
    useState(true);

  const [employee, setEmployee] =
    useState(null);

  /* ==========================================
      Load Employee

      Normally this should be served from the
      employee document cache if the user came
      from the employee directory/details page.
  ========================================== */

  useEffect(() => {
    let cancelled = false;

    async function loadEmployee() {
      if (
        !companyId ||
        !employeeId
      ) {
        if (!cancelled) {
          setLoading(false);
          setEmployee(null);
        }

        return;
      }

      try {
        setLoading(true);

        const data =
          await employeeService.getEmployee(
            companyId,
            employeeId
          );

        if (cancelled) {
          return;
        }

        setEmployee(data);
      } catch (error) {
        console.error(
          "[EditEmployee] Unable to load employee",
          {
            operation:
              "getEmployee",

            path:
              `Companies/${companyId}/Usermanagement/${employeeId}`,

            code:
              error?.code ||
              error?.message ||
              "unknown",
          }
        );

        if (!cancelled) {
          toast.error(
            "Unable to load employee."
          );

          setEmployee(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEmployee();

    return () => {
      cancelled = true;
    };
  }, [
    companyId,
    employeeId,
  ]);

  /* ==========================================
      Loading State
  ========================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-100" />

        <div className="rounded-3xl border border-slate-200 bg-white p-6">
          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="h-16 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================
      Not Found
  ========================================== */

  if (!employee) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
        <h2 className="text-xl font-bold text-slate-800">
          Employee not found
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          The employee could not be
          loaded or is no longer
          available.
        </p>

        <button
          type="button"
          onClick={() =>
            router.push(
              "/manager/userManagement"
            )
          }
          className="
            mt-5
            inline-flex
            items-center
            gap-2
            rounded-xl
            bg-blue-600
            px-4
            py-2.5
            text-sm
            font-semibold
            text-white
            transition
            hover:bg-blue-700
          "
        >
          <ArrowLeft size={16} />

          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <EmployeeForm
      mode="edit"
      employee={employee}
    />
  );
}