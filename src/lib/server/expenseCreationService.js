import { resolveTravelRoute } from "../expenses/travelRoute.js";
import { createHash } from "node:crypto";
import { requireCompanyPermission } from "./companyPermission.js";
import { calculateExpensePolicy, validateExpenseInput } from "../expenses/creationPolicy.js";
import { assertExpensePeriodOpen } from "./expensePeriodService.js";

const hash = (value) => createHash("sha256").update(value).digest("hex");
const employeeError = () => { throw new Error("EMPLOYEE_PROFILE_REQUIRED"); };
function employeeIdentity(snapshot, context) {
  const data = snapshot.data() || {};
  const status = String(data.access?.status || data.employment?.status || data.status || "active").toLowerCase();
  const employeeId = data.employeeId || data.login?.employeeId;
  const employeeName = data.personalInfo?.fullName || data.fullName || data.name;
  if (!snapshot.exists || (data.access?.authUid || data.authUid) !== context.token.uid || data.access?.loginEnabled === false || data.loginEnabled === false || !["active", "enabled"].includes(status) || !employeeId || !employeeName) employeeError();
  return { employeeFirestoreId: snapshot.id, employeeId: String(employeeId), employeeName: String(employeeName) };
}

export function createExpenseCreationService(db, timestamp) {
  const company = (context) => db.collection("Companies").doc(context.companyId);
  async function employeeRef(context) {
    const employees = company(context).collection("Usermanagement");
    if (context.employee?.id) return employees.doc(context.employee.id);
    // Owners may have no employee membership in authorizeCompanyRequest's result.
    let matches = await employees.where("access.authUid", "==", context.token.uid).limit(2).get();
    if (matches.empty) matches = await employees.where("authUid", "==", context.token.uid).limit(2).get();
    if (matches.size !== 1) employeeError();
    return matches.docs[0].ref;
  }
  function verifiedContext(context, snapshot) {
    if (!snapshot.exists) throw new Error("FORBIDDEN");
    const data = snapshot.data();
    if (String(data.serviceStatus || "active").toLowerCase() !== "active") throw new Error("COMPANY_INACTIVE");
    const verified = { ...context, company: data, isOwner: Boolean(context.token?.uid) && data.ownerUid === context.token.uid };
    requireCompanyPermission(verified, "expense.create");
    return verified;
  }
  const ownerName = (context) => String(context.company.ownerName || context.token.name || context.company.companyName || context.company.name || "Company Owner");
  return {
    async references(context) {
      context = verifiedContext(context, await company(context).get());
      const employee = context.isOwner ? null : await employeeRef(context);
      const [employeeSnapshot, projects] = await Promise.all([employee ? employee.get() : null, company(context).collection("Projectmanagement").get()]);
      return {
        employeeName: context.isOwner ? ownerName(context) : employeeIdentity(employeeSnapshot, context).employeeName,
        submitterType: context.isOwner ? "owner" : "employee",
        projects: projects.docs.map((doc) => ({ projectFirestoreId: doc.id, projectId: doc.data().projectId || doc.id, projectName: doc.data().projectName || "" }))
          .filter((project) => project.projectName).sort((a, b) => a.projectName.localeCompare(b.projectName)),
      };
    },
    async create(context, body) {
      const input = validateExpenseInput(body);
      const requestHash = hash(JSON.stringify(input));
      const parent = company(context);
      const receipt = parent.collection("ExpenseCreateRequests").doc(hash(`${context.token.uid}:${input.requestId}`));
      const expense = parent.collection("Expenses").doc();
      return db.runTransaction(async (transaction) => {
        const actorContext = verifiedContext(context, await transaction.get(parent));
        await assertExpensePeriodOpen(transaction, parent, input.date);
        const employee = actorContext.isOwner ? null : await employeeRef(actorContext);
        const submitted = await transaction.get(receipt);
        if (submitted.exists) {
          if (submitted.data().requestHash !== requestHash) throw new Error("SUBMISSION_CONFLICT");
          return { expenseId: submitted.data().expenseId, duplicate: true };
        }
        const [employeeSnapshot, projectSnapshot, categorySnapshot] = await Promise.all([
          employee ? transaction.get(employee) : null,
          transaction.get(parent.collection("Projectmanagement").doc(input.projectFirestoreId)),
          transaction.get(parent.collection("ExpenseCategories").doc(input.categoryId)),
        ]);
        const identity = actorContext.isOwner ? { employeeName: ownerName(actorContext) } : employeeIdentity(employeeSnapshot, actorContext);
        if (!projectSnapshot.exists) throw new Error("INVALID_EXPENSE: Project not found in your company.");
        const project = projectSnapshot.data();
        if (!project.projectName || (project.companyId && project.companyId !== context.companyId)) throw new Error("INVALID_EXPENSE: Invalid project.");
        if (!categorySnapshot.exists) throw new Error("INVALID_EXPENSE: Category not found in your company.");
        const category = categorySnapshot.data();
        const policy = calculateExpensePolicy(category, input);
        const actor = { uid: context.token.uid, name: identity.employeeName, role: actorContext.isOwner ? "owner" : context.employee?.access?.roleId || "employee" };
        const payload = {
          expenseId: expense.id, companyId: context.companyId, ...identity,
          projectFirestoreId: projectSnapshot.id, projectId: String(project.projectId || projectSnapshot.id), projectName: project.projectName,
          categoryId: categorySnapshot.id, category: category.name, categoryName: category.name,
          description: input.description, date: input.date, month: Number(input.date.slice(5, 7)), year: Number(input.date.slice(0, 4)),
          ...policy, ...resolveTravelRoute(category, input), amount: input.amount, billUrl: input.billUrl, status: actorContext.isOwner ? "approved" : "pending",
          ...(actorContext.isOwner ? {
            submitterType: "owner", approvedBy: { ...actor, employeeFirestoreId: null }, approvedAt: timestamp(),
            reviewedBy: { ...actor, employeeFirestoreId: null }, reviewedAt: timestamp(),
            reviewedByUid: actor.uid, reviewedByName: actor.name, reviewedByRole: actor.role,
          } : {}),
          createdBy: actor, createdAt: timestamp(), updatedAt: timestamp(),
        };
        transaction.create(expense, payload);
        if (employee) transaction.create(employee.collection("Expenses").doc(expense.id), payload);
        transaction.create(receipt, { expenseId: expense.id, requestHash, createdAt: timestamp() });
        return { expenseId: expense.id, duplicate: false };
      });
    },
  };
}
