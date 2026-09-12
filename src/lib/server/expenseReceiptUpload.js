import { createHash, randomUUID } from "node:crypto";
import { MAX_RECEIPT_BYTES, validateReceiptBytes } from "../expenses/receipt.js";
import { requireCompanyPermission } from "./companyPermission.js";
import lifecycle from "../../../functions/src/expense/lifecycle.js";

export async function readReceiptForm(request) {
  const maximum = MAX_RECEIPT_BYTES + 65536;
  if (Number(request.headers.get("content-length")) > maximum) throw new Error("Receipt must be 5 MB or smaller.");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Choose a receipt file.");
  const chunks = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) { await reader.cancel(); throw new Error("Receipt must be 5 MB or smaller."); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
}

export async function uploadExpenseReceipt({ db, bucket, downloadURL, context, form }) {
  const permitted = ["file", "uploadId", "expenseId"];
  for (const key of form.keys()) if (!permitted.includes(key) || form.getAll(key).length !== 1) throw new Error("Invalid upload fields.");
  const uploadId = form.get("uploadId");
  if (typeof uploadId !== "string" || !/^[a-f0-9-]{36}$/i.test(uploadId)) throw new Error("Invalid upload identifier.");
  const expenseId = form.get("expenseId");
  if (expenseId !== null) {
    if (typeof expenseId !== "string" || !expenseId || expenseId.includes("/")) throw new Error("Invalid expense.");
    const expense = await db.collection("Companies").doc(context.companyId).collection("Expenses").doc(expenseId).get();
    if (!expense.exists || (expense.data().companyId && expense.data().companyId !== context.companyId)) throw new Error("FORBIDDEN");
    lifecycle.assertAuthorized(context, "edit", expense.data());
  } else requireCompanyPermission(context, "expense.create");
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") throw new Error("Choose a receipt file.");
  // Check metadata before allocating file bytes.
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipt must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const { extension, contentType } = validateReceiptBytes(file, bytes);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const actor = createHash("sha256").update(context.token.uid).digest("hex");
  const path = `companies/${context.companyId}/expenses/receipts/${actor}/${uploadId}/${digest}.${extension}`;
  const object = bucket.file(path);
  try {
    await object.save(bytes, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: {
      contentType, cacheControl: "private, max-age=3600", contentDisposition: `inline; filename="receipt.${extension}"`,
      metadata: { firebaseStorageDownloadTokens: randomUUID() },
    } });
  } catch (error) {
    // A retry after a lost response reuses the immutable object and download token.
    if (Number(error.code) !== 412) throw error;
  }
  return { billUrl: await downloadURL(object) };
}
