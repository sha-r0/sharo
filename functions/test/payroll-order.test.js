"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { sortPayrollEmployees } = require("../src/workforce/payrollOrder");

test("business IDs 1 through 28 sort numerically and retain displayed padding", () => {
  const rows = Array.from({ length: 28 }, (_, index) => ({ employeeId: String(28 - index).padStart(8, "0"), id: String(index), employeeName: `Name ${index}` }));
  const sorted = sortPayrollEmployees(rows);
  assert.deepEqual(sorted.map((row) => row.employeeId), Array.from({ length: 28 }, (_, index) => String(index + 1).padStart(8, "0")));
  assert.equal(rows[0].employeeId, "00000028");
});

test("numeric ties and nonnumeric ties remain stable; missing IDs are last; large IDs remain exact", () => {
  const rows = [
    { employeeId: "A", marker: "upper" }, { employeeId: "a", marker: "lower" },
    { employeeId: "10" }, { employeeId: "0002", marker: "padded" }, { employeeId: 2, marker: "number" },
    { employeeId: "9007199254740993" }, { employeeId: "9007199254740992" }, {},
  ];
  const sorted = sortPayrollEmployees(rows);
  assert.deepEqual(sorted.map((row) => row.employeeId), ["0002", 2, "10", "9007199254740992", "9007199254740993", "A", "a", undefined]);
  assert.equal(sorted[0].marker, "padded");
  assert.equal(sorted[1].marker, "number");
});
