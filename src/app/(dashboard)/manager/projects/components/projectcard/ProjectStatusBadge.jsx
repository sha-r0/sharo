"use client";

const styles = {

    Running:
        "bg-blue-100 text-blue-700",

    Completed:
        "bg-green-100 text-green-700",

    Pending:
        "bg-yellow-100 text-yellow-700",

    Hold:
        "bg-orange-100 text-orange-700",

    Delayed:
        "bg-red-100 text-red-700",

};

export default function ProjectStatusBadge({

    status,

}) {

    return (

        <span
            className={`
                rounded-full
                px-4
                py-2
                text-sm
                font-semibold
                ${styles[status] || "bg-slate-100 text-slate-700"}
            `}
        >

            {status}

        </span>

    );

}