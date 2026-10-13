"use strict";

// Sort by business ID only. Keep original rows/leading zeros, and input order
// for equal IDs. Numeric strings are compared exactly, even beyond JS integers.
function sortPayrollEmployees(rows) {
  return rows.map((row, index) => ({ row, index, id: String(row.employeeId ?? "").trim() }))
    .sort((a, b) => {
      const aNumeric = /^\d+$/.test(a.id), bNumeric = /^\d+$/.test(b.id);
      if (aNumeric && bNumeric) {
        const left = BigInt(a.id), right = BigInt(b.id);
        return left < right ? -1 : left > right ? 1 : a.index - b.index;
      }
      if (aNumeric !== bNumeric) return aNumeric ? -1 : 1;
      if (!a.id !== !b.id) return a.id ? -1 : 1;
      return a.id.localeCompare(b.id, "en", { sensitivity: "base" }) || a.index - b.index;
    }).map(({ row }) => row);
}

module.exports = { sortPayrollEmployees };
