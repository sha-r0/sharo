"use client";
import React from "react";

export default function ExpenseFilters({
  fromDate,
  toDate,
  nameFilter,
  projectFilter,
  categoryFilter,
  setFromDate,
  setToDate,
  setNameFilter,
  setProjectFilter,
  setCategoryFilter,
  employeeList,
  projectList,
  categoryList,
  onExport,
}) {
  return (
    <div className="flex flex-wrap items-center gap-5 justify-between">

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="font-medium text-gray-600">From:</label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className=" light-date bg-[#F8F9FD] text-gray-700 border border-white rounded-lg px-3 py-2 shadow-sm focus:outline-none "
        />

        <label className="font-medium text-gray-600">To:</label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="light-date bg-[#F8F9FD] text-gray-700 border border-white rounded-lg px-3 py-2 shadow-sm focus:outline-none "
        />
      </div>

      {/* Employee Dropdown */}
      <select
        value={nameFilter}
        onChange={(e) => setNameFilter(e.target.value)}
        className="border bg-[#F8F9FD] border-white rounded-md px-3 py-2 w-40 focus:outline-none "
      >
        <option value="">All Employees</option>
        {employeeList?.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      {/* Project Dropdown */}
      <select
        value={projectFilter}
        onChange={(e) => setProjectFilter(e.target.value)}
        className="border bg-[#F8F9FD] border-white rounded-md px-3 py-2 w-60 focus:outline-none "
      >
        <option value="">All Projects</option>
        {projectList?.map((proj) => (
          <option key={proj} value={proj}>{proj}</option>
        ))}
      </select>

      {/* Category Dropdown */}
      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className="border bg-[#F8F9FD] border-white rounded-md px-3 py-2 w-40 focus:outline-none "
      >
        <option value="">All Categories</option>
        {categoryList?.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Export Button */}
      <button
        onClick={onExport}
        className="px-4 py-2 bg-[#205BF0] text-white rounded-md hover:bg-blue-700 transition"
      >
        Export to Excel
      </button>
    </div>
  );
}
