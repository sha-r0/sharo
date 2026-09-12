import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const cache = new Map();
let lastUid = auth.currentUser?.uid;
onAuthStateChanged(auth, (user) => { if (user?.uid !== lastUid) cache.clear(); lastUid = user?.uid; });
const key = (period) => `${auth.currentUser?.uid || ""}:${period}`;
export function clearExpensePeriodCache() { cache.clear(); }
export async function getExpensePeriod(period, force = false) {
  const cacheKey = key(period);
  if (!force && cache.has(cacheKey)) return cache.get(cacheKey);
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`/api/expense-settings/periods?period=${encodeURIComponent(period)}`, { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to load expense period.");
  cache.set(cacheKey, body);
  return body;
}
export async function setExpensePeriod(period, action, reason) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch("/api/expense-settings/periods", { method: "POST", cache: "no-store", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ period, action, reason }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Unable to update expense period.");
  cache.set(key(period), body.period);
  return body.period;
}
