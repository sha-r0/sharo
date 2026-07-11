"use client";

import { use } from "react";
import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import projectService from "../services/projectService";

import ProjectDetailsHeader from "../components/details/ProjectDetailsHeader";
import ProjectKPICards from "../components/details/ProjectKPICards";
import ProjectTabs from "../components/details/ProjectTabs";

export default function ProjectDetailsPage({

    params,

}) {

    const { id } = use(params);

    const router = useRouter();

    const { company } = useAuth();

    const [loading, setLoading] = useState(true);

    const [project, setProject] = useState(null);

    useEffect(() => {

        if (!company?.id) return;

        loadProject();

    }, [company, id]);

    async function loadProject() {

        setLoading(true);

        const data = await projectService.getProject(

            company.id,

            id

        );

        setProject(data);

        setLoading(false);

    }

    if (loading) {

        return (

            <div className="p-10">

                Loading...

            </div>

        );

    }

    if (!project) {

        return (

            <div className="p-10">

                Project Not Found

            </div>

        );

    }

    return (

        <div className="min-h-screen bg-slate-50 p-6 space-y-6">

            <button

                onClick={() => router.back()}

                className="flex items-center gap-2 text-blue-600 font-semibold"

            >

                <ArrowLeft size={18} />

                Back

            </button>

            <ProjectDetailsHeader

                project={project}

            />

            <ProjectKPICards

                project={project}

            />

            <ProjectTabs

                project={project}

            />

        </div>

    );

}