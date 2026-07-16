"use client";

import QuotationCalculationService from "../../services/QuotationCalculationService";

const money = (value) => Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const addressText = (value) => typeof value === "object" && value ? [value.line1, value.line2, value.city, value.state, value.pincode, value.country].filter(Boolean).join(", ") : value || "—";
const proxiedImage = (url) => url?.includes("firebasestorage.googleapis.com") ? `/api/billing/image?url=${encodeURIComponent(url)}` : url;

export default function QuotationPreview({ company, settings, form, template = "modern" }) {
  const total = QuotationCalculationService.calculate(form);
  const branding = settings?.branding || {};
  const bank = settings?.bank || {};
  const signature = settings?.signature || {};
  const palettes = {
    modern: { primary: branding.primaryColor || "#2563eb", dark: branding.secondaryColor || "#0f172a", heading: "Modern" },
    classic: { primary: "#92400e", dark: "#292524", heading: "Classic" },
    minimal: { primary: "#334155", dark: "#0f172a", heading: "Minimal" },
  };
  const palette = palettes[template] || palettes.modern;

  return <div className="flex min-w-[820px] justify-center py-4">
    <article id="quotation-preview" className="w-[820px] overflow-hidden bg-white text-slate-700 shadow-xl" style={{ fontFamily: template === "classic" ? "Georgia, serif" : "Arial, sans-serif" }}>
      <div className={template === "minimal" ? "h-2" : "h-4"} style={{ backgroundColor: palette.primary }}/>
      <div className="p-10">
        <header className={`flex justify-between gap-8 pb-8 ${template === "classic" ? "border-b-2" : "border-b"}`} style={{ borderColor: palette.primary }}>
          <div className="flex gap-4">
            {branding.logo && <img src={proxiedImage(branding.logo)} crossOrigin="anonymous" alt="Company logo" className="h-16 w-20 object-contain"/>}
            <div><h1 className="text-2xl font-bold" style={{ color: palette.dark }}>{company?.companyName || branding.companyName || "Company"}</h1><p className="mt-1 text-sm text-slate-500">{branding.tagline}</p><p className="mt-3 max-w-[420px] text-xs leading-5">{addressText(company?.companyAddress || company?.address)}</p><p className="text-xs">{company?.phone || company?.companyPhone} {company?.companyEmail ? ` • ${company.companyEmail}` : ""}</p></div>
          </div>
          <div className="text-right"><p className="text-3xl font-bold tracking-wider" style={{ color: palette.primary }}>QUOTATION</p><p className="mt-3 font-bold">{form.quotationNumber}</p><p className="mt-1 text-xs">Date: {form.quotationDate || "—"}</p><p className="text-xs">Valid until: {form.validUntil || "—"}</p></div>
        </header>

        <section className="grid grid-cols-2 gap-8 py-7 text-sm"><div><p className="text-xs font-bold uppercase tracking-wider" style={{ color: palette.primary }}>Quotation for</p><p className="mt-2 text-lg font-bold" style={{ color: palette.dark }}>{form.clientName || "Client"}</p><p>{form.contactPerson}</p><p>{form.email}</p><p>{form.phone}</p><p className="mt-2 text-xs leading-5">{addressText(form.billingAddress)}</p></div><div className="space-y-2 text-right"><p><strong>Subject:</strong> {form.subject || "—"}</p><p><strong>Reference:</strong> {form.reference || "—"}</p><p><strong>Project:</strong> {form.projectName || "—"}</p><p><strong>Sales person:</strong> {form.salesPerson || "—"}</p></div></section>

        <table className="w-full border-collapse text-sm"><thead><tr style={{ backgroundColor: palette.primary, color: "#ffffff" }}><th className="p-3 text-left">#</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">HSN</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">GST</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{total.items.map((item, index) => <tr key={item.id || index} className="border-b border-slate-200"><td className="p-3">{index + 1}</td><td className="p-3"><strong>{item.description || "Item"}</strong></td><td className="p-3">{item.hsn || "—"}</td><td className="p-3 text-right">{item.qty} {item.unit}</td><td className="p-3 text-right">₹{money(item.rate)}</td><td className="p-3 text-right">{item.gst}%</td><td className="p-3 text-right font-bold">₹{money(item.total)}</td></tr>)}</tbody></table>

        <section className="mt-6 ml-auto w-80 space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><strong>₹{money(total.subtotal)}</strong></div><div className="flex justify-between"><span>Discount</span><span>₹{money(total.discount)}</span></div><div className="flex justify-between"><span>GST</span><span>₹{money(total.gst)}</span></div><div className="flex justify-between"><span>Other charges</span><span>₹{money(total.extraCharges)}</span></div><div className="flex justify-between border-t-2 pt-3 text-lg font-bold" style={{ borderColor: palette.primary, color: palette.dark }}><span>Grand Total</span><span>₹{money(total.grandTotal)}</span></div></section>

        <section className="mt-9 grid grid-cols-2 gap-8 border-t border-slate-200 pt-6 text-xs"><div><p className="font-bold" style={{ color: palette.primary }}>Terms & Conditions</p>{form.paymentTerms && <p className="mt-2"><strong>Payment:</strong> {form.paymentTerms}</p>}{form.deliveryTerms && <p><strong>Delivery:</strong> {form.deliveryTerms}</p>}{form.warranty && <p><strong>Warranty:</strong> {form.warranty}</p>}{form.notes && <p className="mt-2">{form.notes}</p>}<p className="mt-4 font-bold">Bank details</p><p>{bank.bankName} • A/C {bank.accountNumber} • IFSC {bank.ifsc}</p></div><div className="text-right">{signature.signature && <img src={proxiedImage(signature.signature)} crossOrigin="anonymous" alt="Signature" className="ml-auto h-14 object-contain"/>}<p className="mt-2 font-bold">{signature.signatory || "Authorized Signatory"}</p><p>{signature.designation}</p><p className="mt-5 text-slate-400">Template: {palette.heading}</p></div></section>
      </div>
    </article>
  </div>;
}
