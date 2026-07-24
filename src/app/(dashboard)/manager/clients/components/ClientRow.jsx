"use client";

import {
    Building2,
    Phone,
    Mail,
    MapPin,
    BadgeIndianRupee,
    FolderKanban,
    Eye,
    Pencil,
    Trash2,
} from "lucide-react";

import ActionButton from "@/app/(dashboard)/manager/expenses/components/ActionButton";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Chip({ icon: Icon, text, color = "text-slate-600" }) {
    return (
        <div
            className={`${neo} inline-flex items-center gap-2 rounded-full bg-[#F9FAFC] px-4 py-2 text-sm`}
        >
            <Icon size={15} className={color} />
            <span className={color}>{text}</span>
        </div>
    );
}


export default function ClientRow({

    client,

    onView,

    onEdit,

    onDelete,

}) {

    const isActive =
        String(client.status || "").toLowerCase() === "active";

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-7 transition-all duration-300 hover:-translate-y-1`}
        >

            {/* Top */}

            <div className="flex justify-between items-start">

                <div className="flex gap-5">

                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">

                        {client.clientName?.charAt(0)?.toUpperCase()}

                    </div>

                    <div>

                        <h2 className="text-2xl font-bold text-slate-800">

                            {client.clientName}

                        </h2>

                        <p className="text-slate-500 mt-1">

                            {client.companyName || "Individual Client"}

                        </p>

                        <div className="mt-4 flex flex-wrap gap-3">

                            <Chip
                                icon={Phone}
                                text={client.phone || "-"}
                            />

                            <Chip
                                icon={Mail}
                                text={client.email || "-"}
                            />

                        </div>

                    </div>

                </div>

                <div className="flex items-center gap-2">

                    <span
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                    >
                        {client.status || "Inactive"}
                    </span>

                    <ActionButton
                        label="View Client"
                        className="bg-blue-50 text-blue-600"
                        onClick={() => onView(client)}
                    >
                        <Eye size={18} />
                    </ActionButton>

                    <ActionButton
                        label="Edit Client"
                        className="bg-amber-50 text-amber-600"
                        onClick={() => onEdit(client)}
                    >
                        <Pencil size={18} />
                    </ActionButton>

                    <ActionButton
                        label="Delete Client"
                        className="bg-red-50 text-red-600"
                        onClick={() => onDelete(client)}
                    >
                        <Trash2 size={18} />
                    </ActionButton>

                </div>

            </div>

            {/* Divider */}

            <div className="my-6 h-px bg-slate-200" />

            {/* Bottom */}

            <div className="flex flex-wrap gap-4">

                <Chip
                    icon={Building2}
                    text={`GST : ${client.gstNo || "-"}`}
                />

                <Chip
                    icon={FolderKanban}
                    text={`Projects : ${client.totalProjects || 0}`}
                    color="text-blue-600"
                />

                <Chip
                    icon={BadgeIndianRupee}
                    text={`Revenue : ₹${Number(
                        client.totalRevenue || 0
                    ).toLocaleString()}`}
                    color="text-emerald-600"
                />

                <Chip
                    icon={MapPin}
                    text={`${client.address?.city || "-"}, ${client.address?.state || "-"}`}
                />

            </div>

        </div>

    );

}