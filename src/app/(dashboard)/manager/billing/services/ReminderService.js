const day = 86_400_000;
export const toDate = (value) => value?.toDate?.() || (value ? new Date(value) : null);
export default class ReminderService {
  static aging(invoice, now = new Date()) {
    const due = toDate(invoice.dueDate); const pending = Number(invoice.pendingAmount ?? invoice.receivable ?? invoice.invoiceAmount ?? 0) - Number(invoice.paidAmount || 0);
    if (!due || pending <= 0 || ["paid", "cancelled", "draft"].includes(String(invoice.status || "").toLowerCase())) return { overdueDays: 0, reminder: null, overdueAmount: 0 };
    const difference = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(due.getFullYear(), due.getMonth(), due.getDate())) / day);
    const milestones = { "-3": "3 days before due", 0: "Due today", 3: "3 days overdue", 7: "7 days overdue", 15: "15 days overdue", 30: "30 days overdue" };
    return { overdueDays: Math.max(0, difference), reminder: milestones[difference] || null, overdueAmount: difference > 0 ? pending : 0 };
  }
}
