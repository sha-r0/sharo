"use client";

import {
    Upload,
    User,
    Stamp,
    BadgeCheck,
    ArrowLeft,
    CheckCircle2,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function SignatureStep({

    form,

    setForm,

    back,

    finish,

    saving = false,

}) {

    function update(key, value) {

        setForm({

            ...form,

            [key]: value,

        });

    }

    function previewImage(file, field) {

        if (!file) return;

        const url = URL.createObjectURL(file);

        setForm(prev => ({

            ...prev,

            [field]: url,

            [`${field}File`]: file,

        }));

    }

    return (

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

            {/* LEFT */}

            <div className="xl:col-span-2">

                <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-8`}>

                    <h2 className="text-2xl font-bold">

                        Signature & Approval

                    </h2>

                    <p className="mt-2 text-slate-500">

                        Configure your default signature and company seal.

                    </p>

                    {/* Authorized Person */}

                    <div className="mt-8">

                        <label className="font-semibold flex items-center gap-2">

                            <User size={18} />

                            Authorized Person

                        </label>

                        <input

                            value={form.signatory}

                            onChange={(e) => update("signatory", e.target.value)}

                            className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            placeholder="Director"

                        />

                    </div>

                    {/* Designation */}

                    <div className="mt-6">

                        <label className="font-semibold">

                            Designation

                        </label>

                        <input

                            value={form.designation}

                            onChange={(e) => update("designation", e.target.value)}

                            className="mt-2 w-full rounded-2xl border border-slate-300 p-4"

                            placeholder="Managing Director"

                        />

                    </div>

                    {/* Signature */}

                    <div className="mt-8">

                        <label className="font-semibold">

                            Signature

                        </label>

                        <label className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-500">

                            {

                                form.signature ?

                                    <img

                                        src={form.signature}

                                        className="h-28 object-contain"

                                    />

                                    :

                                    <>

                                        <Upload size={40} />

                                        <span className="mt-3">

                                            Upload Signature

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

                                        signature: url,

                                        signatureFile: file,

                                    }));

                                }}
                            />

                        </label>

                    </div>

                    {/* Seal */}

                    <div className="mt-8">

                        <label className="font-semibold flex items-center gap-2">

                            <Stamp size={18} />

                            Company Seal

                        </label>

                        <label className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-500">

                            {

                                form.seal ?

                                    <img

                                        src={form.seal}

                                        className="h-28 object-contain"

                                    />

                                    :

                                    <>

                                        <Upload size={40} />

                                        <span className="mt-3">

                                            Upload Seal

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

                                        seal: url,

                                        sealFile: file,

                                    }));

                                }}
                            />

                        </label>

                    </div>

                    {/* Buttons */}

                    <div className="mt-10 flex justify-between">

                        <button

                            onClick={back}

                            className="rounded-2xl border border-slate-300 bg-white px-6 py-3 font-semibold"

                        >

                            <ArrowLeft className="mr-2 inline" />

                            Back

                        </button>

                        <button

                            disabled={saving}

                            onClick={finish}

                            className="rounded-2xl bg-green-600 px-8 py-3 font-semibold text-white"

                        >

                            {

                                saving ?

                                    "Saving..."

                                    :

                                    "Finish Setup"

                            }

                        </button>

                    </div>

                </div>

            </div>

            {/* RIGHT */}

            <div>

                <div className={`${neo} sticky top-6 rounded-3xl bg-white p-8`}>

                    <div className="flex items-center gap-3">

                        <BadgeCheck

                            className="text-green-600"

                        />

                        <h3 className="font-bold text-xl">

                            Ready

                        </h3>

                    </div>

                    <div className="mt-8 space-y-4">

                        <div className="flex items-center gap-3">

                            <CheckCircle2

                                className="text-green-500"

                                size={20}

                            />

                            Company Branding

                        </div>

                        <div className="flex items-center gap-3">

                            <CheckCircle2

                                className="text-green-500"

                                size={20}

                            />

                            Bank Details

                        </div>

                        <div className="flex items-center gap-3">

                            <CheckCircle2

                                className="text-green-500"

                                size={20}

                            />

                            Terms & Conditions

                        </div>

                        <div className="flex items-center gap-3">

                            <CheckCircle2

                                className="text-green-500"

                                size={20}

                            />

                            Signature Setup

                        </div>

                    </div>

                    <div className="mt-10 rounded-2xl bg-green-50 p-5">

                        <p className="text-sm text-green-700">

                            Click <strong>Finish Setup</strong> to save your quotation template. Every future quotation will automatically use these settings.

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}