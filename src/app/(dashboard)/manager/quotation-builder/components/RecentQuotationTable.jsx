"use client";

import {
    Eye,
    Pencil,
    FileDown,
    Trash2,
    FileText,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function RecentQuotationTable({

    quotations = [],

    onView,

    onEdit,

    onDownload,

    onDelete,

    totalQuotations = 0,

    page = 1,

    pageSize = 10,

    onPageChange,

    onPageSizeChange,

    emptyMessage = "No quotations yet.",

}) {

    function statusBadge(status) {

        switch (status) {

            case "Approved":

                return "bg-green-100 text-green-700";

            case "Sent":

                return "bg-blue-100 text-blue-700";

            case "Rejected":

                return "bg-red-100 text-red-700";

            case "Expired":

                return "bg-amber-100 text-amber-700";

            default:

                return "bg-slate-100 text-slate-700";

        }

    }

    function formatDate(value) {

        if (!value) return "--";

        try {

            let date;

            if (typeof value?.toDate === "function") {
                date = value.toDate();
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                const [year, month, day] = value.split("-").map(Number);
                date = new Date(year, month - 1, day);
            } else {
                date = new Date(value);
            }

            if (Number.isNaN(date.getTime())) return "--";

            return [
                String(date.getDate()).padStart(2, "0"),
                String(date.getMonth() + 1).padStart(2, "0"),
                date.getFullYear(),
            ].join("-");

        } catch {

            return "--";

        }

    }

    function validity(item) {

        if (item.validUntil) return `Valid till ${formatDate(item.validUntil)}`;

        const days = item.validityDays ?? item.validity;

        if (days !== undefined && days !== null && days !== "") {
            return typeof days === "number" || /^\d+$/.test(String(days))
                ? `${days} Days`
                : String(days);
        }

        return "--";

    }

    const totalPages = Math.max(1, Math.ceil(totalQuotations / pageSize));

    const start = totalQuotations ? (page - 1) * pageSize + 1 : 0;

    const end = Math.min(page * pageSize, totalQuotations);

    function paginationItems() {

        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, index) => index + 1);
        }

        if (page <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];

        if (page >= totalPages - 3) {
            return [1, "start-ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [1, "start-ellipsis", page - 1, page, page + 1, "end-ellipsis", totalPages];
    }

    return (

        <div className={`${neo} overflow-hidden rounded-3xl border border-slate-200 bg-white`}>

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

                <h2 className="text-xl font-bold">

                    Quotations

                </h2>

            </div>

            <div className="overflow-x-auto">

                <table className="w-full min-w-[1120px] table-fixed">

                    <thead className="bg-slate-50/80">

                        <tr>

                            <th className="w-[23%] px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Quotation

                            </th>

                            <th className="w-[16%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Client

                            </th>

                            <th className="w-[11%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Date

                            </th>

                            <th className="w-[10%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Status

                            </th>

                            <th className="w-[12%] px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Amount

                            </th>

                            <th className="w-[13%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Validity

                            </th>

                            <th className="w-[15%] px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">

                                Actions

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            quotations.map((item) => {

                                const subject = item.subject || item.title || "Untitled quotation";

                                return (

                                <tr

                                    key={item.id}

                                    className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"

                                >

                                    <td className="px-6 py-5">

                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900" title={subject}>{subject}</p>
                                            <p className="mt-1 truncate text-xs font-medium text-slate-500" title={item.quotationNumber || ""}>{item.quotationNumber || "--"}</p>
                                        </div>

                                    </td>

                                    <td className="px-5 py-5">

                                        <p className="truncate text-sm font-medium text-slate-700" title={item.clientName || ""}>{item.clientName || "--"}</p>

                                    </td>

                                    <td className="whitespace-nowrap px-5 py-5 text-sm text-slate-600">

                                        {formatDate(item.quotationDate)}

                                    </td>

                                    <td className="px-5 py-5">

                                        <span

                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(

                                                item.status

                                            )}`}

                                        >

                                            {item.status}

                                        </span>

                                    </td>

                                    <td className="whitespace-nowrap px-5 py-5 text-right text-sm font-semibold text-slate-800">

                                        ₹{Number(item.grandTotal || 0).toLocaleString("en-IN")}

                                    </td>

                                    <td className="px-5 py-5 text-sm text-slate-600">

                                        <span className="block truncate" title={validity(item)}>{validity(item)}</span>

                                    </td>

                                    <td className="px-6 py-5">

                                        <div className="flex justify-end gap-2">

                                            <button

                                                onClick={() =>

                                                    onView?.(item)

                                                }

                                                type="button"
                                                aria-label={`View ${item.quotationNumber || "quotation"}`}
                                                title="View"
                                                className="rounded-lg border border-blue-100 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"

                                            >

                                                <Eye size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onEdit?.(item)

                                                }

                                                type="button"
                                                aria-label={`Edit ${item.quotationNumber || "quotation"}`}
                                                title="Edit"
                                                className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-700 transition hover:bg-amber-100"

                                            >

                                                <Pencil size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onDownload?.(item)

                                                }

                                                type="button"
                                                aria-label={`Download ${item.quotationNumber || "quotation"}`}
                                                title="Download"
                                                className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"

                                            >

                                                <FileDown size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onDelete?.(item)

                                                }

                                                type="button"
                                                aria-label={`Delete ${item.quotationNumber || "quotation"}`}
                                                title="Delete"
                                                className="rounded-lg border border-red-100 bg-red-50 p-2 text-red-600 transition hover:bg-red-100"

                                            >

                                                <Trash2 size={18} />

                                            </button>

                                        </div>

                                    </td>

                                </tr>

                                );

                            })

                        }

                        {!quotations.length && (
                            <tr>
                                <td colSpan={7} className="px-6 py-16 text-center">
                                    <FileText size={38} className="mx-auto text-slate-300" />
                                    <p className="mt-3 font-semibold text-slate-600">{emptyMessage}</p>
                                </td>
                            </tr>
                        )}

                    </tbody>

                </table>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">

                <p className="text-sm text-slate-500">
                    Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of <span className="font-semibold text-slate-700">{totalQuotations}</span> quotations
                </p>

                <div className="flex flex-wrap items-center gap-4">

                    <label className="flex items-center gap-2 text-sm text-slate-500">
                        Rows per page:
                        <select
                            value={pageSize}
                            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 outline-none focus:border-indigo-500"
                            aria-label="Rows per page"
                        >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                        </select>
                    </label>

                    <nav className="flex items-center gap-1" aria-label="Quotation pagination">
                        <button type="button" onClick={() => onPageChange?.(page - 1)} disabled={page === 1} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page">‹</button>
                        {paginationItems().map((item) => typeof item === "number" ? (
                            <button key={item} type="button" onClick={() => onPageChange?.(item)} aria-current={page === item ? "page" : undefined} className={`min-w-8 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition ${page === item ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>{item}</button>
                        ) : (
                            <span key={item} className="px-1 text-slate-400">…</span>
                        ))}
                        <button type="button" onClick={() => onPageChange?.(page + 1)} disabled={page === totalPages} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page">›</button>
                    </nav>

                </div>

            </div>

        </div>

    );

}
