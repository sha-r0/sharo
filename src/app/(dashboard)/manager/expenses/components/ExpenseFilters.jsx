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
  periodStart, periodEnd,
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

  onExport, exporting,
  search, setSearch,
  statusFilter,
  setStatusFilter,
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
            min={periodStart}
            max={periodEnd}
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
            min={periodStart}
            max={periodEnd}
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
                value={employee.id}
              >
                {employee.name}
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
              <option key={project.id} value={project.id}>
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
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div><label className="mb-2 block text-sm font-medium text-slate-500" htmlFor="expense-status-filter">Status</label>
          <select id="expense-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={`${neoShadow} w-full rounded-2xl border border-white bg-[#F9FAFC] px-4 py-3`}>
            <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
          </select>
        </div>
        <label className="text-sm font-medium text-slate-500 lg:col-span-2">Search
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Employee, project, description or route" className={`${neoShadow} mt-2 w-full rounded-2xl bg-[#F9FAFC] px-4 py-3`} />
        </label>
        {/* Export */}

        {onExport && <div className="flex items-end">

          <button type="button" disabled={exporting}
            onClick={onExport}
            className={`${neoShadow} flex h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 disabled:opacity-60`}
          >
            <Download size={18} />
            {exporting ? "Exporting…" : "Export Expenses"}
          </button>

        </div>}

      </div>
    </div>
  );
}
