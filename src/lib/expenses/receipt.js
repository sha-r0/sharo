export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
export const RECEIPT_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
const TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };

export function validateReceipt(file) {
  const extension = String(file?.name || "").split(".").pop().toLowerCase();
  const type = TYPES[extension];
  if (!type || (file.type && (file.type === "image/jpg" ? "image/jpeg" : file.type) !== type)) throw new Error("Choose a JPG, JPEG, PNG or PDF receipt.");
  if (!Number.isFinite(file.size) || file.size <= 0) throw new Error("The receipt file is empty.");
  if (file.size > MAX_RECEIPT_BYTES) throw new Error("Receipt must be 5 MB or smaller.");
  return { extension: extension === "jpeg" ? "jpg" : extension, contentType: type };
}

export function validateReceiptBytes(file, bytes) {
  const info = validateReceipt(file);
  const signature = info.extension === "jpg" ? [255, 216, 255] : info.extension === "png" ? [137, 80, 78, 71, 13, 10, 26, 10] : [37, 80, 68, 70, 45];
  if (bytes.length !== file.size || !signature.every((byte, index) => bytes[index] === byte)) throw new Error("Receipt content does not match its file type.");
  return info;
}

export function receiptPreview(url) {
  if (!url) return { kind: "none", url: "" };
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password) return { kind: "invalid", url: "" };
    return { kind: decodeURIComponent(parsed.pathname).toLowerCase().endsWith(".pdf") ? "pdf" : "image", url };
  } catch { return { kind: "invalid", url: "" }; }
}

// Cache by selected File: failed saves retry the same URL, avoiding duplicate uploads.
export function createReceiptSubmission(upload) {
  const uploads = new WeakMap();
  return async ({ input, file, removed = false, expenseId, save, onStage = () => {} }) => {
    let receiptFields = removed ? { billUrl: "" } : {};
    if (file) {
      validateReceipt(file);
      onStage("Uploading receipt…");
      if (!uploads.has(file)) uploads.set(file, { uploadId: crypto.randomUUID() });
      const entry = uploads.get(file);
      entry.billUrl ||= await upload(file, entry.uploadId, expenseId);
      receiptFields = { billUrl: entry.billUrl };
    }
    onStage("Saving expense…");
    return save({ ...input, ...receiptFields });
  };
}
