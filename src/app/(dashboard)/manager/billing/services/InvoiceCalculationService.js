const number = (value) => Number(value || 0) || 0;
export default class InvoiceCalculationService {
  static calculate(input) {
    const items = (input.items || []).map((item) => ({ ...item, quantity: number(item.quantity), rate: number(item.rate), amount: number(item.quantity) * number(item.rate) }));
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = input.discountType === "percent" ? subtotal * number(input.discount) / 100 : number(input.discount);
    const taxableValue = Math.max(0, subtotal - discount);
    const gstRate = number(input.gstRate); const gst = taxableValue * gstRate / 100;
    const invoiceAmount = taxableValue + gst;
    const tdsRate = number(input.tdsRate); const tds = taxableValue * tdsRate / 100;
    return { items, subtotal, discount, taxableValue, gstRate, gst, tdsRate, tds, invoiceAmount, receivable: Math.max(0, invoiceAmount - tds) };
  }
}
export { number };
