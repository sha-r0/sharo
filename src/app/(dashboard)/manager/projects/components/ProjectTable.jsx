"use client";

import { FolderKanban } from "lucide-react";
import ProjectRow from "./projectcard/ProjectRow";
import ProjectCard from "./projectcard/ProjectCard";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ProjectTable({

    projects,

    onView,

    onEdit,

    onDelete,

}) {

    return (

        <div
            className={`py-5`}>


            {/* Body */}

            <div className="space-y-5">

                {projects.length === 0 ? (

                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">

                        <FolderKanban
                            size={48}
                            className="mx-auto text-slate-300 mb-4"
                        />

                        <h3 className="text-xl font-semibold text-slate-700">

                            No Projects Found

                        </h3>

                        <p className="mt-2 text-slate-500">

                            Create your first project to get started.

                        </p>

                    </div>

                ) : (

                    projects.map((project) => (

                        <ProjectCard

                            key={project.id}

                            project={project}

                            onView={onView}

                            onEdit={onEdit}

                            onDelete={onDelete}

                        />

                    ))

                )}

            </div>

        </div>

    );

}