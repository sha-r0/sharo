import { auth } from "@/lib/firebase";

async function request(path = "", method = "GET", body) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const response = await fetch(`/api/expense-settings/categories${path}`, {
    method, cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to load or save categories.");
  return result;
}

export const categoryInput = (category) => ({
  name: category.name, description: category.description, active: category.active,
  travelRouteEnabled: category.travelRouteEnabled ?? false,
  calculationType: category.calculationType, conditions: category.conditions, rules: category.rules,
});
export default {
  list: () => request(),
  save: (category, id) => request(id ? `/${encodeURIComponent(id)}` : "", id ? "PUT" : "POST", categoryInput(category)),
};
