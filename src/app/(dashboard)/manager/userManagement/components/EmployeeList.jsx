"use client";

import EmployeeCard from "./EmployeeCard";

function EmployeeSkeleton() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 animate-pulse rounded-2xl bg-slate-100" />

        <div className="min-w-0 flex-1">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />

          <div className="mt-3 h-3 w-56 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="h-9 w-20 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function EmployeeList({
  employees = [],
  loading = false,
}) {
  const safeEmployees =
    Array.isArray(employees)
      ? employees
      : [];

  /* ==========================================
      Loading State
  ========================================== */

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({
          length: 5,
        }).map((_, index) => (
          <EmployeeSkeleton
            key={index}
          />
        ))}
      </div>
    );
  }

  /* ==========================================
      Empty State
  ========================================== */

  if (!safeEmployees.length) {
    return (
      <div
        className="
          rounded-3xl
          border
          border-slate-200
          bg-white
          py-20
          text-center
          shadow-sm
        "
      >
        <div
          className="
            mx-auto
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-slate-50
            text-2xl
          "
        >
          👥
        </div>

        <h2 className="mt-4 text-xl font-bold text-slate-800">
          No Employees Found
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Try changing your search or
          filters, or add a new
          employee.
        </p>
      </div>
    );
  }

  /* ==========================================
      Employee List
  ========================================== */

  return (
    <div className="space-y-3">
      {safeEmployees.map(
        (employee, index) => {
          const employeeKey =
            employee?.firestoreId ||
            employee?.id ||
            employee?.employeeId ||
            `employee-${index}`;

          return (
            <EmployeeCard
              key={employeeKey}
              employee={employee}
            />
          );
        }
      )}
    </div>
  );
}