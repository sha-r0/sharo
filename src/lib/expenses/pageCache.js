import { summarizeExpenses } from "./dashboard.js";

export function createExpensePageCache({ ttl = 120000, now = Date.now } = {}) {
  let scope = ""; let generation = 0;
  const months = new Map(); const pending = new Map();
  const useScope = (next) => { if (next !== scope) { scope = next; generation++; months.clear(); pending.clear(); } };
  return {
    clear() { scope = ""; generation++; months.clear(); pending.clear(); },
    peek(next, month) { useScope(next); const cached = months.get(month); return cached && now() - cached.at < ttl ? cached.data : null; },
    load(next, month, cursor, force, fetchPage) {
      useScope(next);
      const cached = this.peek(next, month);
      if (!force && !cursor && cached) return Promise.resolve(cached);
      const key = `${month}:${cursor || "first"}`;
      if (pending.has(key)) return pending.get(key);
      const version = generation;
      const request = Promise.resolve().then(() => fetchPage(month, cursor)).then((page) => {
        if (version !== generation) throw new Error("STALE_EXPENSE_REQUEST");
        const before = cursor ? months.get(month)?.data : null;
        const data = { ...before, ...page, expenses: [...new Map([...(before?.expenses || []), ...page.expenses].map((expense) => [expense.id, expense])).values()] };
        months.set(month, { at: now(), data });
        while (months.size > 6) months.delete(months.keys().next().value);
        return data;
      }).finally(() => { if (pending.get(key) === request) pending.delete(key); });
      pending.set(key, request); return request;
    },
    invalidate(next, month) {
      if (scope !== next) return;
      generation++; pending.clear();
      const cached = months.get(month);
      if (cached) cached.at = -Infinity;
    },
    replace(next, month, id, expense) {
      useScope(next); generation++; pending.clear();
      const cached = months.get(month);
      // Other months may have been affected by an expense date edit.
      for (const key of months.keys()) if (key !== month) months.delete(key);
      if (!cached) return null;
      const old = cached.data.expenses.find((row) => row.id === id);
      if (!old) return cached.data;
      const replacement = expense?.date?.startsWith(month) ? expense : null;
      const before = summarizeExpenses([old]); const after = summarizeExpenses(replacement ? [replacement] : []);
      const summary = Object.fromEntries(Object.entries(cached.data.summary).map(([key, value]) => [key, Math.round((value - before[key] + after[key]) * 100) / 100]));
      const data = { ...cached.data, summary, totalCount: cached.data.totalCount - (replacement ? 0 : 1), expenses: cached.data.expenses.flatMap((row) => row.id !== id ? [row] : replacement ? [replacement] : []) };
      months.set(month, { at: cached.at, data }); return data;
    },
  };
}
