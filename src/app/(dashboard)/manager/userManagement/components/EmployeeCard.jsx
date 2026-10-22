"use client";

import { useRouter } from "next/navigation";

import {
  ChevronRight,
  Phone,
  Briefcase,
  Building2,
  BadgeCheck,
  UserX,
  Clock3,
} from "lucide-react";

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getStatusConfig(status) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "active") {
    return {
      label: "Active",
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-100",
      icon: BadgeCheck,
    };
  }

  if (normalized === "inactive") {
    return {
      label: "Inactive",
      className:
        "bg-red-50 text-red-700 border-red-100",
      icon: UserX,
    };
  }

  if (
    normalized === "leave" ||
    normalized === "on leave"
  ) {
    return {
      label: "On Leave",
      className:
        "bg-amber-50 text-amber-700 border-amber-100",
      icon: Clock3,
    };
  }

  return {
    label:
      status || "Unknown",
    className:
      "bg-slate-50 text-slate-600 border-slate-200",
    icon: BadgeCheck,
  };
}

function valueOrDash(value) {
  const normalized =
    String(value || "").trim();

  return normalized || "—";
}

export default function EmployeeCard({
  employee,
}) {
  const router = useRouter();

  const firestoreId =
    employee?.firestoreId ||
    employee?.id ||
    "";

  const fullName =
    valueOrDash(
      employee?.fullName
    );

  const employeeId =
    valueOrDash(
      employee?.employeeId
    );

  const phone =
    valueOrDash(
      employee?.phone
    );

  const department =
    valueOrDash(
      employee?.department
    );

  const designation =
    valueOrDash(
      employee?.designation
    );

  const status =
    getStatusConfig(
      employee?.status
    );

  const StatusIcon =
    status.icon;

  function openEmployee() {
    if (!firestoreId) {
      console.warn(
        "[EmployeeCard] Missing employee Firestore ID",
        {
          employeeId:
            employee?.employeeId,
        }
      );

      return;
    }

    router.push(
      `/manager/userManagement/${firestoreId}`
    );
  }

  return (
    <button
      type="button"
      onClick={openEmployee}
      disabled={!firestoreId}
      className="
        group
        w-full
        rounded-3xl
        border
        border-slate-200
        bg-white
        px-5
        py-5
        text-left
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:border-blue-200
        hover:shadow-md
        disabled:cursor-default
        disabled:opacity-70
        sm:px-6
      "
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">

          {/* Avatar */}
          {employee?.photoUrl ? (
            <img
              src={employee.photoUrl}
              alt={fullName}
              loading="lazy"
              className="
                h-14
                w-14
                shrink-0
                rounded-2xl
                border
                border-slate-200
                object-cover
                sm:h-16
                sm:w-16
              "
            />
          ) : (
            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-gradient-to-br
                from-blue-600
                to-blue-700
                text-lg
                font-bold
                text-white
                shadow-sm
                sm:h-16
                sm:w-16
                sm:text-xl
              "
            >
              {fullName !== "—"
                ? fullName
                    .charAt(0)
                    .toUpperCase()
                : "E"}
            </div>
          )}

          {/* Identity */}
          <div className="min-w-0">
            <h3
              className="
                truncate
                text-base
                font-bold
                text-slate-800
                sm:text-lg
              "
            >
              {fullName}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Employee ID •{" "}
              <span className="font-medium text-slate-600">
                {employeeId}
              </span>
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Phone
                size={14}
                className="shrink-0 text-slate-400"
              />

              <span className="truncate text-sm text-slate-600">
                {phone}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div className="grid flex-1 grid-cols-2 gap-4 lg:max-w-xl lg:gap-10">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Department
            </p>

            <div className="mt-2 flex min-w-0 items-center gap-2">
              <Building2
                size={16}
                className="shrink-0 text-blue-600"
              />

              <span className="truncate text-sm font-semibold text-slate-700">
                {department}
              </span>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Designation
            </p>

            <div className="mt-2 flex min-w-0 items-center gap-2">
              <Briefcase
                size={16}
                className="shrink-0 text-blue-600"
              />

              <span className="truncate text-sm font-semibold text-slate-700">
                {designation}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center justify-between gap-4 lg:justify-end">
          <span
            className={`
              inline-flex
              items-center
              gap-2
              rounded-full
              border
              px-3
              py-1.5
              text-xs
              font-bold
              ${status.className}
            `}
          >
            <StatusIcon
              size={14}
            />

            {status.label}
          </span>

          <div
            className="
              grid
              h-9
              w-9
              place-items-center
              rounded-xl
              bg-slate-50
              text-slate-400
              transition
              group-hover:bg-blue-50
              group-hover:text-blue-600
            "
          >
            <ChevronRight
              size={18}
            />
          </div>
        </div>
      </div>
    </button>
  );
}