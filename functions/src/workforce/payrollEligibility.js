"use strict";

// User Management writes employment.status (Active, Inactive, Notice Period,
// Terminated). Legacy records may use status. access.status/loginEnabled/authUid
// describe sign-in access, not whether an employee belongs in payroll.
function isPayrollEmployee(employee) {
  const employmentStatus = String(employee.employment?.status ?? "").trim();
  const status = (employmentStatus || String(employee.status ?? "").trim() || "Active")
    .toLowerCase().replace(/[ _-]/g, "");
  return !["inactive", "terminated"].includes(status);
}

module.exports = { isPayrollEmployee };
