"use client";

export default function ExpenseStatusBadge({
    status
}) {

    const styles = {

        approved:
            "bg-emerald-100 text-emerald-700",

        pending:
            "bg-amber-100 text-amber-700",

        rejected:
            "bg-red-100 text-red-700",

    };

    return (

        <span
            className={`
                px-4
                py-1.5
                rounded-full
                text-xs
                font-semibold
                capitalize
                ${styles[status]}
            `}
        >

            {status}

        </span>

    );

}