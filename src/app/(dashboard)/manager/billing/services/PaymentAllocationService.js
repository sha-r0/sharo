const paise = (value) => Math.round((Number(value ?? 0) || 0) * 100);
const rupees = (value) => value / 100;

export function paymentState(invoice, paidValue = invoice.paidAmount) {
  const total = paise(invoice.receivable ?? invoice.invoiceAmount);
  const paid = Math.max(0, paise(paidValue));
  const balance = Math.max(0, total - paid);
  return {
    total: rupees(total),
    paid: rupees(paid),
    pending: rupees(balance),
    paymentStatus: balance === 0 && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
  };
}

export function allocatePayment(invoice, amount) {
  const current = paymentState(invoice);
  const payment = paise(amount);
  const balance = paise(current.pending);
  if (payment <= 0) return { valid: false, message: "Payment must be greater than zero." };
  if (payment > balance) return { valid: false, message: "Payment exceeds the invoice outstanding balance." };
  const next = paymentState(invoice, current.paid + rupees(payment));
  return { valid: true, ...next };
}

export { paise, rupees };
