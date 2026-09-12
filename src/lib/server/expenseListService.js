import { requireCompanyPermission } from "./companyPermission.js";
import { deriveReimbursement } from "./expenseReimbursement.js";

async function read(source, path, query = "") {
  try { return await source.get(); }
  catch (error) { error.path = path; error.operation = "get"; error.query = query; throw error; }
}

export async function listExpenses(db, context) {
  requireCompanyPermission(context, "expense.view");
  let source = db.collection("Companies").doc(context.companyId).collection("Expenses");
  const role = String(context.employee?.access?.roleId || context.employee?.employment?.role || "employee").toLowerCase();
  if (!context.isOwner && role === "employee") {
    const employeeId = context.employee?.employeeId || context.employee?.login?.employeeId;
    if (!employeeId) throw new Error("FORBIDDEN");
    source = source.where("employeeId", "==", employeeId);
  }
  const snapshot = await read(source, `Companies/${context.companyId}/Expenses`, !context.isOwner && role === "employee" ? "employeeId == currentEmployee" : "company");
  return hydrateExpenses(db, context, snapshot);
}

export async function hydrateExpenses(db, context, snapshot, pageScoped = false) {
  if (!snapshot.docs.length) return [];
  // One tenant-scoped ledger query avoids per-expense history reads.
  let ledger;
  try {
    let ledgerQuery = db.collectionGroup("Reimbursements").where("companyId", "==", context.companyId);
    if (pageScoped) ledgerQuery = ledgerQuery.where("expenseId", "in", snapshot.docs.map((doc) => doc.id));
    ledger = await read(ledgerQuery, "collectionGroup(Reimbursements)", `companyId == ${context.companyId}`);
  } catch (error) {
    // Undeployed collection-group index: read only history beneath authorized expenses.
    // Other failures must propagate; never replace unread payment history with zero.
    if (![9, "9", "failed-precondition"].includes(error.code) || !/index/i.test(error.message || "")) throw error;
    const docs = [];
    for (let offset = 0; offset < snapshot.docs.length; offset += 8) {
      const histories = await Promise.all(snapshot.docs.slice(offset, offset + 8).map((expense) =>
        read(expense.ref.collection("Reimbursements"), `${expense.ref.path}/Reimbursements`)));
      for (const history of histories) docs.push(...history.docs);
    }
    ledger = { docs };
  }
  const histories = new Map();
  for (const doc of ledger.docs) {
    const parent = doc.ref.parent.parent;
    if (parent?.parent.path !== `Companies/${context.companyId}/Expenses`) continue;
    const items = histories.get(parent.id) || [];
    items.push({ ...doc.data(), id: doc.id }); histories.set(parent.id, items);
  }
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const records = (histories.get(doc.id) || []).sort((a, b) => String(b.paymentDate).localeCompare(String(a.paymentDate)));
    return { ...data, id: doc.id, reimbursements: records, reimbursement: deriveReimbursement(data, records) };
  });
}
