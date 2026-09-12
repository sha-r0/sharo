import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { assertExpenseMutationAuthorized, validateExpenseMutationInput } from "../src/app/api/expenses/[expenseId]/expenseMutationPolicy.js";

const serviceSource = fs.readFileSync(new URL("../src/app/allservice/expense/expenseService.js", import.meta.url), "utf8");
const pageSource = fs.readFileSync(new URL("../src/app/(dashboard)/manager/expenses/page.jsx", import.meta.url), "utf8");
const firebaseSource = fs.readFileSync(new URL("../src/lib/firebase.js", import.meta.url), "utf8");
const reviewRouteSource = fs.readFileSync(new URL("../src/app/api/expenses/[expenseId]/route.js", import.meta.url), "utf8");

test("manager web amount edit calls the existing updateExpense callable", () => {
  assert.match(serviceSource, /httpsCallable\(usCentralFunctions, "updateExpense"\)/);
  assert.match(serviceSource, /updateExpenseCallable\(\{ expenseId, \.\.\.editableFields \}\)/);
  assert.match(serviceSource, /updateExpenseContent\(expenseId, \{ amount: numericAmount \}\)/);
});

test("updateExpense uses the authenticated app in us-central1", () => {
  assert.match(firebaseSource, /usCentralFunctions = getFunctions\(app, "us-central1"\)/);
  assert.match(serviceSource, /if \(!auth\.currentUser\)/);
});

test("content edit sends no trusted tenant or audit identity", () => {
  const editFunction = serviceSource.slice(serviceSource.indexOf("async function updateExpenseContent"), serviceSource.indexOf("const expenseService"));
  assert.doesNotMatch(editFunction, /companyId|lastEditedByUid|lastEditedByName|lastEditedByRole|editCount|lastEditedAt/);
  assert.match(editFunction, /\{ expenseId, \.\.\.editableFields \}/);
});

test("web expense content flow has no direct Firestore write or Admin API fallback", () => {
  assert.doesNotMatch(serviceSource, /updateDoc\(|setDoc\(|writeBatch\(|runTransaction\(|addDoc\(|deleteDoc\(/);
  const amountMethod = serviceSource.slice(serviceSource.indexOf("async updateAmount"));
  assert.doesNotMatch(amountMethod, /fetch\(|reviewExpense\(/);
  assert.doesNotMatch(reviewRouteSource, /updateAmount|previousAmount|editedAfterApproval/);
});

test("edit button closes, reconciles one row, and reports success", () => {
  assert.match(pageSource, /onEdit=\{canEditExpense \? handleEdit : null\}/);
  const handler = pageSource.slice(pageSource.indexOf("async function updateExpenseAmount"), pageSource.indexOf("async function handleApprove"));
  assert.match(handler, /expenseService\.updateAmount/);
  assert.match(handler, /setEditOpen\(false\)/);
  assert.match(handler, /reconcileExpense\(selectedExpense.id\)/);
  assert.doesNotMatch(handler, /await loadData\(\)/);
  assert.match(handler, /toast\.success\("Expense updated successfully\."\)/);
});

test("callable failures are caught and shown as safe UI errors", () => {
  assert.match(serviceSource, /functions\/permission-denied/);
  assert.match(serviceSource, /functions\/unauthenticated/);
  assert.match(serviceSource, /Unable to update expense\. Please try again\./);
  assert.match(pageSource, /toast\.error\(error\?\.message/);
});

test("approval and rejection remain on the authenticated review API", () => {
  assert.match(serviceSource, /return reviewExpense\(expenseId, \{ action: "approve" \}\)/);
  assert.match(serviceSource, /return reviewExpense\(expenseId, \{ action: "reject", managerRemarks \}\)/);
  assert.deepEqual(validateExpenseMutationInput({ action: "approve" }), { action: "approve" });
  assert.deepEqual(validateExpenseMutationInput({ action: "reject", managerRemarks: "Missing receipt" }), { action: "reject", managerRemarks: "Missing receipt" });
  assert.throws(() => validateExpenseMutationInput({ action: "updateAmount", amount: 25 }), /INVALID_REQUEST/);
});

test("review API remains owner/manager-only and company-scoped", () => {
  assert.match(reviewRouteSource, /authorizeCompanyRequest\(request\)/);
  assert.match(reviewRouteSource, /lifecycle\.mutateExpense/);
  assert.doesNotMatch(reviewRouteSource, /input\.companyId/);
  assert.doesNotThrow(() => assertExpenseMutationAuthorized({ isOwner: true }, "approve", { status: "pending" }));
  assert.doesNotThrow(() => assertExpenseMutationAuthorized({ permissions: ["expense.approve"], employee: { access: { roleId: "manager" } } }, "approve", { status: "pending" }));
  assert.throws(() => assertExpenseMutationAuthorized({ permissions: ["expense.view"], employee: { access: { roleId: "manager" } } }, "approve", { status: "pending" }), /FORBIDDEN/);
  assert.throws(() => assertExpenseMutationAuthorized({ permissions: ["expense.approve"], employee: { access: { roleId: "employee" } } }, "approve", { status: "pending" }), /FORBIDDEN/);
});

test("development diagnostics cover edit, submit, callable and response without secrets", () => {
  assert.match(pageSource, /\[ManagerExpenseWeb\] editPressed expenseId=/);
  assert.match(pageSource, /\[ManagerExpenseWeb\] submitting oldAmount=/);
  assert.match(serviceSource, /callable: "updateExpense"/);
  assert.match(serviceSource, /\[ManagerExpenseWeb\] callableResponse=success/);
  assert.doesNotMatch(`${pageSource}\n${serviceSource}`, /LEGACY_DIRECT_WRITE/);
});
