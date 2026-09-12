export const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"];
export function validateReimbursement(input) {
  const keys = ["requestId", "amount", "paymentDate", "paymentMode", "referenceNumber", "remarks"];
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !keys.includes(key))) throw new Error("INVALID_REQUEST");
  if (typeof input.requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(input.requestId)) throw new Error("INVALID_REQUEST");
  const cents = Math.round(input.amount * 100);
  if (typeof input.amount !== "number" || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(input.amount * 100 - cents) > 0.000001) throw new Error("INVALID_AMOUNT");
  if (typeof input.paymentDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.paymentDate) || !Number.isFinite(Date.parse(input.paymentDate)) || new Date(input.paymentDate).toISOString().slice(0, 10) !== input.paymentDate) throw new Error("INVALID_DATE");
  if (!PAYMENT_MODES.includes(input.paymentMode)) throw new Error("INVALID_MODE");
  for (const key of ["referenceNumber", "remarks"]) if (input[key] !== undefined && (typeof input[key] !== "string" || input[key].length > (key === "remarks" ? 2000 : 200))) throw new Error("INVALID_REQUEST");
  return { requestId: input.requestId, amount: cents / 100, paymentDate: input.paymentDate, paymentMode: input.paymentMode, referenceNumber: (input.referenceNumber || "").trim(), remarks: (input.remarks || "").trim() };
}
