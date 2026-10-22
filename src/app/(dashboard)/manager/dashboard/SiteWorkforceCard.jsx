"use client";

import { useRef } from "react";
import Link from "next/link";

import {
  ChevronRight,
  MapPin,
  UserRound,
} from "lucide-react";

import { neo } from "./DashboardWidgets";

const COLORS = {
  checkedIn: "#22c55e",
  notReached: "#3b82f6",
  late: "#fbbf24",
};

function buildDonutGradient({
  checkedIn,
  notReached,
  late,
  total,
}) {
  if (!total) {
    return "#e2e8f0";
  }

  const checkedInEnd =
    (checkedIn / total) * 100;

  const notReachedEnd =
    checkedInEnd +
    (notReached / total) * 100;

  return `
    conic-gradient(
      ${COLORS.checkedIn} 0% ${checkedInEnd}%,
      ${COLORS.notReached} ${checkedInEnd}% ${notReachedEnd}%,
      ${COLORS.late} ${notReachedEnd}% 100%
    )
  `;
}

function LegendRow({
  color,
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between gap-5">
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{
            backgroundColor: color,
          }}
        />

        <span className="text-sm font-medium text-slate-500">
          {label}
        </span>
      </div>

      <strong className="text-sm font-bold text-slate-800">
        {value}
      </strong>
    </div>
  );
}

