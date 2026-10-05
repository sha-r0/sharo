import { auth } from "@/lib/firebase";

export const canReadEmployeeDirectory = (access) => Boolean(access?.isOwner || (access?.roleId && access.roleId !== "employee" && access.permissions?.includes("employee.view")));

export async function getActiveEmployeeDirectory(companyId) {
  if (!auth.currentUser) throw new Error("Authentication required.");
  const token = await auth.currentUser.getIdToken();
  const response = await fetch(`/api/employees/active?companyId=${encodeURIComponent(companyId)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Employee directory failed (${response.status}): ${result.error || "UNKNOWN"}`);
  if (result.companyId !== companyId) throw new Error("Employee directory tenant mismatch.");
  return result.employees || [];
}
