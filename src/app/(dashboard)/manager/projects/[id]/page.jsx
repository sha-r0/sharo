"use client";

import { use } from "react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import useProjectIntelligence from "../hooks/useProjectIntelligence";
import ProjectIntelligenceDashboard, { ProjectIntelligenceSkeleton } from "../components/intelligence/ProjectIntelligenceDashboard";

export default function ProjectDetailsPage({

    params,

}) {

    const { id } = use(params);

    const { company } = useAuth();
    const { data, loading, refreshing, error, refresh } = useProjectIntelligence(company?.id, id);

    if (loading) {

        return (

            <ProjectIntelligenceSkeleton />

        );

    }

    if (!data) {

        return (

            <div className="p-10">

                {error || "Project Not Found"}

            </div>

        );

    }

    return (

        <ProjectIntelligenceDashboard intelligence={data} refreshing={refreshing} error={error} onRefresh={refresh} />

    );

}
