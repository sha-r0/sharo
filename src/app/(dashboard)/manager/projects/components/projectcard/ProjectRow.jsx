"use client";

import {

    Eye,

    Pencil,

    Trash2,

    IndianRupee,

    MapPin,

    Building2,

    Users,

} from "lucide-react";

import ActionButton from "../../../expenses/components/ActionButton";

import ProjectStatusBadge from "./ProjectStatusBadge";

const neo =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ProjectRow({

    project,

    onView,

    onEdit,

    onDelete,

}) {

    return (

        <div
            className={`${neo} rounded-3xl bg-[#F9FAFC] p-6 hover:-translate-y-1 transition-all`}
        >

            <div className="flex justify-between">

                <div>

                    <h2 className="text-xl font-bold text-slate-800">

                        {project.projectName}

                    </h2>

                    <p className="text-sm text-slate-500 mt-1">

                        {project.projectCode}

                    </p>

                </div>

                <ProjectStatusBadge
                    status={project.status}
                />

            </div>

            <div className="grid grid-cols-4 gap-6 mt-6">

                <Info
                    icon={Building2}
                    title="Client"
                    value={project.clientName}
                />

                <Info
                    icon={MapPin}
                    title="Location"
                    value={project.location}
                />

                <Info
                    icon={Users}
                    title="Employees"
                    value={project.employeeCount}
                />

                <Info
                    icon={IndianRupee}
                    title="Budget"
                    value={`₹${Number(project.budget || 0).toLocaleString()}`}
                />

            </div>

            <div className="grid grid-cols-3 gap-6 mt-6">

                <AmountCard
                    title="PO Amount"
                    color="text-blue-600"
                    value={project.poAmount}
                />

                <AmountCard
                    title="Expense"
                    color="text-red-600"
                    value={project.totalExpense}
                />

                <AmountCard
                    title="Profit"
                    color="text-green-600"
                    value={project.profit}
                />

            </div>

            <div className="flex justify-end gap-3 mt-6">

                <ActionButton

                    label="View Project"

                    className="bg-indigo-50 text-indigo-600"

                    onClick={() => onView(project)}

                >

                    <Eye size={18} />

                </ActionButton>

                <ActionButton

                    label="Edit"

                    className="bg-blue-50 text-blue-600"

                    onClick={() => onEdit(project)}

                >

                    <Pencil size={18} />

                </ActionButton>

                <ActionButton

                    label="Delete"

                    className="bg-red-50 text-red-600"

                    onClick={() => onDelete(project)}

                >

                    <Trash2 size={18} />

                </ActionButton>

            </div>

        </div>

    );

}

function Info({

    icon: Icon,

    title,

    value,

}) {

    return (

        <div>

            <div className="flex items-center gap-2 text-slate-500">

                <Icon size={16} />

                <span className="text-sm">

                    {title}

                </span>

            </div>

            <h3 className="mt-2 font-semibold text-slate-800">

                {value || "-"}

            </h3>

        </div>

    );

}

function AmountCard({

    title,

    value,

    color,

}) {

    return (

        <div className="rounded-2xl bg-white p-5 border">

            <p className="text-sm text-slate-500">

                {title}

            </p>

            <h2 className={`mt-2 text-2xl font-bold ${color}`}>

                ₹{Number(value || 0).toLocaleString()}

            </h2>

        </div>

    );

}