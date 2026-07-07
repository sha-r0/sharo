"use client";

export default function InfoCard({

    title,

    children,

}) {

    return (

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm">

            <div className="px-6 py-5 border-b border-slate-100">

                <h2 className="text-lg font-bold text-slate-800">

                    {title}

                </h2>

            </div>

            <div className="p-6">

                {children}

            </div>

        </div>

    );

}