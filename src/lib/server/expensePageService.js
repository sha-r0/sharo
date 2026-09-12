import { FieldPath } from "firebase-admin/firestore";
import { requireCompanyPermission } from "./companyPermission.js";
import { summarizeExpenses } from "../expenses/dashboard.js";

export const EXPENSE_PAGE_SIZE = 30; // One reimbursement IN query; Firestore supports at most 30 values.
function optionValues(rows, field) {
  return [...new Map(rows.map((row) => {
    const id = String(row[`${field}FirestoreId`] || row[`${field}Id`] || row[`${field}Name`] || row[field] || "");
    return [id, { id, name: row[`${field}Name`] || row[field] || id }];
  })).values()].filter((item) => item.id).sort((a, b) => a.name.localeCompare(b.name));
}
function employeeScope(context) {
  const role = String(context.employee?.access?.roleId || context.employee?.employment?.role || "employee").toLowerCase();
  if (context.isOwner || role !== "employee") return null;
  const id = context.employee?.employeeId || context.employee?.login?.employeeId;
  if (!id) throw new Error("FORBIDDEN");
  return id;
}
export function expensePeriod(month) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("INVALID_PERIOD");
  const [year, number] = month.split("-").map(Number);
  if (year < 1900 || year > 9998) throw new Error("INVALID_PERIOD");
  return { start: `${month}-01`, end: `${number === 12 ? year + 1 : year}-${String(number === 12 ? 1 : number + 1).padStart(2, "0")}-01` };
}
export async function pageExpenses(db, context, month, cursor) {
  requireCompanyPermission(context, "expense.view");
  const { start, end } = expensePeriod(month);
  let source = db.collection("Companies").doc(context.companyId).collection("Expenses");
  const employeeId = employeeScope(context);
  if (employeeId) source = source.where("employeeId", "==", employeeId);
  const period = source.where("date", ">=", start).where("date", "<", end);
  let page = period.orderBy("date", "desc").orderBy(FieldPath.documentId(), "desc");
  let decoded;
  if (cursor) {
    try { decoded = JSON.parse(Buffer.from(cursor, "base64url").toString()); } catch { throw new Error("INVALID_CURSOR"); }
    if (typeof decoded.date !== "string" || decoded.date < start || decoded.date >= end || typeof decoded.id !== "string" || !/^[\w-]{1,128}$/.test(decoded.id)) throw new Error("INVALID_CURSOR");
    page = page.startAfter(decoded.date, decoded.id);
  }
  // One narrow projection keeps full-period cards accurate, including legacy policy records.
  // It avoids N full-document pages and does not introduce write-heavy summary counters.
  let snapshot, totals;
  try {
    [snapshot, totals] = await Promise.all([
      page.limit(EXPENSE_PAGE_SIZE + 1).get(),
      cursor ? null : period.orderBy("date", "desc").select("amount", "status", "allowedAmount", "employeeId", "employeeFirestoreId", "employeeName", "projectId", "projectFirestoreId", "projectName", "categoryId", "categoryName", "category").get(),
    ]);
  } catch (error) {
    if (!employeeId || ![9, "9", "failed-precondition"].includes(error.code) || !/index/i.test(error.message || "")) {
      error.path = `Companies/${context.companyId}/Expenses`; error.operation = "get"; throw error;
    }
    // Until the employee/date index is released, scan only the selected month's
    // narrow projection and return full documents only for this employee's page.
    const monthRows = await db.collection("Companies").doc(context.companyId).collection("Expenses")
      .where("date", ">=", start).where("date", "<", end).select("employeeId", "date", "amount", "status", "allowedAmount", "employeeFirestoreId", "employeeName", "projectId", "projectFirestoreId", "projectName", "categoryId", "categoryName", "category").get();
    const own = monthRows.docs.filter((doc) => doc.data().employeeId === employeeId)
      .sort((a, b) => a.data().date === b.data().date ? (a.id < b.id ? 1 : -1) : a.data().date < b.data().date ? 1 : -1);
    if (!cursor) totals = { docs: own, size: own.length };
    const remaining = decoded ? own.filter((doc) => doc.data().date < decoded.date || (doc.data().date === decoded.date && doc.id < decoded.id)) : own;
    const refs = remaining.slice(0, EXPENSE_PAGE_SIZE + 1).map((doc) => doc.ref);
    snapshot = { docs: refs.length ? (await db.getAll(...refs)).filter((doc) => doc.exists) : [] };
  }
  const docs = snapshot.docs.slice(0, EXPENSE_PAGE_SIZE);
  const last = docs.at(-1);
  return {
    // The main list does not render reimbursement data. Avoid a reimbursement
    // collection query here; detail/reimbursement actions load it on demand.
    expenses: docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    cursor: snapshot.docs.length > EXPENSE_PAGE_SIZE ? Buffer.from(JSON.stringify({ date: last.data().date, id: last.id })).toString("base64url") : null,
    ...(totals ? {
      summary: summarizeExpenses(totals.docs.map((doc) => doc.data())),
      totalCount: totals.size,
      options: {
        employees: optionValues(totals.docs.map((doc) => doc.data()), "employee"),
        projects: optionValues(totals.docs.map((doc) => doc.data()), "project"),
        categories: optionValues(totals.docs.map((doc) => doc.data()), "category"),
      },
    } : {}),
  };
}

