"use client";

import { forwardRef } from "react";

import {
  formatPurchaseOrderStatusLabel,
  purchaseOrderStatusTone,
} from "../services/PurchaseOrderStatusPolicy";

export const money = (value) =>
  Number(value ?? 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (value) => {
  if (!value) return "—";
  const date = value?.toDate?.() || new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const text = (value) => String(value ?? "").trim();

function Detail({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        {label}
      </span>
      <strong className="mt-1 block text-sm text-slate-800">{value || "—"}</strong>
    </div>
  );
}

const PurchaseOrderDocument = forwardRef(function PurchaseOrderDocument(
  { purchaseOrder, company },
  ref
) {
  const companyName =
    company?.companyName ||
    company?.name ||
    company?.ownerName ||
    "Company";
  const companyLogo = company?.logoUrl || "";
  const vendor = {
    name:
      purchaseOrder?.vendorNameSnapshot ||
      purchaseOrder?.vendorCodeSnapshot ||
      purchaseOrder?.vendorId ||
      "",
    contact: purchaseOrder?.vendorContactSnapshot || "",
  };
  const project = {
    number: purchaseOrder?.projectNumberSnapshot || purchaseOrder?.projectId || "",
    name: purchaseOrder?.projectNameSnapshot || "",
  };
  const items = Array.isArray(purchaseOrder?.items) ? purchaseOrder.items : [];
  const statusClass = purchaseOrderStatusTone(purchaseOrder?.status);

  return (
    <article
      ref={ref}
      id="purchase-order-preview"
      className="purchase-order-document mx-auto w-full max-w-[900px] overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-700 shadow-sm print:border-0 print:shadow-none"
      aria-label={`Purchase Order ${text(purchaseOrder?.poNumber || "Draft")}`}
    >
      <div className="po-print-top border-b border-slate-200 px-6 py-5 sm:px-8">
        <div className="po-print-header flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${companyName} logo`}
                className="po-print-logo h-16 w-20 rounded-xl object-contain"
              />
            ) : (
              <div className="po-print-logo grid h-16 w-20 place-items-center rounded-xl bg-slate-100 text-sm font-black text-slate-500">
                LOGO
              </div>
            )}
            <div>
              <h1 className="text-2xl font-black text-slate-900">{companyName}</h1>
              <p className="mt-1 text-xs text-slate-500">
                {text(company?.companyAddress || company?.address)}
              </p>
              {(company?.gstNumber || company?.gstin) && (
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  GSTIN: {company.gstNumber || company.gstin}
                </p>
              )}
              <p className="mt-1 text-xs text-slate-500">
                {[company?.phone, company?.companyEmail].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          <div className="po-print-order-card rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
              Purchase Order
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">
              {text(purchaseOrder?.poNumber || "Draft")}
            </h2>
            <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusClass}`}>
              {formatPurchaseOrderStatusLabel(purchaseOrder?.status)}
            </span>
          </div>
        </div>

        <div className="po-print-meta mt-5 grid gap-3 md:grid-cols-3">
          <Detail label="PO Date" value={formatDate(purchaseOrder?.poDate)} />
          <Detail label="Expected Delivery" value={formatDate(purchaseOrder?.expectedDeliveryDate)} />
          <Detail label="Prepared By" value={purchaseOrder?.preparedBy?.name || "—"} />
        </div>
      </div>

      <div className="po-print-parties grid gap-6 px-6 py-5 sm:px-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Vendor
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{vendor.name || "—"}</h3>
          {vendor.contact && <p className="mt-1 text-sm text-slate-600">{vendor.contact}</p>}
          {purchaseOrder?.vendorFirestoreId && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Vendor Ref: {purchaseOrder.vendorFirestoreId}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            Project
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900">{project.name || "—"}</h3>
          <p className="mt-1 text-sm text-slate-600">{project.number || "—"}</p>
          {purchaseOrder?.projectFirestoreId && (
            <p className="mt-2 text-xs font-semibold text-slate-500">
              Project Ref: {purchaseOrder.projectFirestoreId}
            </p>
          )}
        </section>
      </div>

      <div className="po-print-items px-6 pb-5 sm:px-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">#</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">HSN/SAC</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Unit</th>
                <th className="px-4 py-3 text-right">Rate</th>
                <th className="px-4 py-3 text-right">GST</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? items.map((item, index) => (
                <tr key={item.id || index} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    <div>{text(item.description)}</div>
                    {item.notes && <div className="mt-1 text-xs font-normal text-slate-500">{item.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{text(item.hsnSac)}</td>
                  <td className="px-4 py-3 text-right">{money(item.quantity)}</td>
                  <td className="px-4 py-3">{text(item.unit || "Nos")}</td>
                  <td className="px-4 py-3 text-right">{money(item.rate)}</td>
                  <td className="px-4 py-3 text-right">{money(item.gstAmount)} ({Number(item.gstRate || 0)}%)</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">{money(item.amount)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" className="px-4 py-10 text-center text-slate-500">
                    No items added.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 text-sm">
              <tr>
                <td colSpan="7" className="px-4 py-3 text-right font-semibold text-slate-600">
                  Subtotal
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  ₹ {money(purchaseOrder?.subtotal)}
                </td>
              </tr>
              <tr>
                <td colSpan="7" className="px-4 py-3 text-right font-semibold text-slate-600">
                  GST
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-900">
                  ₹ {money(purchaseOrder?.gstTotal)}
                </td>
              </tr>
              <tr>
                <td colSpan="7" className="px-4 py-3 text-right text-base font-black text-slate-900">
                  Grand Total
                </td>
                <td className="px-4 py-3 text-right text-base font-black text-slate-900">
                  ₹ {money(purchaseOrder?.grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="po-print-commercial grid gap-4 px-6 pb-6 sm:px-8 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            Commercial Details
          </h3>
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Payment Terms</span>
              <p className="mt-1 whitespace-pre-line">{text(purchaseOrder?.paymentTerms || "—")}</p>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Scope</span>
              <p className="mt-1 whitespace-pre-line">{text(purchaseOrder?.scope || "—")}</p>
            </div>
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">Remarks</span>
              <p className="mt-1 whitespace-pre-line">{text(purchaseOrder?.remarks || "—")}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
            Terms & Conditions
          </h3>
          <div className="mt-3 whitespace-pre-line text-sm text-slate-700">
            {text(purchaseOrder?.termsAndConditions || "—")}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Detail label="Approved By" value={purchaseOrder?.approvedBy?.name || "—"} />
            <Detail label="Current Status" value={formatPurchaseOrderStatusLabel(purchaseOrder?.status)} />
          </div>
        </section>
      </div>

      <div className="po-print-footer grid gap-4 border-t border-slate-200 px-6 py-5 sm:px-8 md:grid-cols-2 print:hidden">
        <section>
          <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Audit Trail
          </span>
          <div className="mt-2 space-y-2">
            {(purchaseOrder?.auditTrail || []).length ? purchaseOrder.auditTrail.slice().reverse().map((entry, index) => (
              <div key={`${entry.action}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-slate-800">{formatPurchaseOrderStatusLabel(entry.action)}</strong>
                  <span className="text-xs text-slate-500">{entry.byName || "System"} · {entry.at ? formatDate(entry.at) : "—"}</span>
                </div>
                {entry.notes && <p className="mt-1 text-xs text-slate-500">{entry.notes}</p>}
              </div>
            )) : (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                No audit trail yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Prepared By
          </span>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-4">
            <h4 className="text-base font-bold text-slate-900">{purchaseOrder?.preparedBy?.name || "—"}</h4>
            <p className="mt-1 text-sm text-slate-600">{purchaseOrder?.preparedBy?.role || "—"}</p>
            <p className="mt-1 text-xs text-slate-500">UID: {purchaseOrder?.preparedBy?.uid || "—"}</p>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 8mm;
        }

        @page :first {
          margin: 8mm;
        }

        @media print {
          html,
          body.purchase-order-pdf-print {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body.purchase-order-pdf-print > *:not(#purchase-order-print-root) {
            display: none !important;
          }

          #purchase-order-print-root {
            display: block !important;
            width: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #purchase-order-print-root .purchase-order-document {
            width: 100% !important;
            max-width: none !important;
            max-height: none !important;
            min-height: auto !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            transform: none !important;
            zoom: 1 !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          #purchase-order-print-root .purchase-order-document * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          #purchase-order-print-root .po-print-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) auto !important;
            gap: 6mm !important;
            align-items: start !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-meta {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 3mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-parties {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 4mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-commercial {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 4mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-footer {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 4mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-footer > section:first-child {
            display: none !important;
          }

          #purchase-order-print-root .po-print-footer > section:last-child {
            grid-column: 1 / -1 !important;
          }

          #purchase-order-print-root .purchase-order-document .rounded-2xl,
          #purchase-order-print-root .purchase-order-document .rounded-xl {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .purchase-order-document table {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          #purchase-order-print-root .purchase-order-document thead {
            display: table-header-group !important;
          }

          #purchase-order-print-root .purchase-order-document tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: auto !important;
          }

          #purchase-order-print-root .purchase-order-document .print\\:hidden {
            display: none !important;
          }


          /* Compact A4 print overrides. */
          #purchase-order-print-root .purchase-order-document {
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            color: #334155 !important;
            font-size: 8.5pt !important;
            line-height: 1.25 !important;
          }

          #purchase-order-print-root .po-print-top {
            padding: 0 0 4mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          #purchase-order-print-root .po-print-logo {
            width: 16mm !important;
            height: 12mm !important;
            border-radius: 1.5mm !important;
          }

          #purchase-order-print-root .po-print-header { gap: 5mm !important; }
          #purchase-order-print-root .po-print-header h1 { font-size: 14pt !important; line-height: 1.1 !important; }
          #purchase-order-print-root .po-print-header p { margin-top: 1mm !important; font-size: 7.5pt !important; }

          #purchase-order-print-root .po-print-order-card {
            padding: 2.5mm 3mm !important;
            border-radius: 1.5mm !important;
          }
          #purchase-order-print-root .po-print-order-card h2 { margin-top: .5mm !important; font-size: 15pt !important; line-height: 1 !important; }
          #purchase-order-print-root .po-print-order-card span { margin-top: 1.5mm !important; padding: .75mm 2mm !important; font-size: 7pt !important; }

          #purchase-order-print-root .po-print-meta {
            gap: 2mm !important;
            margin-top: 3mm !important;
          }
          #purchase-order-print-root .po-print-meta .rounded-xl { padding: 1.5mm 2mm !important; border-radius: 1.5mm !important; }
          #purchase-order-print-root .po-print-meta .rounded-xl span { font-size: 6.5pt !important; letter-spacing: .08em !important; }
          #purchase-order-print-root .po-print-meta .rounded-xl strong { margin-top: .5mm !important; font-size: 8.5pt !important; }

          #purchase-order-print-root .po-print-parties { gap: 2mm !important; padding: 3mm 0 !important; }
          #purchase-order-print-root .po-print-parties > section { padding: 2.5mm 3mm !important; border-radius: 1.5mm !important; }
          #purchase-order-print-root .po-print-parties h3 { margin-top: .5mm !important; font-size: 10pt !important; }
          #purchase-order-print-root .po-print-parties p { margin-top: .75mm !important; font-size: 7.5pt !important; }

          #purchase-order-print-root .po-print-items { padding: 0 0 3mm !important; }
          #purchase-order-print-root .po-print-items > div { border-radius: 1.5mm !important; }
          #purchase-order-print-root .purchase-order-document table { width: 100% !important; font-size: 7.5pt !important; line-height: 1.2 !important; }
          #purchase-order-print-root .purchase-order-document th,
          #purchase-order-print-root .purchase-order-document td { padding: 1.5mm 1.75mm !important; }
          #purchase-order-print-root .purchase-order-document thead th { font-size: 6.5pt !important; letter-spacing: .05em !important; }
          #purchase-order-print-root .purchase-order-document td small { margin-top: .5mm !important; font-size: 6.5pt !important; }
          #purchase-order-print-root .purchase-order-document tfoot td { padding-top: 1.5mm !important; padding-bottom: 1.5mm !important; }

          #purchase-order-print-root .po-print-commercial { gap: 2mm !important; padding: 0 0 3mm !important; }
          #purchase-order-print-root .po-print-commercial > section { padding: 2.5mm 3mm !important; border-radius: 1.5mm !important; }
          #purchase-order-print-root .po-print-commercial h3 { font-size: 8pt !important; }
          #purchase-order-print-root .po-print-commercial .space-y-3 > div + div { margin-top: 1.5mm !important; }
          #purchase-order-print-root .po-print-commercial p,
          #purchase-order-print-root .po-print-commercial .text-sm { font-size: 7.5pt !important; }
          #purchase-order-print-root .po-print-commercial .mt-3 { margin-top: 1.5mm !important; }
          #purchase-order-print-root .po-print-commercial .mt-5 { margin-top: 2mm !important; }

          #purchase-order-print-root .po-print-footer.print\:hidden {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 2mm !important;
            padding: 3mm 0 0 !important;
          }
          #purchase-order-print-root .po-print-footer > section:last-child { padding: 2.5mm 3mm !important; border-radius: 1.5mm !important; }
          #purchase-order-print-root .po-print-footer > section:last-child .mt-3 { margin-top: 1.5mm !important; }
          #purchase-order-print-root .po-print-footer > section:last-child .mt-3 > div { padding: 2mm 3mm !important; }
          #purchase-order-print-root .po-print-footer > section:last-child h4 { font-size: 9pt !important; }
          #purchase-order-print-root .po-print-footer > section:last-child p { margin-top: .5mm !important; font-size: 7.5pt !important; }
        }
      `}</style>
    </article>
  );
});

export default PurchaseOrderDocument;
