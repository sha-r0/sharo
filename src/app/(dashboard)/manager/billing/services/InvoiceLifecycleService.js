import { paymentState } from "./PaymentAllocationService.js";
import { toDate } from "./ReminderService.js";

const lower = (value) => String(value || "").toLowerCase();
const validPayment = (payment) => !["failed", "cancelled", "rejected", "void", "reversed"].includes(lower(payment.status));

export function invoiceLifecycle(invoice, payments = [], now = new Date()) {
  const invoicePayments = payments.filter((payment) => (payment.invoiceId && payment.invoiceId === invoice.id) || (!payment.invoiceId && payment.invoiceNumber === invoice.invoiceNumber));
  const successfulPayments = invoicePayments.filter(validPayment);
  const paidFromTransactions = successfulPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const hasTransactions = successfulPayments.length > 0;
  const state = paymentState(invoice, hasTransactions ? paidFromTransactions : invoice.paidAmount);
  const legacy = lower(invoice.status);
  const invoiceStatus = lower(invoice.invoiceStatus) || (legacy === "cancelled" ? "cancelled" : legacy === "draft" ? "draft" : "issued");
  const due = toDate(invoice.dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdue = invoiceStatus === "issued" && state.pending > 0 && due && new Date(due.getFullYear(), due.getMonth(), due.getDate()) < today;
  const paymentStatus = state.paymentStatus;
  const displayStatus = invoiceStatus === "cancelled" ? "cancelled" : invoiceStatus === "draft" ? "draft" : paymentStatus === "paid" ? "paid" : overdue ? "overdue" : paymentStatus === "partial" ? "partial" : "running";
  const overdueDays = overdue ? Math.floor((today - new Date(due.getFullYear(), due.getMonth(), due.getDate())) / 86_400_000) : 0;
  return { ...state, invoiceStatus, paymentStatus, displayStatus, overdue, overdueDays, overdueAmount: overdue ? state.pending : 0, payments: invoicePayments.sort((a, b) => (toDate(b.paymentDate || b.createdAt) || 0) - (toDate(a.paymentDate || a.createdAt) || 0)) };
}

export { validPayment };
