import { getDownloadURL, getStorage } from "firebase-admin/storage";
import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { readReceiptForm, uploadExpenseReceipt } from "@/lib/server/expenseReceiptUpload";
import { storageBucket } from "@/lib/storageConfig";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    const form = await readReceiptForm(request);
    return Response.json(await uploadExpenseReceipt({ db: adminDb, bucket: getStorage().bucket(storageBucket), downloadURL: getDownloadURL, context, form }));
  } catch (error) {
    const message = error.message || "";
    const unauthorized = message === "UNAUTHENTICATED" || error.code?.startsWith?.("auth/");
    const forbidden = ["FORBIDDEN", "COMPANY_INACTIVE"].includes(message);
    const validation = /^(Receipt|Choose|The receipt|Invalid)/.test(message);
    return Response.json({ error: unauthorized ? "Please sign in again." : forbidden ? "You do not have permission to attach a receipt to this expense." : validation ? message : "Receipt upload failed. Please retry." }, { status: unauthorized ? 401 : forbidden ? 403 : validation ? 400 : 500 });
  }
}
