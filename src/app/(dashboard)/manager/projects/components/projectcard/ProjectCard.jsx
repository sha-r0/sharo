"use client";

import {
    Eye,
    Pencil,
    Trash2,
    AlertCircle,
    Edit,
} from "lucide-react";

import ProjectMetricChip from "./ProjectMetricChip";
import ProjectStatusBadge from "./ProjectStatusBadge";
import ProjectProgress from "./ProjectProgress";
import ProjectActionButton from "./ProjectActionButton";
import EmployeeChip from "./EmployeeChip";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ProjectCard({

    project,

    onView,

    onEdit,

    onDelete,

}) {

    return (

        <div
        onClick={() => {

            console.log("Card Clicked");
        
            onView?.(project);
        
        }}
            className={`${neoShadow}
    cursor-pointer
    rounded-3xl
    bg-[#F9FAFC]
    p-7
    transition-all
    hover:-translate-y-1
    hover:shadow-xl`}
        >

            {/* ================= HEADER ================= */}

            <div className="flex justify-between items-start">

                <div>

                    <h2 className="text-3xl font-bold text-emerald-600">

                        {project.projectName}

                    </h2>

                    <p className="mt-2 text-lg text-slate-500">

                        Client : {project.clientName || "-"}

                    </p>

                </div>

                <div className="flex gap-3">

                    <ProjectActionButton
                        className="bg-blue-50 text-blue-600"
                        onClick={(e) => {

                            e.stopPropagation();

                            onView(project);

                        }}
                    >
                        <Eye size={18} />
                    </ProjectActionButton>

                    <ProjectActionButton
                        className="bg-amber-50 text-amber-600"
                        onClick={(e) => {

                            e.stopPropagation();

                            onEdit(project);

                        }}
                    >
                        <Edit size={18} />
                    </ProjectActionButton>

                    <ProjectActionButton
                        className="bg-red-50 text-red-600"
                        onClick={(e) => {

                            e.stopPropagation();

                            onDelete(project);

                        }}
                    >
                        <Trash2 size={18} />
                    </ProjectActionButton>

                </div>

            </div>

            {/* ================= KPI ================= */}

            <div className="flex flex-wrap gap-4 mt-6">

                <ProjectMetricChip
                    label="PO Amount"
                    value={`₹${Number(project.poAmount || 0).toLocaleString()}`}
                />

                <ProjectMetricChip
                    label="Budget"
                    value={`₹${Number(project.budget || 0).toLocaleString()}`}
                    color="text-blue-600"
                />

                <ProjectMetricChip
                    label="Total Expense"
                    value={`₹${Number(project.totalExpense || 0).toLocaleString()}`}
                    color="text-orange-600"
                />

                <ProjectMetricChip
                    label="Profit"
                    value={`₹${Number(project.totalProfit || project.profit || 0).toLocaleString()}`}
                    color="text-green-600"
                />

                <ProjectStatusBadge
                    status={project.status}
                />

            </div>

            <hr className="my-7 border-slate-200" />

            {/* ================= PROGRESS ================= */}

            <div className="grid grid-cols-12 gap-8">

                <div className="col-span-8">

                    <ProjectProgress
                        progress={project.progress || 0}
                    />

                    <div className="mt-4 text-slate-500">

                        Start : {project.startDate || "-"}

                        <span className="mx-2">•</span>

                        End : {project.endDate || "-"}

                    </div>

                </div>

                <div className="col-span-4 flex items-center justify-end gap-3">

                    <select
                        className={`${neoShadow}
                        rounded-xl
                        bg-white
                        px-4
                        py-3
                        outline-none`}
                        defaultValue={project.status}
                    >

                        <option>Pending</option>

                        <option>Running</option>

                        <option>Completed</option>

                        <option>Hold</option>

                    </select>

                    {project.overdue && (

                        <button
                            className="rounded-full bg-red-600 px-5 py-3 text-white"
                        >

                            <AlertCircle
                                size={16}
                                className="inline mr-2"
                            />

                            Overdue

                        </button>

                    )}

                </div>

            </div>

            {/* ================= BOTTOM KPI ================= */}

            <div className="flex flex-wrap gap-4 mt-8">

                <ProjectMetricChip
                    label="Aggregated Hours"
                    value={`${project.totalHours || 0} hrs`}
                />

                <ProjectMetricChip
                    label="Employee Expense"
                    value={`₹${Number(project.employeeExpense || 0).toLocaleString()}`}
                    color="text-blue-600"
                />

                <ProjectMetricChip
                    label="Normal Expense"
                    value={`₹${Number(project.normalExpense || 0).toLocaleString()}`}
                    color="text-orange-600"
                />

            </div>

            {/* ================= EMPLOYEES ================= */}

            <div className="mt-7 flex flex-wrap gap-3">

                {(project.employees || []).map((employee) => (

                    <EmployeeChip

                        key={employee.firestoreId || employee.employeeId || employee.id}

                        name={employee.fullName}

                    />

                ))}

            </div>

        </div>

    );

}