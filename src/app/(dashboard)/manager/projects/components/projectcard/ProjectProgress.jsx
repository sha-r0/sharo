"use client";

export default function ProjectProgress({

    progress = 0,

}) {

    return (

        <div>

            <div className="flex justify-between mb-3">

                <h3 className="font-semibold text-slate-700">

                    Progress

                </h3>

                <span className="font-bold">

                    {progress}%

                </span>

            </div>

            <div className="h-3 rounded-full bg-slate-200 overflow-hidden">

                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                    style={{
                        width: `${progress}%`,
                    }}
                />

            </div>

        </div>

    );

}