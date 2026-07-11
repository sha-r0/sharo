"use client";

import {
    FolderKanban,
    RotateCw,
    Plus,
    UserPlus,
    Search,
    ChevronDown,
} from "lucide-react";

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ProjectHeader({

    loading,

    onRefresh,

    search,

    setSearch,

    onAddClient,

    onAddProject,

}) {

    return (

        <div className="flex items-start justify-between mb-8 gap-2">

            {/* Left */}

            <div className="flex items-center gap-4">

                <div
                    className={`${neoShadow} h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white`}
                >
                    <FolderKanban size={25} />
                </div>

                <div>

                    <h1 className="text-3xl font-bold text-slate-800">
                        Project Management
                    </h1>

                </div>

            </div>

            {/* Right */}

            <div className="flex items-center gap-2">

                {/* Search */}

                <div className="relative w-80">

                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search projects..."
                        className={`${neoShadow}
            w-full
            rounded-2xl
            bg-white
            py-3
            pl-11
            pr-4
            outline-none`}
                    />

                </div>

                {/* Financial Year */}

                <button
                    className={`${neoShadow}
    flex
    items-center
    justify-between
    gap-3
    w-42
    rounded-2xl
    bg-white
    px-4
    py-3
    hover:-translate-y-1
    transition`}
                >

                    <span className="text-slate-700 font-medium">
                        Financial Year
                    </span>

                    <ChevronDown
                        size={18}
                        className="text-slate-500"
                    />

                </button>

                {/* Refresh */}

                <button
                    onClick={onRefresh}
                    className={`${neoShadow}
    flex items-center gap-2
    rounded-2xl
    bg-white
    px-5
    py-3
    hover:-translate-y-1
    transition`}
                >
                    <RotateCw
                        size={18}
                        className={loading ? "animate-spin" : ""}
                    />
                </button>

                {/* Add Client */}

                <button
                    onClick={onAddClient}
                    className={`${neoShadow}
    flex items-center gap-2
    rounded-2xl
    bg-violet-50
    text-violet-700
    px-5
    py-3
    hover:-translate-y-1
    transition`}
                >
                    <UserPlus size={18} />
                    Add Client
                </button>

                {/* New Project */}

                <button
                    onClick={onAddProject}
                    className={`${neoShadow}
    flex items-center gap-2
    rounded-xl
    bg-gradient-to-r
    from-blue-600
    to-indigo-600
    text-white
    px-3
    py-3
    font-bold
    hover:-translate-y-1
    transition`}
                >
                    <Plus size={18} />
                     Project
                </button>

            </div>

        </div>

    );

}