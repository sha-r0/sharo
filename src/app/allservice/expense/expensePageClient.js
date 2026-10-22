import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { createExpensePageCache } from "@/lib/expenses/pageCache";

export const expensePageCache = createExpensePageCache();
const filterCache = new Map();
const filterPending = new Map();
export function clearExpenseFilterCache() { filterCache.clear(); filterPending.clear(); }
let sessionKey;
export function syncExpenseSession(key) {
  if (sessionKey !== key) { if (sessionKey !== undefined) expensePageCache.clear(); sessionKey = key; }
}
let lastUid = auth.currentUser?.uid;
onAuthStateChanged(auth, (user) => { if (user?.uid !== lastUid) { expensePageCache.clear(); clearExpenseFilterCache(); } lastUid = user?.uid; });

async function get(path) {
  const user = auth.currentUser;
  const token = await user?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const started = performance.now();
  const response = await fetch(path, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.error || "Unable to load expenses."), { code: body.code || `http-${response.status}`, path: body.path || path, operation: body.operation || "GET" });
  if (auth.currentUser !== user) throw new Error("STALE_EXPENSE_REQUEST");
  if (process.env.NODE_ENV === "development") console.info("[ExpenseRead]", { durationMs: Math.round(performance.now() - started), rows: body.expenses?.length ?? 1 });
  return body;
}
export const fetchExpensePage = (month, cursor) => get(`/api/expenses?${new URLSearchParams({ month, ...(cursor ? { cursor } : {}) })}`);
export const fetchExpenseMatches = (
  month,
  filters,
  force = false,
  cursor = null
) => {
  const key =
    `${month}:${JSON.stringify(filters)}:${cursor || "first"}`;

  const cached =
    filterCache.get(key);

  if (
    !force &&
    cached &&
    Date.now() - cached.at <
      120000
  ) {
    return Promise.resolve(
      cached.data
    );
  }

  if (
    !force &&
    filterPending.has(key)
  ) {
    return filterPending.get(
      key
    );
  }

  const params =
    new URLSearchParams({
      month,
      mode: "filter",
      ...filters,

      ...(cursor
        ? { cursor }
        : {}),
    });

  const request =
    get(
      `/api/expenses?${params}`
    )
      .then((data) => {
        filterCache.set(
          key,
          {
            at: Date.now(),
            data,
          }
        );

        return data;
      })
      .finally(() =>
        filterPending.delete(key)
      );

  filterPending.set(
    key,
    request
  );

  return request;
};
export const fetchExpense = async (id) => (await get(`/api/expenses/${encodeURIComponent(id)}`)).expense;

export async function downloadExpenseExport(
  month,
  filters
) {
  const user =
    auth.currentUser;

  const token =
    await user?.getIdToken();

  if (!token) {
    throw new Error(
      "Please sign in again."
    );
  }

  const params =
    new URLSearchParams({
      month,

      search:
        filters.search || "",

      status:
        filters.status || "",

      category:
        filters.category || "",

      project:
        filters.project || "",

      employee:
        filters.employee || "",

      fromDate:
        filters.fromDate || "",

      toDate:
        filters.toDate || "",
    });

  const response =
    await fetch(
      `/api/expenses/export?${params}`,
      {
        cache:
          "no-store",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  if (!response.ok) {
    const body =
      await response
        .json()
        .catch(() => ({}));

    throw new Error(
      body.error ||
        "Unable to export expenses."
    );
  }

  if (
    auth.currentUser !== user
  ) {
    throw new Error(
      "STALE_EXPENSE_REQUEST"
    );
  }

  const blob =
    await response.blob();

  const disposition =
    response.headers.get(
      "Content-Disposition"
    ) || "";

  const match =
    disposition.match(
      /filename="?([^"]+)"?/i
    );

  const filename =
    match?.[1] ||
    `Expenses_${month}.xlsx`;

  const url =
    URL.createObjectURL(
      blob
    );

  try {
    const link =
      document.createElement(
        "a"
      );

    link.href =
      url;

    link.download =
      filename;

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();
  } finally {
    URL.revokeObjectURL(
      url
    );
  }
}
