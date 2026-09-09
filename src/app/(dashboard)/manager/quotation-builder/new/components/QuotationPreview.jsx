"use client";

import { useEffect, useState } from "react";
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    Globe2,
    Mail,
    MapPin,
    Landmark,
    Phone,
} from "lucide-react";
import QRCode from "qrcode";

import QuotationCalculationService from "../../services/QuotationCalculationService";
import QuotationExportService from "../../services/QuotationExportService";

const money = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const addressText = (value) =>
    typeof value === "object" && value
        ? [
            value.line1,
            value.line2,
            value.city,
            value.state,
            value.pincode,
            value.country,
        ]
            .filter(Boolean)
            .join(", ")
        : value || "";

const proxiedImage = (url) =>
    url?.includes("firebasestorage.googleapis.com")
        ? `/api/billing/image?url=${encodeURIComponent(url)}`
        : url;

const localDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === "function") return value.toDate();
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value) => {
    const date = localDate(value);
    return date
        ? date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : "—";
};

const validityText = (quotationDate, validUntil) => {
    const start = localDate(quotationDate);
    const end = localDate(validUntil);
    if (!end) return "—";
    if (!start) return formatDate(validUntil);
    const days = Math.round((end.getTime() - start.getTime()) / 86400000);
    return days >= 0 ? `${days} Day${days === 1 ? "" : "s"}` : formatDate(validUntil);
};

function DetailLine({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-2.5 text-[11px] leading-5 text-slate-600">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-blue-50 text-blue-600">
                <Icon size={11} strokeWidth={2} />
            </span>
            {label && <span className="min-w-20 font-semibold text-slate-500">{label}</span>}
            <span className="min-w-0 flex-1 break-words text-slate-700">{value}</span>
        </div>
    );
}

