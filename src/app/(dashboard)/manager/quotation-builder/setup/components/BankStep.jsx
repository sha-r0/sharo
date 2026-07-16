"use client";

import {
    Landmark,
    CreditCard,
    QrCode,
    ArrowLeft,
    ArrowRight,
    Building2,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function BankStep({

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

                        Bank Details

                    </h2>

                    <p className="mt-2 text-slate-500">

                        These details will automatically appear on every quotation.

                    </p>

                    <div className="mt-8 grid gap-6 md:grid-cols-2">

                        <div>

                            <label className="font-semibold">

                                Bank Name

                            </label>

                            <input

                                value={form.bankName}

                                onChange={(e) =>

                                    update("bankName", e.target.value)

                                }

                                placeholder="State Bank of India"

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                        <div>

                            <label className="font-semibold">

                                Account Name

                            </label>

                            <input

                                value={form.accountName}

                                onChange={(e) =>

                                    update("accountName", e.target.value)

                                }

                                placeholder="Troynoy A Pvt Ltd"

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                        <div>

                            <label className="font-semibold">

                                Account Number

                            </label>

                            <input

                                value={form.accountNumber}

                                onChange={(e) =>

                                    update("accountNumber", e.target.value)

                                }

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                        <div>

                            <label className="font-semibold">

                                IFSC Code

                            </label>

                            <input

                                value={form.ifsc}

                                onChange={(e) =>

                                    update("ifsc", e.target.value)

                                }

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                        <div>

                            <label className="font-semibold">

                                Branch

                            </label>

                            <input

                                value={form.branch}

                                onChange={(e) =>

                                    update("branch", e.target.value)

                                }

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                        <div>

                            <label className="font-semibold">

                                UPI ID

                            </label>

                            <input

                                value={form.upi}

                                onChange={(e) =>

                                    update("upi", e.target.value)

                                }

                                placeholder="company@upi"

                                className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            />

                        </div>

                    </div>

                    {/* QR Upload */}

                    <div className="mt-8">

                        <label className="font-semibold">

                            Payment QR Code

                        </label>

                        <label className="mt-3 flex h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-500">

                            {

                                form.qrCode ?

                                    <img

                                        src={form.qrCode}

                                        className="h-36 object-contain"

                                        alt="QR"

                                    />

                                    :

                                    <>

                                        <QrCode

                                            size={50}

                                            className="text-slate-400"

                                        />

                                        <span className="mt-3 text-slate-500">

                                            Upload QR Code

                                        </span>

                                    </>

                            }

                            <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {

                                    const file = e.target.files?.[0];

                                    if (!file) return;

                                    const url = URL.createObjectURL(file);

                                    setForm(prev => ({

                                        ...prev,

                                        qrCode: url,

                                        qrCodeFile: file,

                                    }));

                                }}
                            />

                        </label>

                    </div>

                    <div className="mt-10 flex justify-between">

                        <button

                            onClick={back}

                            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold"

                        >

                            <ArrowLeft className="mr-2 inline" />

                            Back

                        </button>

                        <button

                            onClick={next}

                            className="rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white"

                        >

                            Continue

                            <ArrowRight className="ml-2 inline" />

                        </button>

                    </div>

                </div>

            </div>

            {/* Right */}

            <div>

                <div className={`${neo} sticky top-6 rounded-3xl bg-white p-8`}>

                    <div className="flex items-center gap-3">

                        <div className="rounded-2xl bg-indigo-100 p-4">

                            <Landmark className="text-indigo-600" />

                        </div>

                        <div>

                            <h3 className="font-bold">

                                Live Preview

                            </h3>

                            <p className="text-sm text-slate-500">

                                Bank information shown on quotation

                            </p>

                        </div>

                    </div>

                    <div className="mt-8 rounded-2xl border bg-slate-50 p-6 space-y-4">

                        <div className="flex items-center gap-3">

                            <Building2 size={18} />

                            <span>{form.bankName || "Bank Name"}</span>

                        </div>

                        <div className="flex items-center gap-3">

                            <CreditCard size={18} />

                            <span>{form.accountNumber || "XXXXXXXXXXXX"}</span>

                        </div>

                        <div>

                            <strong>IFSC</strong>

                            <div className="text-slate-500">

                                {form.ifsc || "IFSCCODE"}

                            </div>

                        </div>

                        <div>

                            <strong>UPI</strong>

                            <div className="text-slate-500">

                                {form.upi || "company@upi"}

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}