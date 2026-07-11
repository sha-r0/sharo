"use client";

export default function OverviewTab({ project }) {

    return (

        <div className="rounded-3xl bg-white p-8">

            <h2 className="mb-8 text-2xl font-bold">

                Project Overview

            </h2>

            <div className="grid grid-cols-2 gap-8">

                <div className="space-y-5">

                    <Info label="Project Name" value={project.projectName} />
                    <Info label="Project ID" value={project.projectId} />
                    <Info label="Client" value={project.clientName} />
                    <Info label="Manager" value={project.managerName} />
                    <Info label="Status" value={project.status} />

                </div>

                <div className="space-y-5">

                    <Info label="Start Date" value={project.startDate} />
                    <Info label="End Date" value={project.endDate} />
                    <Info label="Budget" value={`₹${Number(project.budget || 0).toLocaleString()}`} />
                    <Info label="PO Amount" value={`₹${Number(project.poAmount || 0).toLocaleString()}`} />
                    <Info label="Employees" value={project.employeeCount} />

                </div>

            </div>

            <div className="mt-10">

                <h3 className="mb-3 font-bold">

                    Description

                </h3>

                <div className="rounded-2xl bg-slate-50 p-5">

                    {project.description || "No description"}

                </div>

            </div>

        </div>

    );

}

function Info({ label, value }) {

    return (

        <div>

            <p className="text-sm text-slate-500">

                {label}

            </p>

            <h3 className="text-lg font-semibold">

                {value || "-"}

            </h3>

        </div>

    );

}