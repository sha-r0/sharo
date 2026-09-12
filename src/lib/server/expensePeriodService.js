import { requireCompanyPermission } from "./companyPermission.js";

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const monthName = (period) => new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${period}-01T12:00:00`));

export function normalizeExpensePeriod(value) {
  const period = String(value || "").trim();
  const match = PERIOD_RE.exec(period);
  if (!match) throw new Error("INVALID_PERIOD");
  return { period, year: Number(match[1]), month: Number(match[2]), label: monthName(period) };
}

export async function readExpensePeriod(db, companyId, period) {
  const normalized = normalizeExpensePeriod(period);
  const snapshot = await db.collection("Companies").doc(companyId).collection("ExpensePeriods").doc(normalized.period).get();
  const data = snapshot.exists ? snapshot.data() : {};
  return { ...normalized, ...data, exists: snapshot.exists, status: data.status === "locked" ? "locked" : "open" };
}

export async function assertExpensePeriodOpen(transaction, companyRef, date) {
  const value = String(date || "").slice(0, 7);
  const normalized = normalizeExpensePeriod(value);
  const snapshot = await transaction.get(companyRef.collection("ExpensePeriods").doc(normalized.period));
  if (snapshot.exists && snapshot.data()?.status === "locked") {
    const error = new Error(`${normalized.label} expense period is locked. New expenses cannot be added.`);
    error.code = "EXPENSE_PERIOD_LOCKED";
    throw error;
  }
  return normalized;
}

export async function setExpensePeriod(db, context, period, action, reason, timestamp) {
  requireCompanyPermission(context, "expense.manage");
  const normalized = normalizeExpensePeriod(period);
  if (!["lock", "unlock"].includes(action)) throw new Error("INVALID_ACTION");
  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 1000)) throw new Error("INVALID_REASON");
  const companyRef = db.collection("Companies").doc(context.companyId);
  const actor = { uid: context.token.uid, name: context.isOwner ? (context.company.ownerName || context.token.name || "Company Owner") : (context.employee?.personalInfo?.fullName || context.employee?.name || "Manager"), role: context.isOwner ? "owner" : context.employee?.access?.roleId || "manager" };
  return db.runTransaction(async (transaction) => {
    const ref = companyRef.collection("ExpensePeriods").doc(normalized.period);
    const current = await transaction.get(ref);
    const existing = current.exists ? current.data() : {};
    if (action === "lock" && existing.status === "locked") throw new Error("PERIOD_ALREADY_LOCKED");
    if (action === "unlock" && existing.status !== "locked") throw new Error("PERIOD_ALREADY_OPEN");
    const now = timestamp();
    const next = { ...existing, period: normalized.period, year: normalized.year, month: normalized.month, status: action === "lock" ? "locked" : "open", updatedAt: now };
    if (action === "lock") Object.assign(next, { lockedAt: now, lockedByUid: actor.uid, lockedByName: actor.name, lockedByRole: actor.role, lockReason: reason?.trim() || "" });
    else Object.assign(next, { unlockedAt: now, unlockedByUid: actor.uid, unlockedByName: actor.name });
    transaction.set(ref, next);
    transaction.create(companyRef.collection("ActivityLogs").doc(), { type: `expense.period.${action}`, period: normalized.period, companyId: context.companyId, actorId: actor.uid, actor, reason: reason?.trim() || "", createdAt: now });
    return { ...normalized, status: next.status, lockedAt: null, lockedByUid: next.lockedByUid || null, lockedByName: next.lockedByName || null, lockReason: next.lockReason || "", unlockedAt: null, unlockedByUid: next.unlockedByUid || null, unlockedByName: next.unlockedByName || null };
  });
}
