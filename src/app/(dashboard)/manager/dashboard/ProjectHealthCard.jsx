"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FolderKanban,
  PlayCircle,
} from "lucide-react";

import { neo } from "./DashboardWidgets";

const lower = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function getProgress(project) {
  const value =
    project?.progress ??
    project?.completionPercentage ??
    project?.progressPercentage ??
    0;

  return Math.max(
    0,
    Math.min(100, Number(value) || 0)
  );
}

function getProjectStatus(project) {
  const status = lower(
    project?.status ||
      project?.projectStatus
  );

  const progress =
    getProgress(project);

  const completed =
    ["completed", "done", "closed"].includes(status) ||
    progress >= 100;

  if (completed) {
    return {
      label: "Completed",
      badge:
        "bg-emerald-50 text-emerald-700",
      bar: "bg-emerald-500",
      priority: 4,
    };
  }

  const endDate =
    project?.endDate ||
    project?.deadline ||
    project?.dueDate;

  const deadline =
    endDate?.toDate
      ? endDate.toDate()
      : endDate
        ? new Date(endDate)
        : null;

  const overdue =
    project?.overdue === true ||
    ["delayed", "overdue"].includes(status) ||
    (deadline &&
      !Number.isNaN(deadline.getTime()) &&
      deadline <
        new Date(
          new Date().getFullYear(),
          new Date().getMonth(),
          new Date().getDate()
        ));

  if (overdue) {
    return {
      label: "Delayed",
      badge:
        "bg-red-50 text-red-600",
      bar: "bg-red-500",
      priority: 1,
    };
  }

  if (
    [
      "running",
      "active",
      "in progress",
      "in-progress",
    ].includes(status)
  ) {
    return {
      label: "In Progress",
      badge:
        "bg-blue-50 text-blue-600",
      bar: "bg-blue-500",
      priority: 2,
    };
  }

  return {
    label: status
      ? status
          .replaceAll("_", " ")
          .replace(/\b\w/g, (char) =>
            char.toUpperCase()
          )
      : "Planning",

    badge:
      "bg-amber-50 text-amber-700",

    bar: "bg-amber-500",

    priority: 3,
  };
}

function getTimeValue(value) {
  if (!value) return 0;

  if (
    typeof value?.toDate === "function"
  ) {
    return value.toDate().getTime();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 0
    : date.getTime();
}

function ProjectRow({ project }) {
  const progress =
    getProgress(project);

  const status =
    getProjectStatus(project);

  const projectName =
    project?.projectName ||
    project?.name ||
    "Unnamed Project";

  const clientName =
    project?.clientName ||
    project?.client?.name ||
    project?.siteName ||
    "Project";

  return (
    <Link
      href={`/manager/projects/${project.id}`}
      className="
        group
        grid
        grid-cols-[minmax(0,1fr)_100px_110px_20px]
        items-center
        gap-4
        rounded-2xl
        px-3
        py-3
        transition
        hover:bg-slate-50
      "
    >
      {/* PROJECT */}
      <div className="min-w-0">
        <p
          className="
            truncate
            text-sm
            font-semibold
            text-slate-800
          "
        >
          {projectName}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-xs
            text-slate-400
          "
        >
          {clientName}
        </p>
      </div>

      {/* PROGRESS */}
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700">
            {Math.round(progress)}%
          </span>
        </div>

        <div
          className="
            h-1.5
            overflow-hidden
            rounded-full
            bg-slate-100
          "
        >
          <div
            className={`
              h-full
              rounded-full
              transition-all
              duration-500
              ${status.bar}
            `}
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* STATUS */}
      <span
        className={`
          justify-self-start
          whitespace-nowrap
          rounded-full
          px-2.5
          py-1
          text-[10px]
          font-bold
          ${status.badge}
        `}
      >
        {status.label}
      </span>

      <ChevronRight
        size={16}
        className="
          text-slate-300
          transition
          group-hover:translate-x-0.5
          group-hover:text-blue-600
        "
      />
    </Link>
  );
}

