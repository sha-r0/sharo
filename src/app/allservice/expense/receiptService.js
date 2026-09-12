import { auth } from "@/lib/firebase";
import { validateReceipt } from "@/lib/expenses/receipt";

export async function uploadReceipt(file, uploadId, expenseId) {
  validateReceipt(file);
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Please sign in again.");
  const body = new FormData();
  body.set("file", file); body.set("uploadId", uploadId);
  if (expenseId) body.set("expenseId", expenseId);
  const response = await fetch("/api/expenses/receipts", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.billUrl) throw new Error(result.error || "Receipt upload failed. Please retry.");
  return result.billUrl;
}
