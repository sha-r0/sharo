"use client";

import {
  Users,
  UserCheck,
  UserX,
} from "lucide-react";

const cards = [
  {
    key: "total",
    title: "Total Employees",
    subtitle: "All employee records",
    icon: Users,
    color: "blue",
  },
  {
    key: "active",
    title: "Active",
    subtitle: "Currently active",
    icon: UserCheck,
    color: "green",
  },
  {
    key: "inactive",
    title: "Inactive",
    subtitle: "Deactivated employees",
    icon: UserX,
    color: "red",
  },
];

const colors = {
  blue: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    border: "border-blue-100",
    value: "text-blue-700",
  },

  green: {
    bg: "bg-emerald-50",
    icon: "text-emerald-600",
    border: "border-emerald-100",
    value: "text-emerald-700",
  },

  red: {
    bg: "bg-red-50",
    icon: "text-red-600",
    border: "border-red-100",
    value: "text-red-700",
  },
};

function normalizeStatus(employee) {
  /*
   * employeeService already maps status,
   * but keep fallbacks here so stats remain
   * accurate if a raw employee object is
   * passed from another screen later.
   */

  const value =
    employee?.status ??
    employee?.access?.status ??
    employee?.employment?.status ??
    "";

  return String(value)
    .trim()
    .toLowerCase();
}

export default function EmployeeStats({
  employees = [],
}) {
  const safeEmployees =
    Array.isArray(employees)
      ? employees
      : [];

  let active = 0;
  let inactive = 0;

  for (const employee of safeEmployees) {
    const employeeStatus =
      normalizeStatus(employee);

    if (employeeStatus === "active") {
      active += 1;
    }

    if (employeeStatus === "inactive") {
      inactive += 1;
    }
  }

  const stats = {
    total: safeEmployees.length,
    active,
    inactive,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        const style =
          colors[card.color];

        return (
          <div
            key={card.key}
            className={`
              group
              rounded-3xl
              border
              ${style.border}
              bg-white
              p-5
              shadow-sm
              transition
              duration-200
              hover:-translate-y-0.5
              hover:shadow-md
            `}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-500">
                  {card.title}
                </p>

                <div className="mt-2 flex items-end gap-2">
                  <h2
                    className={`
                      text-4xl
                      font-bold
                      tracking-tight
                      ${style.value}
                    `}
                  >
                    {stats[card.key]}
                  </h2>

                  {card.key !==
                    "total" &&
                    stats.total > 0 && (
                      <span className="mb-1 text-xs font-semibold text-slate-400">
                        {Math.round(
                          (stats[
                            card.key
                          ] /
                            stats.total) *
                            100
                        )}
                        %
                      </span>
                    )}
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  {card.subtitle}
                </p>
              </div>

              <div
                className={`
                  grid
                  h-14
                  w-14
                  shrink-0
                  place-items-center
                  rounded-2xl
                  ${style.bg}
                `}
              >
                <Icon
                  size={25}
                  strokeWidth={2}
                  className={
                    style.icon
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}