"use client";

import {
    MapPin,
    Download,
    RefreshCw,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GPSHeader({

    onExport,

    onRefresh,

    loading = false,

}) {

    return (

        <div
            className={`${neo} flex items-center justify-between rounded-3xl bg-[#F9FAFC] p-7`}
        >

            {/* Left */}

            <div className="flex items-center gap-5">

                <div
                    className={`${neo} flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white`}
                >

                    <MapPin size={28} />

                </div>

                <div>

                    <h1 className="text-3xl font-bold text-slate-800">

                        GPS Attendance Report

                    </h1>

                    <p className="mt-1 text-slate-500">

                        Track employee GPS punches, routes and attendance locations.

                    </p>

                </div>

            </div>

            {/* Right */}

            <div className="flex items-center gap-3">

                <button

                    onClick={onRefresh}

                    disabled={loading}

                    className={`${neo} flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 transition hover:bg-slate-100`}

                >

                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />

                    Refresh

                </button>

                <button

                    onClick={onExport}

                    disabled={loading}

                    className={`${neo} flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700`}

                >

                    <Download size={18} />

                    Export Excel

                </button>

            </div>

        </div>

    );

}
