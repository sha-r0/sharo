"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useParams,
  useRouter,
} from "next/navigation";

import { toast } from "react-hot-toast";

import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeHeader from "./components/EmployeeHeader";

import PersonalSection from "./components/sections/PersonalSection";
import EmploymentSection from "./components/sections/EmploymentSection";
import SalarySection from "./components/sections/SalarySection";
import BankSection from "./components/sections/BankSection";
import AddressSection from "./components/sections/AddressSection";
import DocumentsSection from "./components/sections/DocumentsSection";
import AccessSection from "./components/sections/AccessSection";

import DeactivateEmployeeDialog from "./components/DeactivateEmployeeDialog";

export default function EmployeeDetailsPage() {
  const router = useRouter();

  const params = useParams();

  /*
   * Supports either:
   * [employeeId]/page.jsx
   * or
   * [id]/page.jsx
   */
  const employeeId =
    params?.employeeId ||
    params?.id ||
    "";

  const {
    company,
    can,
  } = useAuth();

  const companyId =
    company?.id || "";

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [employee, setEmployee] =
    useState(null);

  const [
    showDeactivate,
    setShowDeactivate,
  ] = useState(false);

  /* ==========================================
      Load Employee

      Normally this can use the individual
      document cache populated when the
      employee directory was loaded.
  ========================================== */

  const loadEmployee =
    useCallback(
      async ({
        showLoading = false,
        force = false,
      } = {}) => {
        if (
          !companyId ||
          !employeeId
        ) {
          setEmployee(null);
          setLoading(false);

          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          /*
           * For a forced refresh we clear
           * only this employee's cached
           * document before loading it.
           *
           * This is used only after actions
           * that may have changed employee
           * data.
           */
          if (force) {
            const repository =
              employeeService.repository;

            if (repository) {
              const cachedEmployee =
                await repository.get(
                  companyId,
                  employeeId
                );

              const firestoreId =
                cachedEmployee?.firestoreId ||
                cachedEmployee?.id ||
                employeeId;

              repository.removeCache(
                `Companies/${companyId}/Usermanagement/${firestoreId}`
              );
            }
          }

          const data =
            await employeeService.getEmployee(
              companyId,
              employeeId
            );

          setEmployee(data);
        } catch (error) {
          console.error(
            "[EmployeeDetails] Unable to load employee",
            {
              companyId,

              employeeId,

              code:
                error?.code ||
                error?.message ||
                "unknown",
            }
          );

          toast.error(
            "Unable to load employee."
          );

          setEmployee(null);
        } finally {
          setLoading(false);
        }
      },
      [
        companyId,
        employeeId,
      ]
    );

  /* ==========================================
      Initial Load
  ========================================== */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (
        !companyId ||
        !employeeId
      ) {
        if (!cancelled) {
          setLoading(false);
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

        if (!cancelled) {
          setEmployee(data);
        }
      } catch (error) {
        console.error(
          "[EmployeeDetails] Unable to load employee",
          {
            companyId,

            employeeId,

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

    load();

    return () => {
      cancelled = true;
    };
  }, [
    companyId,
    employeeId,
  ]);

  /* ==========================================
      Manual Refresh
  ========================================== */

  async function handleRefresh() {
    if (
      refreshing ||
      !companyId ||
      !employeeId
    ) {
      return;
    }

    try {
      setRefreshing(true);

      /*
       * Remove only this employee document
       * from the BaseService cache.
       */
      const employeePath =
        `Companies/${companyId}/Usermanagement/${employeeId}`;

      employeeService.repository?.removeCache(
        employeePath
      );

      const data =
        await employeeService.getEmployee(
          companyId,
          employeeId
        );

      setEmployee(data);

      toast.success(
        "Employee refreshed."
      );
    } catch (error) {
      console.error(
        "[EmployeeDetails] Refresh failed",
        error
      );

      toast.error(
        "Unable to refresh employee."
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================
      Reload After Mutation

      Access, Bank sync, etc. may update the
      employee through another API. Clear the
      cached document first so we do not show
      stale information.
  ========================================== */

  async function handleChanged() {
    if (
      !companyId ||
      !employeeId
    ) {
      return;
    }

    try {
      const employeePath =
        `Companies/${companyId}/Usermanagement/${employeeId}`;

      employeeService.repository?.removeCache(
        employeePath
      );

      employeeService.repository
        ?.invalidateCompany?.(
          companyId
        );

      const data =
        await employeeService.getEmployee(
          companyId,
          employeeId
        );

      setEmployee(data);
    } catch (error) {
      console.error(
        "[EmployeeDetails] Unable to reload changed employee",
        error
      );

      toast.error(
        "Employee was changed, but the latest information could not be loaded."
      );
    }
  }

  /* ==========================================
      Edit
  ========================================== */

  function handleEdit() {
    const firestoreId =
      employee?.firestoreId ||
      employee?.id ||
      employeeId;

    if (!firestoreId) {
      toast.error(
        "Employee ID is unavailable."
      );

      return;
    }

    router.push(
      `/manager/userManagement/edit/${firestoreId}`
    );
  }

  /* ==========================================
      Loading State
  ========================================== */

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-36 animate-pulse rounded-3xl bg-white" />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              key={index}
              className="h-52 animate-pulse rounded-3xl bg-white"
            />
          ))}
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
          This employee may have been
          removed or you may not have
          access to the record.
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
    <div className="space-y-6">
      {/* =====================================
          Page Controls
      ====================================== */}

      {/* <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            router.push(
              "/manager/userManagement"
            )
          }
          className="
            inline-flex
            items-center
            gap-2
            text-sm
            font-semibold
            text-slate-500
            transition
            hover:text-slate-800
          "
        >
          <ArrowLeft size={17} />

          Employees
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="
            inline-flex
            items-center
            gap-2
            rounded-xl
            border
            border-slate-200
            bg-white
            px-3.5
            py-2
            text-sm
            font-semibold
            text-slate-600
            shadow-sm
            transition
            hover:bg-slate-50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <RefreshCw
            size={15}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing"
            : "Refresh"}
        </button>
      </div> */}

      {/* =====================================
          Header
      ====================================== */}

      <EmployeeHeader
        employee={employee}
        onEdit={
          can("employee.edit")
            ? handleEdit
            : null
        }
        onDeactivate={
          can("employee.manage")
            ? () =>
                setShowDeactivate(
                  true
                )
            : null
        }
      />

      {/* =====================================
          Information
      ====================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <PersonalSection
          employee={employee}
        />

        <EmploymentSection
          employee={employee}
        />

        <SalarySection
          employee={employee}
        />

        <BankSection
          employee={employee}
          canSync={
            can("company.manage") ||
            can("employee.manage")
          }
          onSynced={handleChanged}
        />

        <AddressSection
          employee={employee}
        />

        <DocumentsSection
          employee={employee}
        />

        <AccessSection
          employee={employee}
          onChanged={handleChanged}
        />
      </div>

      {/* =====================================
          Deactivate Dialog
      ====================================== */}

      <DeactivateEmployeeDialog
        employee={employee}
        open={showDeactivate}
        onClose={() =>
          setShowDeactivate(false)
        }
        onSuccess={
          handleChanged
        }
      />
    </div>
  );
}