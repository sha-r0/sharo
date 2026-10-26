import { FieldPath } from "firebase-admin/firestore";
import { requireCompanyPermission } from "./companyPermission.js";
import { summarizeExpenses } from "../expenses/dashboard.js";
import {
  expenseSearchValues,
  normalizeExpenseSearch,
} from "../expenses/searchIndex.js";

export const EXPENSE_PAGE_SIZE = 30; // One reimbursement IN query; Firestore supports at most 30 values.
function optionValues(rows, field) {
  return [...new Map(rows.map((row) => {
    const id = String(row[`${field}FirestoreId`] || row[`${field}Id`] || row[`${field}Name`] || row[field] || "");
    return [id, { id, name: row[`${field}Name`] || row[field] || id }];
  })).values()].filter((item) => item.id).sort((a, b) => a.name.localeCompare(b.name));
}
function monthlySummary(data = {}) {
  return {
    totalExpense: Number(data.totalExpense || 0),
    approvedExpense: Number(data.approvedExpense || 0),
    pendingExpense: Number(data.pendingExpense || 0),
    rejectedExpense: Number(data.rejectedExpense || 0),
    overPolicy: Number(data.overPolicy || 0),
  };
}
function employeeOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      const id =
        String(
          doc.id ||
          data.employeeId ||
          data.login?.employeeId ||
          ""
        );

      const name =
        data.personalInfo?.fullName ||
        data.fullName ||
        data.name ||
        data.employeeName ||
        data.employeeId ||
        id;

      return {
        id,
        name: String(name),
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function projectOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name:
          data.projectName ||
          data.name ||
          data.projectId ||
          doc.id,
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
}

function categoryOptions(snapshot) {
  return snapshot.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        name:
          data.name ||
          data.categoryName ||
          doc.id,
      };
    })
    .filter((item) => item.id)
    .sort((a, b) =>
      a.name.localeCompare(b.name)
    );
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
// date is authoritative; expenseDate is only a legacy fallback. createdAt and
// month/year describe creation/denormalized metadata, not the expense period.
const canonicalDate = (expense) => String(expense.date || expense.expenseDate || "");
const encodeCursor = (positions) => Buffer.from(JSON.stringify({ version: 2, positions })).toString("base64url");
function decodeCursor(cursor, start, end) {
  if (!cursor) return { date: null, expenseDate: null };
  try {
    const value = JSON.parse(Buffer.from(cursor, "base64url").toString());
    const positions = value.version === 2 ? value.positions : { date: value, expenseDate: value };
    for (const field of ["date", "expenseDate"]) {
      const position = positions[field];
      if (position !== null && (!position || typeof position.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(position.date) || position.date < start || position.date >= end ||
        typeof position.id !== "string" || !/^[\w-]{1,128}$/.test(position.id))) throw new Error();
    }
    return positions;
  } catch {
    throw new Error("INVALID_CURSOR");
  }
}

