"use client";

export default function InfoItem({

    label,

    value,

}) {

    return (

        <div>

            <p className="text-xs uppercase tracking-wide text-slate-400">

                {label}

            </p>

            <p className="mt-2 font-semibold text-slate-800 break-words">

                {value || "-"}

            </p>

        </div>

    );

}