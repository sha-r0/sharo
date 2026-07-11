"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import useProjects from "./hooks/useProjects";

import ProjectHeader from "./components/ProjectHeader";
import ProjectFilters from "./components/ProjectFilters";
import ProjectSummaryCards from "./components/ProjectSummaryCards";
import ProjectTable from "./components/ProjectTable";
import AddProjectDialog from "./components/form/AddProjectDialog";

export default function ProjectManagementPage() {

    const router = useRouter();

    const [search, setSearch] = useState("");

    const [status, setStatus] = useState("all");

    const [client, setClient] = useState("");

    const [financialYear, setFinancialYear] = useState("");

    const [openProjectDialog, setOpenProjectDialog] = useState(false);

    const {

        loading,

        projects = [],

        createProject,

        updateProject,

        deleteProject,

        refresh,

    } = useProjects();

    /* =======================================================
        Filters
    ======================================================= */

    const filteredProjects = projects.filter((project) => {

        const statusMatch =
            status === "all" ||
            project.status?.toLowerCase() === status;

        const clientMatch =
            !client ||
            project.clientId === client;

        const searchMatch =
            !search ||
            project.projectName
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
            project.projectId
                ?.toLowerCase()
                .includes(search.toLowerCase()) ||
            project.clientName
                ?.toLowerCase()
                .includes(search.toLowerCase());

        return (

            statusMatch &&
            clientMatch &&
            searchMatch

        );

    });

    return (

        <div className="min-h-screen px-6 py-2">

            {/* Header */}

            <ProjectHeader

                loading={loading}

                search={search}

                setSearch={setSearch}

                onRefresh={refresh}

                onAddClient={() => {

                    console.log("Add Client");

                }}

                onAddProject={() => {

                    setOpenProjectDialog(true);

                }}

            />

            {/* Filters */}

            <ProjectFilters

                projects={projects}

                status={status}

                setStatus={setStatus}

                client={client}

                setClient={setClient}

                financialYear={financialYear}

                setFinancialYear={setFinancialYear}

                clients={[]}

                onEdit={() => {

                    console.log("Bulk Edit");

                }}

            />

            {/* Summary */}

            <ProjectSummaryCards

                totalProjects={projects.length}

                runningProjects={

                    projects.filter(

                        p => p.status === "Running"

                    ).length

                }

                completedProjects={

                    projects.filter(

                        p => p.status === "Completed"

                    ).length

                }

                holdProjects={

                    projects.filter(

                        p =>

                            p.status === "Hold" ||

                            p.status === "On Hold"

                    ).length

                }

                totalBudget={

                    projects.reduce(

                        (sum, p) =>

                            sum + Number(p.budget || 0),

                        0

                    )

                }

                totalProfit={

                    projects.reduce(

                        (sum, p) =>

                            sum + Number(p.totalProfit || 0),

                        0

                    )

                }

            />

            {/* Project List */}

            <ProjectTable

                projects={filteredProjects}

                onView={(project) => {

                    router.push(

                        `/manager/projects/${project.id}`

                    );

                }}

                onEdit={(project) => {

                    console.log("Edit", project);

                }}

                onDelete={async (project) => {

                    if (

                        confirm(

                            `Delete "${project.projectName}" ?`

                        )

                    ) {

                        await deleteProject(

                            project.id

                        );

                    }

                }}

            />

            {/* Add Project */}

            <AddProjectDialog

                open={openProjectDialog}

                onClose={() =>

                    setOpenProjectDialog(false)

                }

                onSave={createProject}

            />

        </div>

    );

}