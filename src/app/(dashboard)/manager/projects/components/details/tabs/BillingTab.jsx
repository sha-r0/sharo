"use client";

export default function BillingTab({ project }) {

    return (

        <div className="rounded-3xl bg-white p-10">

            <h2 className="mb-8 text-2xl font-bold">

                Billing

            </h2>

            <div className="grid grid-cols-3 gap-6">

                <Card title="PO Amount" value={project.poAmount} />

                <Card title="Received" value={project.totalReceived} />

                <Card title="Pending" value={project.totalPending} />

            </div>

        </div>

    );

}

function Card({ title, value }) {

    return (

        <div className="rounded-2xl border bg-slate-50 p-6">

            <p>{title}</p>

            <h2 className="mt-2 text-2xl font-bold">

                ₹{Number(value || 0).toLocaleString()}

            </h2>

        </div>

    );

}