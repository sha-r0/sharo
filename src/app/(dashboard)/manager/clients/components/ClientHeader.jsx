"use client";

import {
    Building2,
    Plus,
    RotateCw,
} from "lucide-react";

const neo =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ClientHeader({

    loading,

    onRefresh,

    onAddClient,

}) {

    return (

        <div className="flex justify-between items-center mt-5">

            <div className="flex items-center gap-4">

                <div className={`${neo} h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center`}>

                    <Building2 size={22} />

                </div>

                <div>

                    <h1 className="text-3xl font-bold">

                        Clients

                    </h1>

                </div>

            </div>

            <div className="flex gap-3">

                <button
                    onClick={onRefresh}
                    className={`${neo} rounded-2xl bg-white px-5 py-3 flex gap-2 items-center`}
                >

                    <RotateCw
                        size={18}
                        className={loading ? "animate-spin" : ""}
                    />

                    Refresh

                </button>

                <button
                    onClick={onAddClient}
                    className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 flex gap-2 items-center"
                >

                    <Plus size={18} />

                    Add Client

                </button>

            </div>

        </div>

    );

}