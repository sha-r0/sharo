import { travelRouteEnabled } from "../expenses/travelRoute.js";
import { createHash } from "node:crypto";
import { normalizedName, validateCategory } from "../expense-settings/categoryModel.js";
import { requireCompanyPermission } from "./companyPermission.js";

const nameKey = (name) => createHash("sha256").update(normalizedName(name)).digest("hex");

export function createExpenseCategoryService(db, timestamp) {
  const company = (context) => db.collection("Companies").doc(context.companyId);
  return {
    async list(context) {
      requireCompanyPermission(context, "expense.manage", "expense.create", "expense.view");
      const snapshot = await company(context).collection("ExpenseCategories").get();
      return snapshot.docs.map((doc) => ({ ...doc.data(), travelRouteEnabled: travelRouteEnabled(doc.data()), id: doc.id })).sort((a, b) => a.name.localeCompare(b.name));
    },
    async save(context, input, id = null) {
      requireCompanyPermission(context, "expense.manage");
      if (id !== null && (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))) throw new Error("INVALID_CATEGORY: Invalid category ID.");
      const data = validateCategory(input);
      const parent = company(context);
      const ref = id ? parent.collection("ExpenseCategories").doc(id) : parent.collection("ExpenseCategories").doc();
      const names = parent.collection("ExpenseCategoryNames");
      const reservation = names.doc(nameKey(data.name));
      await db.runTransaction(async (transaction) => {
        const [existing, reserved] = await Promise.all([transaction.get(ref), transaction.get(reservation)]);
        if (id && !existing.exists) throw new Error("CATEGORY_NOT_FOUND");
        if (reserved.exists && reserved.data().categoryId !== ref.id) throw new Error("CATEGORY_NAME_EXISTS");
        const before = existing.exists ? existing.data() : null;
        const actor = { uid: context.token.uid, employeeFirestoreId: context.employee?.id || null, role: context.isOwner ? "owner" : context.employee?.access?.roleId || "employee" };
        transaction.set(ref, {
          ...data, id: ref.id, code: before?.code || `EXP_${ref.id.toUpperCase()}`,
          createdAt: before?.createdAt || timestamp(), createdBy: before?.createdBy || actor,
          updatedAt: timestamp(), updatedBy: actor,
        });
        transaction.set(reservation, { categoryId: ref.id });
        if (before && nameKey(before.name) !== nameKey(data.name)) transaction.delete(names.doc(nameKey(before.name)));
      });
      return { id: ref.id };
    },
  };
}
