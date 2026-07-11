"use client";

import {
  CalendarDays,
  Users,
  FolderKanban,
  Shapes,
  Download,
} from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ExpenseFilters({
  fromDate,
  toDate,

  setFromDate,
  setToDate,

  employeeFilter,
  setEmployeeFilter,

  projectFilter,
  setProjectFilter,

  categoryFilter,
  setCategoryFilter,

  employees,
  projects,
  categories,

  onExport,
}) {
  return (
    <div
      className={`mb-8`}
    >
      <div className="grid xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">

        {/* From Date */}

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <CalendarDays size={16} />
            From Date
          </label>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3 outline-none`}
          />
        </div>

        {/* To Date */}

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <CalendarDays size={16} />
            To Date
          </label>

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3 outline-none`}
          />
        </div>

        {/* Employee */}

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Users size={16} />
            Employee
          </label>

          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3 outline-none`}
          >
            <option value="">All Employees</option>

            {employees.map((employee) => (
              <option
                key={employee.id}
                value={employee.employeeId}
              >
                {employee.fullName}
              </option>
            ))}
          </select>
        </div>

        {/* Project */}

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <FolderKanban size={16} />
            Project
          </label>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3 outline-none`}
          >
            <option value="">All Projects</option>

            {projects.map((project) => (
              <option key={project.id} value={project.name}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}

        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-500">
            <Shapes size={16} />
            Category
          </label>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3 outline-none`}
          >
            <option value="">All Categories</option>

            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {/* Export */}

        <div className="flex items-end">

          <button
            onClick={onExport}
            className={`${neoShadow} flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-emerald-600`}
          >
            <Download size={18} />
            Export Excel
          </button>

        </div>

      </div>
    </div>
  );
}