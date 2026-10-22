"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import employeeService from "@/app/allservice/employee/employeeService";

import EmployeeStats from "./components/EmployeeStats";
import EmployeeToolbar from "./components/EmployeeToolbar";
import EmployeeList from "./components/EmployeeList";
import RoleManagement from "./components/RoleManagement";

export default function EmployeePage() {
  const { company } = useAuth();

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [employees, setEmployees] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [role, setRole] =
    useState("All");

  const [status, setStatus] =
    useState("All");

  const [view, setView] =
    useState("employees");

  /* ==========================================
      Initial Employee Load

      Normal page loads use the repository's
      5-minute collection cache.
  ========================================== */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!company?.id) {
        if (!cancelled) {
          setEmployees([]);
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);

        const data =
          await employeeService.getEmployees(
            company.id
          );

        if (!cancelled) {
          setEmployees(
            Array.isArray(data)
              ? data
              : []
          );
        }
      } catch (error) {
        console.error(
          "[EmployeeDirectory] Unable to load employees",
          {
            operation:
              "getEmployees",

            path:
              `Companies/${company.id}/Usermanagement`,

            code:
              error?.code ||
              error?.message ||
              "unknown",
          }
        );

        if (!cancelled) {
          toast.error(
            "Unable to load employees."
          );
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
  }, [company?.id]);

  /* ==========================================
      Manual Refresh

      This bypasses the 5-minute cache only
      when the user explicitly requests it.
  ========================================== */

  async function refreshEmployees() {
    if (
      !company?.id ||
      refreshing
    ) {
      return;
    }

    try {
      setRefreshing(true);

      const data =
        await employeeService.getEmployees(
          company.id,
          {
            force: true,
          }
        );

      setEmployees(
        Array.isArray(data)
          ? data
          : []
      );

      toast.success(
        "Employee directory refreshed."
      );
    } catch (error) {
      console.error(
        "[EmployeeDirectory] Refresh failed",
        {
          operation:
            "forceRefreshEmployees",

          path:
            `Companies/${company.id}/Usermanagement`,

          code:
            error?.code ||
            error?.message ||
            "unknown",
        }
      );

      toast.error(
        "Unable to refresh employees."
      );
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================
      Role Options

      Uses already-loaded employee data.
      No Firestore reads.
  ========================================== */

  const roles = useMemo(() => {
    const values =
      employees
        .map((employee) =>
          String(
            employee?.role || ""
          ).trim()
        )
        .filter(Boolean);

    return [
      ...new Set(values),
    ].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [employees]);

  /* ==========================================
      Search / Filters / Sorting

      Entirely client-side.
      No Firestore reads.
  ========================================== */

  const filteredEmployees =
    useMemo(() => {
      const keyword =
        String(search || "")
          .trim()
          .toLowerCase();

      const selectedRole =
        String(role || "All")
          .trim()
          .toLowerCase();

      const selectedStatus =
        String(status || "All")
          .trim()
          .toLowerCase();

      return employees
        .filter((employee) => {
          const fullName =
            String(
              employee?.fullName ||
                ""
            ).toLowerCase();

          const employeeId =
            String(
              employee?.employeeId ||
                ""
            ).toLowerCase();

          const email =
            String(
              employee?.email ||
                ""
            ).toLowerCase();

          const phone =
            String(
              employee?.phone ||
                ""
            ).toLowerCase();

          const employeeRole =
            String(
              employee?.role ||
                ""
            )
              .trim()
              .toLowerCase();

          const employeeStatus =
            String(
              employee?.status ||
                ""
            )
              .trim()
              .toLowerCase();

          const matchesSearch =
            !keyword ||
            fullName.includes(
              keyword
            ) ||
            employeeId.includes(
              keyword
            ) ||
            email.includes(
              keyword
            ) ||
            phone.includes(
              keyword
            );

          const matchesRole =
            selectedRole ===
              "all" ||
            employeeRole ===
              selectedRole;

          const matchesStatus =
            selectedStatus ===
              "all" ||
            employeeStatus ===
              selectedStatus;

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        })
        .sort((a, b) => {
          const aEmployeeId =
            String(
              a?.employeeId ?? ""
            ).trim();

          const bEmployeeId =
            String(
              b?.employeeId ?? ""
            ).trim();

          const aIsNumeric =
            /^\d+$/.test(
              aEmployeeId
            );

          const bIsNumeric =
            /^\d+$/.test(
              bEmployeeId
            );

          if (
            aIsNumeric &&
            bIsNumeric
          ) {
            return (
              Number(aEmployeeId) -
              Number(bEmployeeId)
            );
          }

          if (aIsNumeric) {
            return -1;
          }

          if (bIsNumeric) {
            return 1;
          }

          return aEmployeeId.localeCompare(
            bEmployeeId,
            undefined,
            {
              numeric: true,
              sensitivity: "base",
            }
          );
        });
    }, [
      employees,
      search,
      role,
      status,
    ]);

  return (
    <div className="space-y-6">
      {/* =====================================
          Header
      ====================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Employees
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your company&apos;s
            workforce
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Refresh only matters for employee view */}

          {view ===
            "employees" && (
            <button
              type="button"
              onClick={
                refreshEmployees
              }
              disabled={
                refreshing ||
                loading ||
                !company?.id
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3.5
                text-sm
                font-semibold
                text-slate-600
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={16}
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
          )}

          {/* View selector */}

          <div className="flex gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() =>
                setView(
                  "employees"
                )
              }
              className={`
                rounded-xl
                px-4
                py-2
                text-sm
                font-bold
                transition
                ${
                  view ===
                  "employees"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }
              `}
            >
              Employees
            </button>

            <button
              type="button"
              onClick={() =>
                setView("roles")
              }
              className={`
                rounded-xl
                px-4
                py-2
                text-sm
                font-bold
                transition
                ${
                  view === "roles"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }
              `}
            >
              Roles & Permissions
            </button>
          </div>
        </div>
      </div>

      {/* =====================================
          Roles
      ====================================== */}

      {view === "roles" ? (
        <RoleManagement />
      ) : (
        <>
          {/* =================================
              Stats
          ================================== */}

          <EmployeeStats
            employees={employees}
          />

          {/* =================================
              Toolbar
          ================================== */}

          <EmployeeToolbar
            search={search}
            setSearch={setSearch}
            role={role}
            setRole={setRole}
            status={status}
            setStatus={setStatus}
            roles={roles}
          />

          {/* =================================
              Employee Count
          ================================== */}

          {!loading && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-medium text-slate-400">
                Showing{" "}
                <span className="font-bold text-slate-600">
                  {
                    filteredEmployees.length
                  }
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-600">
                  {employees.length}
                </span>{" "}
                employees
              </p>

              {(search ||
                role !== "All" ||
                status !==
                  "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setRole("All");
                    setStatus(
                      "All"
                    );
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* =================================
              Employee List
          ================================== */}

          <EmployeeList
            loading={loading}
            employees={
              filteredEmployees
            }
          />
        </>
      )}
    </div>
  );
}