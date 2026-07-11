"use client";

import {
    FolderKanban,
    Building2,
    User,
    Calendar,
    Flag,
    CircleDollarSign,
} from "lucide-react";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Item({

    icon: Icon,

    label,

    value,

}) {

    return (

        <div className="flex items-center gap-3">

            <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">

                <Icon size={18} />

            </div>

            <div>

                <p className="text-xs uppercase tracking-wide text-slate-500">

                    {label}

                </p>

                <p className="font-semibold text-slate-800">

                    {value || "-"}

                </p>

            </div>

        </div>

    );

}

export default function ProjectDetailsHeader({

    project,

}) {

    return (

        <div
            className={`${neoShadow}
            rounded-[32px]
            bg-white
            p-8`}
        >

            <div className="flex justify-between items-start">

                <div>

                    <div className="flex items-center gap-4">

                        <div className="h-16 w-16 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center">

                            <FolderKanban size={32} />

                        </div>

                        <div>

                            <h1 className="text-4xl font-bold text-slate-900">

                                {project.projectName}

                            </h1>

                            <p className="mt-2 text-slate-500">

                                {project.projectId}

                            </p>

                        </div>

                    </div>

                </div>

                <div>

                    <span className="rounded-full bg-green-100 px-5 py-2 text-green-700 font-semibold">

                        {project.status}

                    </span>

                </div>

            </div>

            <div className="mt-10 grid grid-cols-3 gap-8">

                <Item

                    icon={Building2}

                    label="Client"

                    value={project.clientName}

                />

                <Item

                    icon={User}

                    label="Project Manager"

                    value={project.managerName}

                />

                <Item

                    icon={Flag}

                    label="Priority"

                    value={project.priority || "Medium"}

                />

                <Item

                    icon={Calendar}

                    label="Start Date"

                    value={project.startDate}

                />

                <Item

                    icon={Calendar}

                    label="Expected End"

                    value={project.endDate}

                />

                <Item

                    icon={CircleDollarSign}

                    label="PO Amount"

                    value={`₹${Number(project.poAmount || 0).toLocaleString()}`}

                />

            </div>

        </div>

    );

}