export default function QuotationPreview({
    company,
    settings,
    form,
    template = "modern",
}) {
    const total = QuotationCalculationService.calculate(form);
    const [websiteQr, setWebsiteQr] = useState("");
    const branding = settings?.branding || {};
    const bank = settings?.bank || {};
    const signature = settings?.signature || {};

    const companyName =
        branding.companyName ||
        company?.companyName ||
        company?.name ||
        "Company";
    const companyLogo = branding.logo || company?.logoUrl || company?.logo || "";
    const companyAddress = addressText(
        branding.address || company?.companyAddress || company?.address
    );
    const companyPhone = [
        branding.phone,
        company?.phone,
        company?.companyPhone,
        company?.secondaryPhone,
        company?.ownerPhone,
    ]
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .join(" | ");
    const companyEmail =
        branding.email || company?.companyEmail || company?.ownerEmail || company?.email || "";
    const companyWebsite = branding.website || company?.website || "";
    const companyWebsiteUrl = companyWebsite && !/^https?:\/\//i.test(companyWebsite)
        ? `https://${companyWebsite}`
        : companyWebsite;
    const companyGstNumber =
        branding.gstNumber || company?.gstNumber || company?.gstin || company?.gstNo || "";
    const footerText =
        settings?.quotationFooter ||
        settings?.footerText ||
        branding.footerText ||
        "Thank you for the opportunity to serve you.";

    const palettes = {
        modern: {
            primary: branding.primaryColor || "#2563eb",
            dark: branding.secondaryColor || "#0f172a",
        },
        classic: { primary: "#92400e", dark: "#292524" },
        minimal: { primary: "#475569", dark: "#0f172a" },
    };
    const palette = palettes[template] || palettes.modern;

    useEffect(() => {
        let active = true;
        if (!companyWebsiteUrl) {
            setWebsiteQr("");
            return undefined;
        }
        QRCode.toDataURL(companyWebsiteUrl, { width: 160, margin: 1, errorCorrectionLevel: "M" })
            .then((value) => { if (active) setWebsiteQr(value); })
            .catch(() => { if (active) setWebsiteQr(""); });
        return () => { active = false; };
    }, [companyWebsiteUrl]);

    useEffect(() => {
        let active = true;
        let restorePreparedImages = () => { };
        const preview = document.getElementById("quotation-preview");

        QuotationExportService.prepareDocument(preview).then((restore) => {
            if (active) restorePreparedImages = restore;
            else restore();
        }).catch((error) => {
            console.warn("Quotation print assets could not be preloaded:", error);
        });

        return () => {
            active = false;
            restorePreparedImages();
        };
    }, [companyLogo, websiteQr, signature.preparedBySignature, signature.signature, signature.seal]);

    return (
        <div className="flex justify-center py-4">
            <article
                id="quotation-preview"
                className="quotation-document relative w-full max-w-[820px] overflow-hidden bg-white text-slate-700 shadow-lg"
                style={{
                    fontFamily: template === "classic" ? "Georgia, serif" : "Arial, sans-serif",
                }}
            >
                <div className="h-2" style={{ backgroundColor: palette.primary }} />

                <div className="quotation-content relative px-5 py-7 sm:px-8 lg:px-10">
                    {companyLogo && (
                        <div className="quotation-watermark pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.025]" aria-hidden="true">
                            <img
                                src={proxiedImage(companyLogo)}
                                crossOrigin="anonymous"
                                alt=""
                                className="max-h-72 w-72 object-contain"
                            />
                        </div>
                    )}

                    <header className="quotation-header relative grid gap-7 border-b border-slate-200 pb-7 md:grid-cols-5 md:gap-0">
                        <div className="quotation-company-block md:col-span-3 md:pr-8">
                            <div className="flex items-start gap-4">
                                {companyLogo && (
                                    <img
                                        src={proxiedImage(companyLogo)}
                                        crossOrigin="anonymous"
                                        alt={`${companyName} logo`}
                                        className="h-16 w-20 shrink-0 object-contain"
                                    />
                                )}
                                <div className="min-w-0">
                                    <h1 className="text-3xl font-bold tracking-tight" style={{ color: palette.dark }}>
                                        {companyName}
                                    </h1>
                                    {branding.tagline && (
                                        <p className="mt-1 text-xs italic text-slate-500">{branding.tagline}</p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-5 space-y-1.5">
                                <DetailLine icon={MapPin} value={companyAddress} />
                                <DetailLine icon={Phone} value={companyPhone} />
                                <div className="quotation-company-contact grid gap-1.5 sm:grid-cols-2">
                                    <DetailLine icon={Mail} value={companyEmail} />
                                    <DetailLine icon={Globe2} value={companyWebsite} />
                                </div>
                                {companyGstNumber && (
                                    <p className="pt-1 text-[11px] font-bold tracking-wide text-slate-700">
                                        GSTIN: {companyGstNumber}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="quotation-info-block border-t border-slate-200 pt-6 md:col-span-2 md:border-t-0 md:border-l md:pt-0 md:pl-8">
                            <p className="text-xl font-bold tracking-[0.12em]" style={{ color: palette.primary }}>
                                QUOTATION
                            </p>
                            <div className="mt-6 space-y-3">
                                <DetailLine icon={FileText} label="Quotation No." value={form.quotationNumber || "—"} />
                                <DetailLine icon={CalendarDays} label="Date" value={formatDate(form.quotationDate)} />
                                <DetailLine icon={Clock3} label="Validity" value={validityText(form.quotationDate, form.validUntil)} />
                            </div>
                        </div>
                    </header>

                    <section className="quotation-client-section relative grid gap-6 border-b border-slate-200 py-6 md:grid-cols-5">
                        <div className="md:col-span-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: palette.primary }}>
                                Quotation For
                            </p>
                            <h2 className="mt-2 text-lg font-bold" style={{ color: palette.dark }}>
                                {form.clientName || "Client"}
                            </h2>
                            {form.contactPerson && <p className="mt-1 text-xs">Attn: {form.contactPerson}</p>}
                            {form.billingAddress && <p className="mt-2 max-w-md text-xs leading-5 text-slate-600">{addressText(form.billingAddress)}</p>}
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                                {form.phone && <span>{form.phone}</span>}
                                {form.email && <span>{form.email}</span>}
                            </div>
                            {form.gstNumber && <p className="mt-2 text-xs font-bold">GSTIN: {form.gstNumber}</p>}
                        </div>
                        <div className="md:col-span-2 md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: palette.primary }}>
                                Subject
                            </p>
                            <p className="mt-2 text-sm font-semibold" style={{ color: palette.dark }}>{form.subject || "—"}</p>
                            {form.salesPerson && <p className="mt-3 text-xs text-slate-500">Prepared by {form.salesPerson}</p>}
                        </div>
                    </section>

                    <div className="relative mt-6 overflow-hidden border border-slate-200">
                        <table className="w-full table-fixed border-collapse text-[11px]">
                            <thead>
                                <tr className="text-white" style={{ backgroundColor: palette.dark }}>
                                    <th className="w-[5%] px-2 py-3 text-center">No.</th>
                                    <th className="w-[34%] px-3 py-3 text-left">Description</th>
                                    <th className="w-[11%] px-2 py-3 text-left">HSN Code</th>
                                    <th className="w-[14%] px-2 py-3 text-right">Unit Price</th>
                                    <th className="w-[8%] px-2 py-3 text-right">Qty</th>
                                    <th className="w-[9%] px-2 py-3 text-left">Units</th>
                                    <th className="w-[19%] px-3 py-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {total.items.map((item, index) => (
                                    <tr key={item.id || index} className="border-b border-slate-200 last:border-b-0">
                                        <td className="px-2 py-3 text-center align-top font-semibold">{index + 1}</td>
                                        <td className="px-3 py-3 align-top">
                                            <strong className="font-semibold" style={{ color: palette.dark }}>{item.description || "Item"}</strong>
                                            {(item.subDescriptions || []).map((description, subIndex) => description && (
                                                <p key={subIndex} className="mt-1 pl-2 text-[10px] leading-4 text-slate-500">• {description}</p>
                                            ))}
                                        </td>
                                        <td className="px-2 py-3 align-top">{item.hsn || "—"}</td>
                                        <td className="px-2 py-3 text-right align-top">₹{money(item.rate)}</td>
                                        <td className="px-2 py-3 text-right align-top">{Number(item.qty || 0)}</td>
                                        <td className="px-2 py-3 align-top">{item.unit || "—"}</td>
                                        <td className="px-3 py-3 text-right align-top font-bold">₹{money(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <section className="quotation-terms-summary relative mt-7 grid gap-7 md:grid-cols-5">
                        <div className="quotation-terms md:col-span-3">
                            <div className="flex items-center gap-2">
                                <FileText size={14} style={{ color: palette.primary }} />
                                <h3 className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: palette.dark }}>
                                    Terms &amp; Conditions
                                </h3>
                            </div>
                            <div className="mt-3 space-y-2">
                                {(form.terms || []).filter(Boolean).map((term, index) => (
                                    <div key={index} className="flex items-start gap-2 text-[11px] leading-5 text-slate-600">
                                        <CheckCircle2 size={13} className="mt-1 shrink-0" style={{ color: palette.primary }} />
                                        <span>{term}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="self-start overflow-hidden rounded-xl border border-slate-200 md:col-span-2">

                            {/* Highlighted Subtotal */}
                            <div
                                className="flex items-center justify-between gap-4 px-7 py-5"
                                style={{ backgroundColor: `${palette.dark}20` }}
                            >
                                <span
                                    className="text-[15px] font-bold uppercase tracking-wide"
                                    style={{ color: palette.dark }}
                                >
                                    Subtotal
                                </span>

                                <strong
                                    className="whitespace-nowrap text-[22px] font-extrabold"
                                    style={{ color: palette.dark }}
                                >
                                    ₹{money(total.subtotal)}
                                </strong>
                            </div>

                            {/* Tax Details */}
                            <div className="space-y-3 border-t border-slate-200 px-7 py-4 text-xs text-slate-600">
                                {total.taxMode === "igst" && (
                                    <div className="flex justify-between gap-4">
                                        <span>IGST 18%</span>
                                        <span>₹{money(total.igst)}</span>
                                    </div>
                                )}

                                {total.taxMode === "cgst_sgst" && (
                                    <>
                                        <div className="flex justify-between gap-4">
                                            <span>CGST 9%</span>
                                            <span>₹{money(total.cgst)}</span>
                                        </div>

                                        <div className="flex justify-between gap-4">
                                            <span>SGST 9%</span>
                                            <span>₹{money(total.sgst)}</span>
                                        </div>
                                    </>
                                )}

                                {total.extraCharges > 0 && (
                                    <div className="flex justify-between gap-4">
                                        <span>Other charges</span>
                                        <span>₹{money(total.extraCharges)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Less Highlighted Total */}
                            <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-7 py-4">
                                <span className="text-[12px] uppercase tracking-wider text-slate-500">
                                    Total Amount
                                </span>

                                <strong
                                    className="whitespace-nowrap text-[14px]"
                                    style={{ color: palette.dark }}
                                >
                                    ₹{money(total.grandTotal)}
                                </strong>
                            </div>

                        </div>
                    </section>

                    {(bank.bankName || bank.accountNumber || bank.ifsc || bank.branch) && (
                        <section className="relative mt-8 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-4 sm:px-7">
                            <div className="quotation-bank-layout flex flex-col gap-5 md:flex-row md:items-center">
                                <div className="flex min-w-0 items-center gap-4 md:flex-1">
                                    <div className="grid h-[70px] w-[70px] shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                                        <Landmark size={34} strokeWidth={1.8} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-lg font-bold uppercase tracking-wide" style={{ color: palette.dark }}>
                                            {bank.bankName ? `${bank.bankName} Details` : "Bank Details"}
                                        </h3>
                                        <div className="quotation-bank-fields mt-4 grid gap-4 text-[11px] sm:grid-cols-3 sm:gap-0">
                                            <div className="sm:pr-4">
                                                <p className="font-semibold text-slate-500">Account No.</p>
                                                <p className="mt-1 break-all font-bold text-slate-800">{bank.accountNumber || "—"}</p>
                                            </div>
                                            <div className="border-slate-300 sm:border-l sm:px-4">
                                                <p className="font-semibold text-slate-500">NEFT / RTGS No.</p>
                                                <p className="mt-1 break-all font-bold text-slate-800">{bank.ifsc || "—"}</p>
                                            </div>
                                            <div className="border-slate-300 sm:border-l sm:pl-4">
                                                <p className="font-semibold text-slate-500">Bank Branch</p>
                                                <p className="mt-1 font-bold text-slate-800">{bank.branch || "—"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {websiteQr && (
                                    <div className="flex shrink-0 items-center gap-3 border-slate-200 md:border-l md:pl-5">
                                        <img src={websiteQr} alt="Company website QR code" className="h-15 w-15 object-contain" />
                                        <p className="text-[10px] font-bold uppercase leading-4 tracking-wider text-slate-600">Scan to visit<br />our website</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    <section className="quotation-signatures relative justify-between mt-9 grid grid-cols-1 gap-6 border-t border-slate-200 pt-7 text-center sm:grid-cols-2">
                        <div className="flex min-h-28 flex-col items-center justify-end">
                            <p className="mb-auto text-[10px] font-bold uppercase tracking-wider text-slate-500">Prepared By</p>
                            {signature.preparedBySignature && <img src={proxiedImage(signature.preparedBySignature)} crossOrigin="anonymous" alt="Prepared By signature" onError={(event) => { event.currentTarget.style.display = "none"; }} className="mb-1 max-h-20 max-w-40 object-contain" />}
                            <div className="w-32 border-b border-slate-400" />
                            <p className="mt-2 text-xs font-bold" style={{ color: palette.dark }}>{form.salesPerson || companyName}</p>
                            <p className="text-[10px] text-slate-500">{companyName}</p>
                        </div>
                        {/* <div className="flex min-h-28 flex-col items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Company Stamp</p>
                            {signature.seal && <img src={proxiedImage(signature.seal)} crossOrigin="anonymous" alt="Company stamp" className="max-h-20 max-w-32 object-contain" />}
                        </div> */}
                        <div className="flex min-h-28 flex-col items-center justify-end">
                            <p className="mb-auto text-[10px] font-bold uppercase tracking-wider text-slate-500">Authorized Signatory</p>
                            {signature.signature && <img src={proxiedImage(signature.signature)} crossOrigin="anonymous" alt="Authorized signature" className="mb-1 max-h-14 max-w-32 object-contain" />}
                            <div className="w-32 border-b border-slate-400" />
                            <p className="mt-2 text-xs font-bold" style={{ color: palette.dark }}>{signature.signatory || "Authorized Signatory"}</p>
                            <p className="text-[10px] text-slate-500">{companyName}</p>
                        </div>
                    </section>

                    <footer className="relative mt-7 border-t border-slate-200 pt-5 text-center">
                        <p className="text-[10px] italic text-slate-500">{footerText}</p>
                        <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[10px] text-slate-600">
                            {companyPhone && <span className="flex items-center gap-1"><Phone size={10} />{companyPhone}</span>}
                            {companyEmail && <span className="flex items-center gap-1"><Mail size={10} />{companyEmail}</span>}
                            {companyWebsite && <span className="flex items-center gap-1"><Globe2 size={10} />{companyWebsite}</span>}
                        </div>
                    </footer>
                </div>
            </article>
            <style jsx global>{`
                @page {
                    size: A4;
                    margin: 12mm 0;
                }

                @page :first {
                    margin: 0;
                }

                @media print {
                    html,
                    body.quotation-pdf-print {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    body.quotation-pdf-print > *:not(#quotation-print-root) {
                        display: none !important;
                    }

                    #quotation-print-root {
                        display: block !important;
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    #quotation-print-root .quotation-document {
                        width: 210mm !important;
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
                    }

                    #quotation-print-root .quotation-document * {
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }

                    #quotation-print-root .quotation-content {
                        position: relative !important;
                        z-index: 1 !important;
                        padding: 7mm 10mm !important;
                    }

                    #quotation-print-root .quotation-header {
                        display: grid !important;
                        grid-template-columns: 60% 40% !important;
                        gap: 0 !important;
                        align-items: start !important;
                    }

                    #quotation-print-root .quotation-company-block {
                        grid-column: 1 !important;
                        min-width: 0 !important;
                        padding-right: 8mm !important;
                    }

                    #quotation-print-root .quotation-info-block {
                        grid-column: 2 !important;
                        min-width: 0 !important;
                        border-top: 0 !important;
                        border-left: 1px solid #e2e8f0 !important;
                        padding-top: 0 !important;
                        padding-left: 8mm !important;
                    }

                    #quotation-print-root .quotation-company-contact {
                        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
                    }

                    #quotation-print-root .quotation-client-section,
                    #quotation-print-root .quotation-terms-summary {
                        grid-template-columns: minmax(0, 3fr) minmax(0, 2fr) !important;
                    }

                    #quotation-print-root .quotation-client-section > :first-child,
                    #quotation-print-root .quotation-terms-summary > :first-child {
                        grid-column: 1 !important;
                        min-width: 0 !important;
                    }

                    #quotation-print-root .quotation-client-section > :last-child,
                    #quotation-print-root .quotation-terms-summary > :last-child {
                        grid-column: 2 !important;
                        min-width: 0 !important;
                    }

                    #quotation-print-root .quotation-bank-layout {
                        flex-direction: row !important;
                        align-items: center !important;
                    }

                    #quotation-print-root .quotation-bank-layout > :first-child {
                        flex: 1 1 0% !important;
                    }

                    #quotation-print-root .quotation-bank-fields,
                    #quotation-print-root .quotation-signatures {
                        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                    }

                    #quotation-print-root .quotation-watermark {
                        position: fixed !important;
                        inset: 0 !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        transform: none !important;
                        opacity: 0.04 !important;
                        pointer-events: none !important;
                        z-index: 0 !important;
                    }

                    #quotation-print-root .quotation-watermark img {
                        width: 74mm !important;
                        max-width: 74mm !important;
                        max-height: 74mm !important;
                        object-fit: contain !important;
                    }

                    #quotation-print-root table {
                        break-inside: auto;
                    }

                    #quotation-print-root thead {
                        display: table-header-group;
                    }

                    #quotation-print-root tr,
                    #quotation-print-root section,
                    #quotation-print-root footer {
                        break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}
