const number = (value) => Number(value ?? 0) || 0;
const currency = (value) => Math.round((number(value) + Number.EPSILON) * 100) / 100;
export default class InvoiceCalculationService {
  static calculate(input) {
    const items = (input.items || []).map((item) => ({ ...item, quantity: number(item.quantity), rate: currency(item.rate), amount: currency(number(item.quantity) * number(item.rate)) }));
    const subtotal = currency(items.reduce((sum, item) => sum + item.amount, 0));
    const discount = currency(input.discountType === "percent" ? subtotal * number(input.discount) / 100 : number(input.discount));
    const taxableValue = currency(Math.max(0, subtotal - discount));
    const gstRate = number(input.gstRate); const gst = currency(taxableValue * gstRate / 100);
    const invoiceAmount = currency(taxableValue + gst);
    const tdsRate = number(input.tdsRate); const tds = currency(taxableValue * tdsRate / 100);
    return { items, subtotal, discount, taxableValue, gstRate, gst, tdsRate, tds, invoiceAmount, receivable: currency(Math.max(0, invoiceAmount - tds)) };
  }
}
export { currency, number };
