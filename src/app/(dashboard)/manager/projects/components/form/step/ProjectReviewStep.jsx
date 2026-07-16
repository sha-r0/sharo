"use client";

import {
    FolderKanban,
    Building2,
    User,
    BadgeIndianRupee,
    Calendar,
    Users,
    TrendingUp,
    TriangleAlert,
    CircleCheckBig,
} from "lucide-react";

const neo =
"shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

function Item({ icon: Icon, title, value }) {

    return (

        <div className="flex items-start gap-3">

            <div className="mt-1 text-blue-600">

                <Icon size={18} />

            </div>

            <div>

                <div className="text-xs text-slate-500">

                    {title}

                </div>

                <div className="font-semibold text-slate-800">

                    {value || "-"}

                </div>

            </div>

        </div>

    );

}

export default function ProjectReviewStep({

    form,

}) {

    const labourCost = form.employees.reduce(

        (sum, emp) => {

            const hourly = Number(emp.salary || 0) / 208;

            return sum + hourly * Number(emp.hours || 0);

        },

        0

    );

    const budget = Number(form.budget || 0);

    const po = Number(form.poAmount || 0);

    const expectedProfit = po - budget;
    const vendorAllocation = form.vendors.reduce((sum, vendor) => sum + Number(vendor.allocatedAmount || 0), 0);

    return (

        <div className="space-y-8">

            {/* Project Overview */}

            <section className={`${neo} rounded-3xl bg-white p-8`}>

                <h2 className="text-2xl font-bold mb-8">

                    Review Project

                </h2>

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">

                    <Item
                        icon={FolderKanban}
                        title="Project"
                        value={form.projectName}
                    />

                    <Item
                        icon={Building2}
                        title="Client"
                        value={form.clientName}
                    />

                    <Item
                        icon={User}
                        title="Manager"
                        value={form.managerName}
                    />

                    <Item
                        icon={Calendar}
                        title="Duration"
                        value={`${form.startDate} → ${form.endDate}`}
                    />

                </div>

            </section>

            {/* Financial */}

            <section className={`${neo} rounded-3xl bg-white p-8`}>

                <h2 className="text-xl font-bold mb-6">

                    Financial Summary

                </h2>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">

                    <div>

                        <div className="text-sm text-slate-500">Vendor Allocation</div>
                        <div className="mt-2 text-3xl font-bold text-indigo-600">₹{vendorAllocation.toLocaleString()}</div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            PO Amount

                        </div>

                        <div className="mt-2 text-3xl font-bold text-blue-600">

                            ₹{po.toLocaleString()}

                        </div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            Budget

                        </div>

                        <div className="mt-2 text-3xl font-bold text-violet-600">

                            ₹{budget.toLocaleString()}

                        </div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            Labour Cost

                        </div>

                        <div className="mt-2 text-3xl font-bold text-amber-600">

                            ₹{labourCost.toLocaleString()}

                        </div>

                    </div>

                    <div>

                        <div className="text-sm text-slate-500">

                            Expected Profit

                        </div>

                        <div
                            className={`mt-2 text-3xl font-bold ${
                                expectedProfit >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                            }`}
                        >

                            ₹{expectedProfit.toLocaleString()}

                        </div>

                    </div>

                </div>

            </section>

            {form.vendors.length > 0 && <section className={`${neo} rounded-3xl bg-white p-8`}><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-bold">Assigned Vendors</h2><span className="rounded-full bg-indigo-100 px-4 py-2 font-semibold text-indigo-700">{form.vendors.length} Vendors</span></div><div className="space-y-3">{form.vendors.map((vendor)=><div key={vendor.vendorId} className="flex flex-col gap-2 rounded-2xl bg-[#F9FAFC] p-5 sm:flex-row sm:items-center sm:justify-between"><div><strong>{vendor.vendorName}</strong><p className="text-sm text-slate-500">{vendor.scope || "Scope not specified"}</p></div><div className="text-sm font-bold text-indigo-600">₹{Number(vendor.allocatedAmount||0).toLocaleString("en-IN")}</div></div>)}</div></section>}

            {/* Employees */}

            <section className={`${neo} rounded-3xl bg-white p-8`}>

                <div className="flex items-center justify-between mb-6">

                    <h2 className="text-xl font-bold">

                        Assigned Team

                    </h2>

                    <div className="rounded-full bg-blue-100 px-4 py-2 text-blue-700 font-semibold">

                        {form.employees.length} Members

                    </div>

                </div>

                <div className="space-y-4">

                    {form.employees.map(emp => (

                        <div
                            key={emp.employeeId}
                            className="flex items-center justify-between rounded-2xl bg-[#F9FAFC] p-5"
                        >

                            <div>

                                <div className="font-semibold">

                                    {emp.fullName}

                                </div>

                                <div className="text-sm text-slate-500">

                                    {emp.designation}

                                </div>

                            </div>

                            <div className="text-sm text-slate-500">

                                {emp.hours} Hours

                            </div>

                        </div>

                    ))}

                </div>

            </section>

            {/* Validation */}

            <section className={`${neo} rounded-3xl bg-white p-8`}>

                {

                    expectedProfit < 0 ? (

                        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-5 text-red-700">

                            <TriangleAlert size={22} />

                            Budget exceeds PO Amount.

                        </div>

                    ) : (

                        <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-5 text-green-700">

                            <CircleCheckBig size={22} />

                            Project looks financially healthy.

                        </div>

                    )

                }

            </section>

        </div>

    );

}
