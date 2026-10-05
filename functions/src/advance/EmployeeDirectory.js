"use strict";

function canReadEmployees(actor) {
  const role = String(actor.employee?.access?.roleId || actor.employee?.employment?.role || "employee").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return Boolean(actor.isOwner || (role !== "employee" && actor.permissions?.includes("employee.view")));
}

function activeEmployee(data) {
  // Employment activity is separate from whether an employee has app login.
  const statuses = [data.employment?.status, data.status, data.access?.status].filter(Boolean);
  return data.isActive !== false && statuses.every((value) => ["active", "enabled"].includes(String(value).trim().toLowerCase()));
}

async function listEmployees(companyRef, actor) {
  if (!canReadEmployees(actor)) return [];
  const snapshot = await companyRef.collection("Usermanagement").get();
  return snapshot.docs.filter((doc) => activeEmployee(doc.data())).map((doc) => {
    const data = doc.data();
    return { id: doc.id, employeeFirestoreId: doc.id, employeeId: String(data.employeeId || data.login?.employeeId || ""),
      fullName: data.personalInfo?.fullName || data.fullName || data.name || "Unnamed employee",
      dob: data.personalInfo?.dob || data.dob || data.dateOfBirth || null, joiningDate: data.employment?.joiningDate || data.joiningDate || data.joinDate || null, createdAt: data.createdAt || null,
      department: data.employment?.department || data.department || "", designation: data.employment?.designation || data.designation || "" };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));
}
module.exports = { canReadEmployees, activeEmployee, listEmployees };