export async function queryExpenseMatches(db, context, month, filters = {}) {
  requireCompanyPermission(context, "expense.view");
  const { start, end } = expensePeriod(month);
  let source = db.collection("Companies").doc(context.companyId).collection("Expenses");
  const employeeId = employeeScope(context);
  if (employeeId) source = source.where("employeeId", "==", employeeId);
  const snapshot = await source.where("date", ">=", start).where("date", "<", end).get();
  const fromDate = filters.fromDate && filters.fromDate >= start ? filters.fromDate : start;
  const toDate = filters.toDate && filters.toDate < end ? filters.toDate : `${end.slice(0, 7)}-01`;
  const text = String(filters.search || "").trim().toLowerCase();
  const matches = snapshot.docs.filter((doc) => {
    const expense = doc.data();
    if (expense.date < fromDate || expense.date > toDate) return false;
    if (filters.status && expense.status !== filters.status) return false;
    if (filters.employee && String(expense.employeeFirestoreId || expense.employeeId || "") !== filters.employee) return false;
    if (filters.category && String(expense.categoryId || expense.categoryName || expense.category || "") !== filters.category) return false;
    if (filters.project && String(expense.projectFirestoreId || expense.projectId || expense.projectName || "") !== filters.project) return false;
    if (!text) return true;
    return [expense.employeeName, expense.employeeId, expense.projectName, expense.projectId, expense.categoryName, expense.category, expense.description, expense.travelFrom, expense.travelTo]
      .some((value) => String(value || "").toLowerCase().includes(text));
  }).sort((a, b) => String(b.data().date).localeCompare(String(a.data().date)) || b.id.localeCompare(a.id));
  return { expenses: matches.map((doc) => ({ ...doc.data(), id: doc.id })), summary: summarizeExpenses(matches.map((doc) => doc.data())), totalCount: matches.length };
}
export async function getExpense(db, context, id) {
  requireCompanyPermission(context, "expense.view");
  if (typeof id !== "string" || !/^[\w-]{1,128}$/.test(id)) throw new Error("INVALID_REQUEST");
  const doc = await db.collection("Companies").doc(context.companyId).collection("Expenses").doc(id).get();
  if (!doc.exists) throw new Error("EXPENSE_NOT_FOUND");
  const employeeId = employeeScope(context);
  if ((doc.data().companyId && doc.data().companyId !== context.companyId) || (employeeId && doc.data().employeeId !== employeeId)) throw new Error("FORBIDDEN");
  return (await hydrateExpenses(db, context, { docs: [doc] }, true))[0];
}
