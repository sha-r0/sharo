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

}) {

    function statusBadge(status) {

        switch (status) {

            case "Approved":

                return "bg-green-100 text-green-700";

            case "Sent":

                return "bg-blue-100 text-blue-700";

            case "Rejected":

                return "bg-red-100 text-red-700";

            default:

                return "bg-slate-100 text-slate-700";

        }

    }

    function formatDate(value) {

        if (!value) return "--";

        try {

            const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);

            return Number.isNaN(date.getTime()) ? "--" : date.toLocaleDateString("en-IN");

        } catch {

            return "--";

        }

    }

    if (!quotations.length) {

        return (

            <div className={`${neo} rounded-3xl bg-white p-16`}>

                <div className="flex flex-col items-center">

                    <div className="rounded-full bg-indigo-100 p-6">

                        <FileText
                            size={50}
                            className="text-indigo-600"
                        />

                    </div>

                    <h2 className="mt-6 text-2xl font-bold">

                        No Quotations Yet

                    </h2>

                    <p className="mt-3 text-slate-500">

                        Create your first quotation to get started.

                    </p>

                </div>

            </div>

        );

    }

    return (

        <div className={`${neo} overflow-hidden rounded-3xl bg-white`}>

            <div className="border-b p-6">

                <h2 className="text-xl font-bold">

                    Recent Quotations

                </h2>

            </div>

            <div className="overflow-x-auto">

                <table className="w-full">

                    <thead className="bg-slate-50">

                        <tr>

                            <th className="px-6 py-4 text-left">

                                Quotation

                            </th>

                            <th className="px-6 py-4 text-left">

                                Client

                            </th>

                            <th className="px-6 py-4 text-left">

                                Date

                            </th>

                            <th className="px-6 py-4 text-right">

                                Amount

                            </th>

                            <th className="px-6 py-4 text-center">

                                Status

                            </th>

                            <th className="px-6 py-4 text-center">

                                Actions

                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {

                            quotations.map((item) => (

                                <tr

                                    key={item.id}

                                    className="border-t hover:bg-slate-50"

                                >

                                    <td className="px-6 py-5 font-semibold">

                                        {item.quotationNumber}

                                    </td>

                                    <td className="px-6 py-5">

                                        {item.clientName}

                                    </td>

                                    <td className="px-6 py-5">

                                        {formatDate(item.createdAt)}

                                    </td>

                                    <td className="px-6 py-5 text-right font-semibold">

                                        ₹

                                        {Number(

                                            item.grandTotal || 0

                                        ).toLocaleString("en-IN")}

                                    </td>

                                    <td className="px-6 py-5 text-center">

                                        <span

                                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(

                                                item.status

                                            )}`}

                                        >

                                            {item.status}

                                        </span>

                                    </td>

                                    <td className="px-6 py-5">

                                        <div className="flex justify-center gap-2">

                                            <button

                                                onClick={() =>

                                                    onView?.(item)

                                                }

                                                className="rounded-xl p-2 hover:bg-slate-100"

                                            >

                                                <Eye size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onEdit?.(item)

                                                }

                                                className="rounded-xl p-2 hover:bg-slate-100"

                                            >

                                                <Pencil size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onDownload?.(item)

                                                }

                                                className="rounded-xl p-2 hover:bg-slate-100"

                                            >

                                                <FileDown size={18} />

                                            </button>

                                            <button

                                                onClick={() =>

                                                    onDelete?.(item)

                                                }

                                                className="rounded-xl p-2 text-red-600 hover:bg-red-50"

                                            >

                                                <Trash2 size={18} />

                                            </button>

                                        </div>

                                    </td>

                                </tr>

                            ))

                        }

                    </tbody>

                </table>

            </div>

        </div>

    );

}