export default function ProjectHealthCard({
  projects = [],
}) {
  const safeProjects =
    Array.isArray(projects)
      ? projects
      : [];

  const analysed =
    safeProjects.map((project) => ({
      ...project,
      _status:
        getProjectStatus(project),
    }));

  const activeCount =
    analysed.filter((project) =>
      [
        "running",
        "active",
        "in progress",
        "in-progress",
      ].includes(
        lower(
          project.status ||
            project.projectStatus
        )
      )
    ).length;

  const completedCount =
    analysed.filter(
      (project) =>
        project._status.label ===
        "Completed"
    ).length;

  const delayedCount =
    analysed.filter(
      (project) =>
        project._status.label ===
        "Delayed"
    ).length;

  /*
   * Priority:
   * 1. Delayed
   * 2. Active/In progress
   * 3. Planning/other
   * 4. Completed
   *
   * Within the same priority,
   * show latest updated project first.
   */
  const importantProjects =
    [...analysed]
      .sort((a, b) => {
        if (
          a._status.priority !==
          b._status.priority
        ) {
          return (
            a._status.priority -
            b._status.priority
          );
        }

        return (
          getTimeValue(
            b.updatedAt ||
              b.createdAt
          ) -
          getTimeValue(
            a.updatedAt ||
              a.createdAt
          )
        );
      })
      .slice(0, 4);

  return (
    <section
      className={`
        ${neo}
        h-fit
        rounded-3xl
        bg-white
        p-4
        sm:p-5
      `}
    >
      {/* HEADER */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-4
        "
      >
        <div
          className="
            flex
            items-center
            gap-3
          "
        >
          <div
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              bg-violet-50
              text-violet-600
            "
          >
            <FolderKanban
              size={20}
              strokeWidth={2}
            />
          </div>

          <div>
            <h2
              className="
                text-lg
                font-bold
                text-slate-800
              "
            >
              Project Health
            </h2>

            <p
              className="
                text-xs
                text-slate-400
              "
            >
              Current project overview
            </p>
          </div>
        </div>

        <Link
          href="/manager/projects"
          className="
            shrink-0
            text-xs
            font-bold
            text-blue-600
            transition
            hover:text-blue-700
          "
        >
          View All
        </Link>
      </div>

      {/* SUMMARY */}
      <div
        className="
          mt-4
          grid
          grid-cols-3
          divide-x
          divide-slate-100
          rounded-2xl
          border
          border-slate-100
          bg-slate-50/70
          py-3
        "
      >
        {/* ACTIVE */}
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            px-3
          "
        >
          <PlayCircle
            size={17}
            className="text-blue-500"
          />

          <div>
            <p
              className="
                text-lg
                font-bold
                leading-none
                text-slate-800
              "
            >
              {activeCount}
            </p>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Active
            </p>
          </div>
        </div>

        {/* COMPLETED */}
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            px-3
          "
        >
          <CheckCircle2
            size={17}
            className="text-emerald-500"
          />

          <div>
            <p
              className="
                text-lg
                font-bold
                leading-none
                text-slate-800
              "
            >
              {completedCount}
            </p>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Completed
            </p>
          </div>
        </div>

        {/* DELAYED */}
        <div
          className="
            flex
            items-center
            justify-center
            gap-2
            px-3
          "
        >
          <AlertTriangle
            size={17}
            className="text-red-500"
          />

          <div>
            <p
              className="
                text-lg
                font-bold
                leading-none
                text-slate-800
              "
            >
              {delayedCount}
            </p>

            <p
              className="
                mt-1
                text-[11px]
                text-slate-500
              "
            >
              Delayed
            </p>
          </div>
        </div>
      </div>

      {/* TABLE HEADER */}
      {importantProjects.length > 0 && (
        <div
          className="
            mt-4
            grid
            grid-cols-[minmax(0,1fr)_100px_110px_20px]
            gap-4
            border-b
            border-slate-100
            px-3
            pb-2
            text-[10px]
            font-bold
            uppercase
            tracking-wider
            text-slate-400
          "
        >
          <span>Project</span>
          <span>Progress</span>
          <span>Status</span>
          <span />
        </div>
      )}

      {/* PROJECTS */}
      <div className="mt-1">
        {importantProjects.length ? (
          importantProjects.map(
            (project) => (
              <ProjectRow
                key={project.id}
                project={project}
              />
            )
          )
        ) : (
          <div
            className="
              mt-4
              rounded-2xl
              bg-slate-50
              px-4
              py-8
              text-center
            "
          >
            <FolderKanban
              size={25}
              className="
                mx-auto
                text-slate-300
              "
            />

            <p
              className="
                mt-2
                text-sm
                font-medium
                text-slate-500
              "
            >
              No projects available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}