// Merge two indexed date streams. Track consumed positions separately: using
// the last fetched row would skip unconsumed matches at a page boundary.
async function scanExpenses(db, context, month, filters, cursor) {
  const { start, end } = expensePeriod(month);
  const positions = decodeCursor(cursor, start, end);
  const employeeId = employeeScope(context);
  const collection = db.collection("Companies").doc(context.companyId).collection("Expenses");
  const from = filters.fromDate && filters.fromDate > start ? filters.fromDate : start;
  const to = filters.toDate && filters.toDate < end ? filters.toDate : null;
  const search = normalizeExpenseSearch(filters.search);
  const streams = ["date", "expenseDate"].map((field) => ({ field, docs: [], done: false }));
  const rows = [];
  const batchSize = Object.values(filters).some(Boolean) ? 60 : EXPENSE_PAGE_SIZE + 1;
  let examined = 0;

  function matches(expense) {
    if (expense.companyId && expense.companyId !== context.companyId) return false;
    if (employeeId && String(expense.employeeId || "") !== String(employeeId)) return false;
    if (filters.status && expense.status !== filters.status) return false;
    for (const field of ["employee", "project", "category"]) {
      if (!filters[field] || (field === "employee" && employeeId)) continue;
      // Prefer stored identity over potentially stale derived filter keys.
      const key = expense[`${field}FirestoreId`] || expense[`${field}Id`] ||
        expense[`${field}FilterKey`] || expense[`${field}Name`] || expense[field] || "";
      if (String(key) !== String(filters[field])) return false;
    }
    return !search || expenseSearchValues(expense).some((value) => value.includes(search));
  }

  async function fill(stream) {
    if (stream.docs.length || stream.done) return;
    let query = collection;
    if (employeeId) query = query.where("employeeId", "==", employeeId);
    query = query.where(stream.field, ">=", from)
      .where(stream.field, to ? "<=" : "<", to || end)
      .orderBy(stream.field, "desc").orderBy(FieldPath.documentId(), "desc");
    const position = positions[stream.field];
    if (position) query = query.startAfter(position.date, position.id);
    const snapshot = await query.limit(batchSize).get();
    stream.docs = [...snapshot.docs];
    stream.done = snapshot.size < batchSize;
  }

  try {
    // No derived-field predicate is safe for unindexed legacy documents or
    // substring search. Bound reads to the requested period and 300 candidates.
    while (rows.length < EXPENSE_PAGE_SIZE && examined < 300) {
      await Promise.all(streams.map(fill));
      const available = streams.filter((stream) => stream.docs.length);
      if (!available.length) break;
      available.sort((a, b) => {
        const left = a.docs[0], right = b.docs[0];
        const x = left.data()[a.field], y = right.data()[b.field];
        return x === y ? (left.id < right.id ? 1 : left.id > right.id ? -1 : 0) : x < y ? 1 : -1;
      });
      const stream = available[0];
      const doc = stream.docs.shift();
      const expense = doc.data();
      positions[stream.field] = { date: expense[stream.field], id: doc.id };
      examined++;
      // The primary stream owns every document with date, even if its stale
      // expenseDate falls in a different month. Never count a document twice.
      if (stream.field === "expenseDate" && expense.date) continue;
      if (matches(expense)) rows.push({ ...expense, date: canonicalDate(expense), id: doc.id });
    }
  } catch (error) {
    error.path = `Companies/${context.companyId}/Expenses`;
    error.operation = "get";
    throw error;
  }
  const hasMore = streams.some((stream) => stream.docs.length || !stream.done);
  return { expenses: rows, cursor: hasMore ? encodeCursor(positions) : null };
}

export async function pageExpenses(db, context, month, cursor) {
  requireCompanyPermission(context, "expense.view");
  const page = await scanExpenses(db, context, month, {}, cursor);
  if (cursor) return page;
  const company = db.collection("Companies").doc(context.companyId);
  if (employeeScope(context)) {
    // Employee cards must never use the company-wide monthly summary.
    const rows = [...page.expenses];
    let next = page.cursor;
    while (next) {
      const result = await scanExpenses(db, context, month, {}, next);
      rows.push(...result.expenses);
      next = result.cursor;
    }
    return { ...page, summary: summarizeExpenses(rows), totalCount: rows.length,
      options: { employees: optionValues(rows, "employee"), projects: optionValues(rows, "project"), categories: optionValues(rows, "category") } };
  }
  const [summary, employees, projects, categories] = await Promise.all([
    company.collection("ExpenseMonthlySummaries").doc(month).get(),
    company.collection("Usermanagement").select("employeeId", "login.employeeId", "personalInfo.fullName", "fullName", "name", "employeeName").get(),
    company.collection("Projectmanagement").select("projectId", "projectName", "name").get(),
    company.collection("ExpenseCategories").select("name", "categoryName").get(),
  ]);
  return { ...page, summary: monthlySummary(summary.exists ? summary.data() : {}),
    totalCount: Number(summary.data()?.totalCount || 0),
    options: { employees: employeeOptions(employees), projects: projectOptions(projects), categories: categoryOptions(categories) } };
}

export async function queryExpenseMatches(db, context, month, filters = {}, cursor = null) {
  requireCompanyPermission(context, "expense.view");
  const page = await scanExpenses(db, context, month, filters, cursor);
  // Preserve the API's loaded-page totals; the client accumulates pages.
  return { ...page, summary: summarizeExpenses(page.expenses), totalCount: page.expenses.length };
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
