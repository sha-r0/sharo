"use client";

import {
    Upload,
    Building2,
    ArrowRight,
    Palette,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function BrandingStep({

    form,

    setForm,

    next,

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

                        Company Branding

                    </h2>

                    <p className="mt-2 text-slate-500">

                        Configure your company's identity for every quotation.

                    </p>

                    {/* Logo */}

                    <div className="mt-8">

                        <label className="font-semibold">

                            Company Logo

                        </label>

                        <label className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white hover:border-indigo-500">

                            {

                                form.logo ?

                                    <img

                                        src={form.logo}

                                        alt="Logo"

                                        className="h-28 object-contain"

                                    />

                                    :

                                    <>

                                        <Upload

                                            size={38}

                                            className="text-slate-400"

                                        />

                                        <span className="mt-3 text-slate-500">

                                            Upload Logo

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

                                        logo: url,

                                        logoFile: file,

                                    }));

                                }}
                            />

                        </label>

                    </div>

                    {/* Company Name */}

                    <div className="mt-8">

                        <label className="font-semibold">

                            Company Name

                        </label>

                        <input

                            value={form.companyName}

                            onChange={(e) =>

                                update(

                                    "companyName",

                                    e.target.value

                                )

                            }

                            className="mt-2 w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-indigo-600"

                            placeholder="Troynoy A Pvt Ltd"

                        />

                    </div>

                    {/* Tagline */}

                    <div className="mt-6">

                        <label className="font-semibold">

                            Tagline

                        </label>

                        <input

                            value={form.tagline}

                            onChange={(e) =>

                                update(

                                    "tagline",

                                    e.target.value

                                )

                            }

                            className="mt-2 w-full rounded-2xl border border-slate-300 p-4 outline-none focus:border-indigo-600"

                            placeholder="Engineering Excellence"

                        />

                    </div>

                    {/* Colors */}

                    <div className="grid md:grid-cols-2 gap-6 mt-8">

                        <div>

                            <label className="font-semibold">

                                Primary Color

                            </label>

                            <div className="mt-3 flex items-center gap-4">

                                <input

                                    type="color"

                                    value={form.primaryColor}

                                    onChange={(e) =>

                                        update(

                                            "primaryColor",

                                            e.target.value

                                        )

                                    }

                                    className="h-14 w-20 rounded-xl"

                                />

                                <span>

                                    {form.primaryColor}

                                </span>

                            </div>

                        </div>

                        <div>

                            <label className="font-semibold">

                                Secondary Color

                            </label>

                            <div className="mt-3 flex items-center gap-4">

                                <input

                                    type="color"

                                    value={form.secondaryColor}

                                    onChange={(e) =>

                                        update(

                                            "secondaryColor",

                                            e.target.value

                                        )

                                    }

                                    className="h-14 w-20 rounded-xl"

                                />

                                <span>

                                    {form.secondaryColor}

                                </span>

                            </div>

                        </div>

                    </div>

                    {/* Button */}

                    <div className="mt-10 flex justify-end">

                        <button

                            onClick={next}

                            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 font-semibold text-white hover:bg-indigo-700"

                        >

                            Continue

                            <ArrowRight size={20} />

                        </button>

                    </div>

                </div>

            </div>

            {/* Live Preview */}

            <div>

                <div className={`${neo} sticky top-6 rounded-3xl bg-white p-8`}>

                    <div className="flex items-center gap-4">

                        <div

                            className="flex h-20 w-20 items-center justify-center rounded-2xl"

                            style={{

                                background:

                                    form.primaryColor,

                            }}

                        >

                            {

                                form.logo ?

                                    <img

                                        src={form.logo}

                                        className="h-14"

                                    />

                                    :

                                    <Building2

                                        size={40}

                                        color="white"

                                    />

                            }

                        </div>

                        <div>

                            <h2

                                className="text-2xl font-bold"

                                style={{

                                    color:

                                        form.secondaryColor,

                                }}

                            >

                                {

                                    form.companyName ||

                                    "Company Name"

                                }

                            </h2>

                            <p className="text-slate-500">

                                {

                                    form.tagline ||

                                    "Company Tagline"

                                }

                            </p>

                        </div>

                    </div>

                    <div className="mt-10 rounded-2xl bg-slate-50 p-6">

                        <div className="flex items-center gap-3">

                            <Palette

                                size={22}

                                color={form.primaryColor}

                            />

                            <span>

                                Live Branding Preview

                            </span>

                        </div>

                        <div className="mt-6 h-2 rounded-full bg-slate-200">

                            <div

                                className="h-full rounded-full"

                                style={{

                                    width: "75%",

                                    background:

                                        form.primaryColor,

                                }}

                            />

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}