"use client";

import {
    FileText,
    ShieldCheck,
    Truck,
    ClipboardList,
    ArrowLeft,
    ArrowRight,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function TermsStep({

    form,

    setForm,

    next,

    back,

}) {

    function update(key, value) {

        setForm({

            ...form,

            [key]: value,

        });

    }

    return (

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* Left */}

            <div className="xl:col-span-2">

                <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-8`}>

                    <h2 className="text-2xl font-bold">

                        Default Terms & Conditions

                    </h2>

                    <p className="mt-2 text-slate-500">

                        These terms will automatically appear in every quotation.

                    </p>

                    <div className="space-y-8 mt-8">

                        {/* Payment */}

                        <div>

                            <label className="mb-2 flex items-center gap-2 font-semibold">

                                <FileText size={18}/>

                                Payment Terms

                            </label>

                            <textarea

                                rows={3}

                                value={form.paymentTerms}

                                onChange={(e)=>

                                    update(

                                        "paymentTerms",

                                        e.target.value

                                    )

                                }

                                className="w-full rounded-2xl border border-slate-300 p-4"

                                placeholder="50% Advance, Balance before delivery."

                            />

                        </div>

                        {/* Delivery */}

                        <div>

                            <label className="mb-2 flex items-center gap-2 font-semibold">

                                <Truck size={18}/>

                                Delivery Terms

                            </label>

                            <textarea

                                rows={3}

                                value={form.deliveryTerms}

                                onChange={(e)=>

                                    update(

                                        "deliveryTerms",

                                        e.target.value

                                    )

                                }

                                className="w-full rounded-2xl border border-slate-300 p-4"

                                placeholder="Delivery within 7 working days."

                            />

                        </div>

                        {/* Warranty */}

                        <div>

                            <label className="mb-2 flex items-center gap-2 font-semibold">

                                <ShieldCheck size={18}/>

                                Warranty

                            </label>

                            <textarea

                                rows={3}

                                value={form.warranty}

                                onChange={(e)=>

                                    update(

                                        "warranty",

                                        e.target.value

                                    )

                                }

                                className="w-full rounded-2xl border border-slate-300 p-4"

                                placeholder="12 Months Manufacturing Warranty."

                            />

                        </div>

                        {/* Notes */}

                        <div>

                            <label className="mb-2 flex items-center gap-2 font-semibold">

                                <ClipboardList size={18}/>

                                Default Notes

                            </label>

                            <textarea

                                rows={5}

                                value={form.notes}

                                onChange={(e)=>

                                    update(

                                        "notes",

                                        e.target.value

                                    )

                                }

                                className="w-full rounded-2xl border border-slate-300 p-4"

                                placeholder="Thank you for your enquiry."

                            />

                        </div>

                    </div>

                    <div className="mt-10 flex justify-between">

                        <button

                            onClick={back}

                            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold"

                        >

                            <ArrowLeft className="mr-2 inline"/>

                            Back

                        </button>

                        <button

                            onClick={next}

                            className="rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white"

                        >

                            Continue

                            <ArrowRight className="ml-2 inline"/>

                        </button>

                    </div>

                </div>

            </div>

            {/* Right */}

            <div>

                <div className={`${neo} sticky top-6 rounded-3xl bg-white p-8`}>

                    <h3 className="text-xl font-bold">

                        Live Preview

                    </h3>

                    <div className="mt-6 rounded-2xl bg-slate-50 p-6 space-y-5">

                        <div>

                            <h4 className="font-semibold">

                                Payment

                            </h4>

                            <p className="text-sm text-slate-500 mt-1">

                                {

                                    form.paymentTerms ||

                                    "Not Configured"

                                }

                            </p>

                        </div>

                        <div>

                            <h4 className="font-semibold">

                                Delivery

                            </h4>

                            <p className="text-sm text-slate-500 mt-1">

                                {

                                    form.deliveryTerms ||

                                    "Not Configured"

                                }

                            </p>

                        </div>

                        <div>

                            <h4 className="font-semibold">

                                Warranty

                            </h4>

                            <p className="text-sm text-slate-500 mt-1">

                                {

                                    form.warranty ||

                                    "Not Configured"

                                }

                            </p>

                        </div>

                        <div>

                            <h4 className="font-semibold">

                                Notes

                            </h4>

                            <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">

                                {

                                    form.notes ||

                                    "No default notes."

                                }

                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}