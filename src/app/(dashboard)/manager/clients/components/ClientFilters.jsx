"use client";

import {
    Search,
    Download,
    ChevronDown,
} from "lucide-react";

const neoShadow =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ClientFilters({

    search,
    setSearch,

    status,
    setStatus,

    onExport,

}) {

    return (

        <div className="mb-8 flex items-center justify-between gap-6">

            {/* Left */}

            <div className="flex items-center gap-4">

                {/* Search */}

                <div className="relative">

                    <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input

                        value={search}

                        onChange={(e) => setSearch(e.target.value)}

                        placeholder="Search client..."

                        className={`
                            ${neoShadow}
                            h-12
                            w-80
                            rounded-2xl
                            bg-[#F9FAFC]
                            border
                            border-white
                            pl-11
                            pr-4
                            text-slate-700
                            placeholder:text-slate-400
                            outline-none
                            transition-all
                            focus:ring-2
                            focus:ring-blue-200
                        `}

                    />

                </div>

                {/* Status */}

                <div className="relative">

                    <select

                        value={status}

                        onChange={(e) => setStatus(e.target.value)}

                        className={`
                            ${neoShadow}
                            appearance-none
                            h-12
                            w-48
                            rounded-2xl
                            bg-[#F9FAFC]
                            border
                            border-white
                            px-5
                            pr-10
                            text-slate-700
                            outline-none
                            cursor-pointer
                        `}
                    >

                        <option value="">All Status</option>

                        <option value="Active">
                            Active
                        </option>

                        <option value="Inactive">
                            Inactive
                        </option>

                    </select>

                    <ChevronDown
                        size={18}
                        className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500"
                    />

                </div>

            </div>

            {/* Export */}

            <button

                onClick={onExport}

                className={`
                    ${neoShadow}
                    h-12
                    rounded-2xl
                    bg-gradient-to-r
                    from-emerald-500
                    to-green-600
                    px-6
                    text-white
                    font-semibold
                    flex
                    items-center
                    gap-2
                    transition-all
                    hover:-translate-y-1
                `}

            >

                <Download size={18} />

                Export Excel

            </button>

        </div>

    );

}