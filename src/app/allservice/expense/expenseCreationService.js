import { expensePageCache } from "./expensePageClient";
import { auth } from "@/lib/firebase";

async function request(path, body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`/api/expenses${path}`, {
    method: body ? "POST" : "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to submit or load expenses. Please retry.");
  return result;
}

export default { references: () => request("/reference-data"), create: async (input) => { const result = await request("", input); expensePageCache.clear(); return result; } };