function NotReachedEmployee({
  employee,
}) {
  const name =
    employee?.employeeName ||
    employee?.fullName ||
    employee?.name ||
    "Employee";

  const siteName =
    employee?.siteName ||
    employee?.site?.name ||
    "Assigned Site";

  return (
    <Link
      href="/manager/Workforce/site-assignments"
      className="
        group
        flex
        w-[200px]
        shrink-0
        items-center
        gap-2.5
        rounded-2xl
        border
        border-slate-100
        bg-slate-50
        px-3
        py-2.5
        transition
        hover:border-blue-100
        hover:bg-blue-50/40
      "
    >
      {/* AVATAR */}
      <div
        className="
          grid
          h-9
          w-9
          shrink-0
          place-items-center
          rounded-full
          bg-blue-50
          text-blue-600
        "
      >
        <UserRound
          size={17}
          strokeWidth={2}
        />
      </div>

      {/* EMPLOYEE */}
      <div className="min-w-0 flex-1">
        <p
          className="
            truncate
            text-sm
            font-semibold
            text-slate-700
          "
        >
          {name}
        </p>

        <div
          className="
            mt-0.5
            flex
            items-center
            gap-1
            text-[11px]
            text-slate-400
          "
        >
          <MapPin size={10} />

          <span className="truncate">
            {siteName}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function SiteWorkforceCard({
  assigned = 0,
  checkedIn = 0,
  notReached = 0,
  late = 0,
  notReachedEmployees = [],
}) {
  const employeeScrollRef =
    useRef(null);

  const total =
    Number(assigned || 0);

  const safeCheckedIn =
    Number(checkedIn || 0);

  const safeNotReached =
    Number(notReached || 0);

  const safeLate =
    Number(late || 0);

  const safeEmployees =
    Array.isArray(notReachedEmployees)
      ? notReachedEmployees
      : [];

  const donutBackground =
    buildDonutGradient({
      checkedIn: safeCheckedIn,
      notReached: safeNotReached,
      late: safeLate,
      total,
    });

  const scrollEmployeesForward = () => {
    employeeScrollRef.current?.scrollBy({
      left: 220,
      behavior: "smooth",
    });
  };

  return (
    <section
      className={`
        ${neo}
        h-fit
        self-start
        rounded-3xl
        bg-white
        p-4
        sm:p-5
      `}
    >
      {/* HEADER */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-800">
          Site Workforce
        </h2>

        <Link
          href="/manager/Workforce/site-assignments"
          className="
            shrink-0
            text-xs
            font-bold
            text-blue-600
            transition
            hover:text-blue-700
          "
        >
          View Details
        </Link>
      </div>

      {/* CHART AREA */}
      <div
        className="
          flex
          flex-col
          items-center
          gap-5
          sm:flex-row
          sm:justify-between
        "
      >
        {/* DONUT */}
        <div className="flex flex-1 justify-center sm:justify-start">
          <div
            className="
              relative
              h-32
              w-32
              shrink-0
              rounded-full
            "
            style={{
              background:
                donutBackground,
            }}
          >
            <div
              className="
                absolute
                inset-[20px]
                grid
                place-items-center
                rounded-full
                bg-white
                text-center
                shadow-inner
              "
            >
              <div>
                <p
                  className="
                    text-2xl
                    font-bold
                    leading-none
                    text-slate-900
                  "
                >
                  {total}
                </p>

                <p
                  className="
                    mt-1
                    text-xs
                    font-medium
                    text-slate-500
                  "
                >
                  Assigned
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LEGEND */}
        <div className="w-full flex-1 space-y-3">
          <LegendRow
            color={COLORS.checkedIn}
            label="Checked In"
            value={safeCheckedIn}
          />

          <LegendRow
            color={COLORS.notReached}
            label="Not Reached"
            value={safeNotReached}
          />

          <LegendRow
            color={COLORS.late}
            label="Late"
            value={safeLate}
          />
        </div>
      </div>

      {/* NOT REACHED EMPLOYEES */}
      {safeEmployees.length > 0 && (
        <div
          className="
            mt-4
            border-t
            border-slate-100
            pt-3
          "
        >
          {/* TITLE */}
          <div
            className="
              mb-3
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <div className="flex items-center gap-2">
              <p
                className="
                  text-sm
                  font-bold
                  text-slate-700
                "
              >
                Not Reached Site
              </p>

              <span
                className="
                  rounded-full
                  bg-blue-50
                  px-2
                  py-0.5
                  text-[11px]
                  font-bold
                  text-blue-600
                "
              >
                {safeEmployees.length}
              </span>
            </div>

            {/* FORWARD ARROW */}
            {safeEmployees.length > 1 && (
              <button
                type="button"
                onClick={
                  scrollEmployeesForward
                }
                aria-label="Show more employees"
                className="
                  grid
                  h-8
                  w-8
                  shrink-0
                  place-items-center
                  rounded-full
                  border
                  border-slate-200
                  bg-white
                  text-slate-500
                  transition
                  hover:border-blue-200
                  hover:bg-blue-50
                  hover:text-blue-600
                "
              >
                <ChevronRight
                  size={17}
                />
              </button>
            )}
          </div>

          {/* HORIZONTAL LIST */}
          <div
            ref={employeeScrollRef}
            className="
              flex
              gap-2
              overflow-x-auto
              scroll-smooth
              pb-1
              [scrollbar-width:none]
              [&::-webkit-scrollbar]:hidden
            "
          >
            {safeEmployees.map(
              (
                employee,
                index
              ) => (
                <NotReachedEmployee
                  key={
                    employee.employeeFirestoreId ||
                    employee.employeeId ||
                    employee.id ||
                    `${employee.employeeName}-${index}`
                  }
                  employee={
                    employee
                  }
                />
              )
            )}
          </div>
        </div>
      )}

      {/* NO ASSIGNMENTS */}
      {total === 0 && (
        <div
          className="
            mt-4
            rounded-2xl
            bg-slate-50
            px-4
            py-3
            text-center
            text-sm
            font-medium
            text-slate-500
          "
        >
          No site assignments for today.
        </div>
      )}

      {/* EVERYONE REACHED */}
      {total > 0 &&
        safeNotReached === 0 &&
        safeEmployees.length === 0 && (
          <div
            className="
              mt-4
              rounded-2xl
              bg-emerald-50
              px-4
              py-3
              text-center
              text-sm
              font-semibold
              text-emerald-700
            "
          >
            All assigned employees have reached their site.
          </div>
        )}
    </section>
  );
}