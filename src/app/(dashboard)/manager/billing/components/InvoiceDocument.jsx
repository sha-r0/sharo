"use client";

import { forwardRef } from "react";

export const money = (value) => Number(value ?? 0).toLocaleString("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const wordsBelowThousand = (value) => {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const parts = [];
  let number = value;
  if (number >= 100) {
    parts.push(`${ones[Math.floor(number / 100)]} Hundred`);
    number %= 100;
  }
  if (number >= 20) {
    parts.push(tens[Math.floor(number / 10)]);
    number %= 10;
  }
  if (number > 0) parts.push(ones[number]);
  return parts.join(" ");
};

export const amountInWords = (value) => {
  let number = Math.round(Number(value ?? 0));
  if (!Number.isFinite(number) || number <= 0) return "INR Zero Only";
  const parts = [];
  [[10_000_000, "Crore"], [100_000, "Lakh"], [1_000, "Thousand"]].forEach(([size, label]) => {
    if (number >= size) {
      parts.push(`${wordsBelowThousand(Math.floor(number / size))} ${label}`);
      number %= size;
    }
  });
  if (number) parts.push(wordsBelowThousand(number));
  return `INR ${parts.join(" ")} Only`;
};

const text = (value) => value ?? "";
const Detail = ({ label, value }) => <div><span className="invoice-label">{label}</span><strong>{text(value)}</strong></div>;
const Address = ({ title, party }) => <section className="invoice-party"><h3>{title}</h3><strong>{text(party.name)}</strong>{party.contactPerson && <span>{party.contactPerson}</span>}<span>{text(party.address)}</span>{party.gstNumber && <span>GSTIN: {party.gstNumber}</span>}<span>{[party.email, party.phone].filter(Boolean).join(" · ")}</span></section>;

const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice, company }, ref) {
  const seller = invoice.companySnapshot || {};
  const buyer = invoice.clientSnapshot || {};
  const gst = Number(invoice.gst ?? 0);
  const halfTax = gst / 2;
  const halfRate = Number(invoice.gstRate ?? 0) / 2;
  const items = invoice.items || [];
  const bank = invoice.bankDetails || {};
  const sellerName = seller.companyName || company?.companyName || "";

  return <article ref={ref} className="invoice-document" aria-label={`Invoice ${text(invoice.invoiceNumber)}`}>
    <h1>{text(invoice.type || "Tax Invoice")}</h1>
    <div className="invoice-top-grid">
      <section className="invoice-seller">
        <h2>{sellerName}</h2>
        <span>{text(seller.address || company?.companyAddress)}</span>
        {(seller.gstNumber || company?.gstNumber) && <strong>GSTIN: {seller.gstNumber || company?.gstNumber}</strong>}
        <span>{[seller.email || company?.companyEmail, seller.phone || company?.phone].filter(Boolean).join(" · ")}</span>
      </section>
      <section className="invoice-facts">
        <Detail label="Invoice No." value={invoice.invoiceNumber || "Draft"} />
        <Detail label="Dated" value={invoice.invoiceDate} />
        <Detail label="Delivery Note" value={invoice.projectBusinessId} />
        <Detail label="Payment Terms" value={invoice.dueDate ? `Due ${invoice.dueDate}` : ""} />
        <Detail label="Buyer Order No." value={invoice.poNumber} />
        <Detail label="Reference" value={invoice.projectName} />
        <Detail label="Dispatched Through" value="" />
        <Detail label="Destination" value="" />
      </section>
      <div className="invoice-addresses">
        <Address title="Consignee / Ship To" party={buyer} />
        <Address title="Buyer / Bill To" party={buyer} />
      </div>
      <section className="invoice-delivery"><Detail label="Terms of Delivery" value={invoice.terms} /></section>
    </div>

    <table className="invoice-items"><thead><tr><th>#</th><th>Description of Goods / Services</th><th>HSN/SAC</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Tax</th><th>Amount</th></tr></thead>
      <tbody>{items.map((item, index) => <tr key={item.id || index}><td>{index + 1}</td><td><strong>{text(item.description)}</strong>{item.details && <small>{item.details}</small>}</td><td>{text(item.hsnCode || invoice.hsnCode)}</td><td>{text(item.quantity)}</td><td>{text(item.unit || "Nos")}</td><td>{money(item.rate)}</td><td>{Number(invoice.gstRate ?? 0)}%</td><td>{money(item.amount ?? Number(item.quantity ?? 0) * Number(item.rate ?? 0))}</td></tr>)}</tbody>
      <tfoot><tr><td colSpan="7">Subtotal</td><td>{money(invoice.subtotal)}</td></tr>{Number(invoice.discount ?? 0) > 0 && <tr><td colSpan="7">Discount</td><td>− {money(invoice.discount)}</td></tr>}<tr><td colSpan="7">Output CGST @ {halfRate}%</td><td>{money(halfTax)}</td></tr><tr><td colSpan="7">Output SGST @ {halfRate}%</td><td>{money(halfTax)}</td></tr><tr className="invoice-total"><td colSpan="7">Grand Total</td><td>₹ {money(invoice.invoiceAmount)}</td></tr></tfoot>
    </table>

    <section className="invoice-words"><span>Amount Chargeable (in words)</span><strong>{amountInWords(invoice.invoiceAmount)}</strong></section>
    <table className="invoice-tax"><thead><tr><th>HSN/SAC</th><th>Taxable Value</th><th>CGST Rate</th><th>CGST Amount</th><th>SGST Rate</th><th>SGST Amount</th><th>Total Tax</th></tr></thead><tbody><tr><td>{items.map((item) => item.hsnCode || invoice.hsnCode).filter(Boolean).join(", ")}</td><td>{money(invoice.taxableValue)}</td><td>{halfRate}%</td><td>{money(halfTax)}</td><td>{halfRate}%</td><td>{money(halfTax)}</td><td>{money(gst)}</td></tr></tbody></table>
    <section className="invoice-tax-words"><span>Tax Amount (in words)</span><strong>{amountInWords(gst)}</strong></section>
    <div className="invoice-bottom">
      <section><h3>Declaration</h3><p>{text(invoice.notes || invoice.terms)}</p></section>
      <section><h3>Company&apos;s Bank Details</h3><p><b>Account Holder:</b> {text(bank.accountName)}</p><p><b>Bank:</b> {text(bank.bankName)}</p><p><b>Account No.:</b> {text(bank.accountNumber)}</p><p><b>Branch / IFSC:</b> {text(bank.ifsc)}</p><div className="invoice-signature">{seller.signatureUrl && <img src={seller.signatureUrl} alt="Authorised signature" />}<strong>for {sellerName}</strong><span>Authorised Signatory</span></div></section>
    </div>
    <footer>This is a Computer Generated Invoice</footer>
  </article>;
});

export default InvoiceDocument;
