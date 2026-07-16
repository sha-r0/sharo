"use strict";

const value = (data, ...keys) => keys.map((key) => data?.[key]).find((item) => item !== undefined && item !== null && item !== "");
const employee = (data) => value(data, "employeeName", "fullName", "name") || "An employee";
const project = (data) => value(data, "projectName", "name") || "Project";
const money = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const templates = {
  "leave.applied": (d) => ({ title: "New leave request", body: `${employee(d)} applied for ${value(d, "leaveType", "type") || "leave"}.`, priority: "high" }),
  "leave.approved": (d) => ({ title: "Leave approved", body: `Your ${value(d, "leaveType", "type") || "leave"}${d.fromDate ? ` from ${d.fromDate}${d.toDate ? ` to ${d.toDate}` : ""}` : ""} has been approved.`, priority: "medium" }),
  "leave.rejected": () => ({ title: "Leave rejected", body: "Your leave request was rejected.", priority: "high" }),
  "expense.submitted": (d) => ({ title: "Expense submitted", body: `${employee(d)} submitted an expense${value(d, "amount", "totalAmount") ? ` for ${money(value(d, "amount", "totalAmount"))}` : ""}.`, priority: "high" }),
  "expense.approved": (d) => ({ title: "Expense approved", body: `Your expense${d.amount ? ` of ${money(d.amount)}` : ""} was approved.`, priority: "medium" }),
  "expense.rejected": () => ({ title: "Expense rejected", body: "Your expense was rejected.", priority: "high" }),
  "advance.requested": (d) => ({ title: "Advance requested", body: `${employee(d)} requested an advance${d.amount ? ` of ${money(d.amount)}` : ""}.`, priority: "high" }),
  "advance.approved": (d) => ({ title: "Advance approved", body: `Your advance${d.amount ? ` of ${money(d.amount)}` : ""} was approved.`, priority: "medium" }),
  "advance.rejected": () => ({ title: "Advance rejected", body: "Your advance request was rejected.", priority: "high" }),
  "attendance.check-in": (d) => ({ title: "Employee checked in", body: `${employee(d)} checked in.`, priority: "low" }),
  "attendance.check-out": (d) => ({ title: "Employee checked out", body: `${employee(d)} checked out.`, priority: "low" }),
  "attendance.late": (d) => ({ title: "Late attendance", body: `${employee(d)} checked in late.`, priority: "high" }),
  "attendance.missing": (d) => ({ title: "Missing attendance", body: `${employee(d)} has no attendance record today.`, priority: "high" }),
  "attendance.missing-punch": (d) => ({ title: "Missing checkout punch", body: `${employee(d)} checked in but did not check out.`, priority: "high" }),
  "gps.outside-radius": (d) => ({ title: "GPS outside radius", body: `${employee(d)} punched outside the permitted radius.`, priority: "critical" }),
  "project.assigned": (d) => ({ title: "Assigned to project", body: `You were assigned to ${project(d)}.`, priority: "medium" }),
  "project.removed": (d) => ({ title: "Removed from project", body: `You were removed from ${project(d)}.`, priority: "medium" }),
  "project.delayed": (d) => ({ title: "Project delayed", body: `${project(d)} is delayed.`, priority: "critical" }),
  "project.completed": (d) => ({ title: "Project completed", body: `${project(d)} was completed.`, priority: "medium" }),
  "project.budget-exceeded": (d) => ({ title: "Project budget exceeded", body: `${project(d)} has exceeded its budget.`, priority: "critical" }),
  "project.loss-predicted": (d) => ({ title: "Project loss warning", body: `${project(d)} is currently projected to make a loss.`, priority: "critical" }),
  "project.payment-overdue": (d) => ({ title: "Project payment overdue", body: `${project(d)} has an overdue payment.`, priority: "high" }),
  "work.started": (d) => ({ title: "Work started", body: `${employee(d)} started work.`, priority: "low" }),
  "work.completed": (d) => ({ title: "Work completed", body: `${employee(d)} completed work.`, priority: "low" }),
  "work.missing": (d) => ({ title: "No work log today", body: `${employee(d)} has no work log today.`, priority: "medium" }),
  "work.low-productivity": (d) => ({ title: "Low productivity", body: `${employee(d)} has low productivity.`, priority: "high" }),
  "payroll.processed": (d) => ({ title: "Salary processed", body: `Your salary${d.month ? ` for ${d.month}` : ""} has been processed.`, priority: "medium" }),
  "payroll.failed": (d) => ({ title: "Salary processing failed", body: `Salary processing failed for ${employee(d)}.`, priority: "critical" }),
  "announcement.created": (d) => ({ title: d.title || "Company announcement", body: d.message || d.description || "A new announcement was published.", priority: d.priority || "high" }),
  "billing.project-ready": (d) => ({ title: "Project ready for billing", body: `${project(d)} is completed and ready to invoice.`, priority: "high" }),
  "invoice.generated": (d) => ({ title: "Invoice generated", body: `${d.invoiceNumber || "An invoice"} was generated for ${d.clientName || "a client"}.`, priority: "medium" }),
  "invoice.sent": (d) => ({ title: "Invoice sent", body: `${d.invoiceNumber || "An invoice"} was sent to ${d.clientName || "the client"}.`, priority: "medium" }),
  "invoice.overdue": (d) => ({ title: "Invoice overdue", body: `${d.invoiceNumber || "An invoice"} has an overdue balance of ${money(d.pendingAmount || d.receivable)}.`, priority: "critical" }),
  "invoice.outstanding": (d) => ({ title: "Large outstanding amount", body: `${d.invoiceNumber || "An invoice"} has an outstanding balance of ${money(d.pendingAmount || d.receivable)}.`, priority: "high" }),
  "payment.received": (d) => ({ title: "Payment received", body: `${money(d.amount)} was received from ${d.clientName || "a client"}.`, priority: "medium" }),
};

function renderTemplate(type, data = {}) {
  const factory = templates[type];
  if (!factory) throw new Error(`Unsupported notification template: ${type}`);
  return factory(data);
}

module.exports = { renderTemplate, templates };
