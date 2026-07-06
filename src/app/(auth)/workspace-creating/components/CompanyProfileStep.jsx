"use client";

import { useRef, useState } from "react";
import {
    Building2,
    Globe,
    Upload,
    Check,
    BriefcaseBusiness,
} from "lucide-react";

const industries = [
    "Construction",
    "Telecom",
    "Infrastructure",
    "Manufacturing",
    "IT & Software",
    "Healthcare",
    "Education",
    "Retail",
    "Logistics",
    "Others",
];

const businessTypes = [
    "Proprietorship",
    "Partnership",
    "LLP",
    "Private Limited",
    "Public Limited",
    "Government",
    "NGO",
    "Others",
];

export default function CompanyProfileStep({
    company,
    currentUser,
    onNext,
    onBack,
    saving,
}) {

    const fileRef = useRef(null);

    const [logo, setLogo] = useState(null);

    const [preview, setPreview] = useState(null);

    const [form, setForm] = useState({

        companyName: company?.companyName || "",

        shortName: "",

        businessType: "",

        industry: "",

        website: "",

        description: "",

    });

    const handleChange = (field, value) => {

        setForm((prev) => ({

            ...prev,

            [field]: value,

        }));

    };

    const pickLogo = () => {

        fileRef.current.click();

    };

    const handleLogo = (e) => {

        const file = e.target.files[0];

        if (!file) return;

        setLogo(file);

        setPreview(URL.createObjectURL(file));

    };

    return (

        <div className="max-w-7xl mx-auto px-10 py-10">

            <div className="grid lg:grid-cols-3 gap-10">

                {/* LEFT */}

                <div className="lg:col-span-2">

                    <div className="bg-white rounded-3xl shadow-xl p-10">

                        <h1 className="text-4xl font-bold">

                            Company Profile

                        </h1>

                        <p className="text-slate-500 mt-3">

                            Tell us about your company.

                        </p>

                        {/* Logo */}

                        <div className="mt-10">

                            <label className="font-semibold">

                                Company Logo

                            </label>

                            <div
                                onClick={pickLogo}
                                className="mt-4 h-56 rounded-3xl border-2 border-dashed border-slate-300 flex flex-col justify-center items-center cursor-pointer hover:border-blue-500 transition"
                            >

                                {preview ? (

                                    <img
                                        src={preview}
                                        className="h-36 object-contain"
                                    />

                                ) : (

                                    <>

                                        <Upload
                                            className="text-blue-600"
                                            size={45}
                                        />

                                        <p className="mt-5 text-slate-500">

                                            Click to upload company logo

                                        </p>

                                    </>

                                )}

                            </div>

                            <input
                                ref={fileRef}
                                hidden
                                type="file"
                                accept="image/*"
                                onChange={handleLogo}
                            />

                        </div>

                        {/* Company Name */}

                        <div className="mt-8">

                            <label>

                                Company Legal Name

                            </label>

                            <input
                                className="w-full border rounded-2xl p-4 mt-2"
                                value={form.companyName}
                                onChange={(e) =>
                                    handleChange(
                                        "companyName",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        {/* Short Name */}

                        <div className="mt-6">

                            <label>

                                Company Short Name

                            </label>

                            <input
                                className="w-full border rounded-2xl p-4 mt-2"
                                placeholder="Example: SHARO"
                                value={form.shortName}
                                onChange={(e) =>
                                    handleChange(
                                        "shortName",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        {/* Business Type */}

                        <div className="mt-8">

                            <label className="font-semibold">

                                Business Type

                            </label>

                            <div className="grid grid-cols-2 gap-3 mt-4">

                                {businessTypes.map((item) => (

                                    <div
                                        key={item}
                                        onClick={() =>
                                            handleChange(
                                                "businessType",
                                                item
                                            )
                                        }
                                        className={`
cursor-pointer
rounded-2xl
border
p-4
transition

${form.businessType === item
                                                ? "border-blue-600 bg-blue-50"
                                                : ""
                                            }

`}
                                    >

                                        {item}

                                    </div>

                                ))}

                            </div>

                        </div>

                        {/* Industry */}

                        <div className="mt-10">

                            <label className="font-semibold">

                                Industry

                            </label>

                            <div className="grid grid-cols-2 gap-3 mt-4">

                                {industries.map((item) => (

                                    <div
                                        key={item}
                                        onClick={() =>
                                            handleChange(
                                                "industry",
                                                item
                                            )
                                        }
                                        className={`
cursor-pointer
rounded-2xl
border
p-4
transition

${form.industry === item
                                                ? "border-blue-600 bg-blue-50"
                                                : ""
                                            }

`}
                                    >

                                        {item}

                                    </div>

                                ))}

                            </div>

                        </div>

                        {/* Website */}

                        <div className="mt-8">

                            <label>

                                Website

                            </label>

                            <input
                                className="w-full border rounded-2xl p-4 mt-2"
                                placeholder="https://"
                                value={form.website}
                                onChange={(e) =>
                                    handleChange(
                                        "website",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        {/* Description */}

                        <div className="mt-8">

                            <label>

                                Company Description

                            </label>

                            <textarea
                                rows={5}
                                className="w-full border rounded-2xl p-4 mt-2"
                                value={form.description}
                                onChange={(e) =>
                                    handleChange(
                                        "description",
                                        e.target.value
                                    )
                                }
                            />

                        </div>

                        <div className="flex justify-between mt-10">

                            <button
                                onClick={onBack}
                                className="px-8 py-4 rounded-2xl border"
                            >

                                Back

                            </button>

                            <button
                                disabled={saving}
                                onClick={() =>
                                    onNext({
                                        logo,
                                        ...form,
                                    })
                                }
                                className="px-10 py-4 rounded-2xl bg-blue-600 text-white disabled:opacity-50"
                            >

                                {saving ? "Saving..." : "Continue"}

                            </button>

                        </div>

                    </div>

                </div>

                {/* RIGHT */}

                <div>

                    <div className="sticky top-28 bg-white rounded-3xl shadow-xl p-8">

                        <h2 className="font-bold text-xl">

                            Live Preview

                        </h2>

                        <div className="mt-8 flex flex-col items-center">

                            <div className="w-28 h-28 rounded-full bg-slate-100 flex justify-center items-center overflow-hidden">

                                {preview ? (

                                    <img
                                        src={preview}
                                        className="w-full h-full object-cover"
                                    />

                                ) : (

                                    <Building2 size={45} />

                                )}

                            </div>

                            <h2 className="mt-6 text-2xl font-bold">

                                {form.companyName || "Company"}

                            </h2>

                            <p className="text-slate-500 mt-2">

                                {form.industry || "Industry"}

                            </p>

                            <div className="mt-8 space-y-3 w-full">

                                <div className="flex items-center gap-3">

                                    <BriefcaseBusiness
                                        size={18}
                                    />

                                    <span>

                                        {form.businessType ||
                                            "Business Type"}

                                    </span>

                                </div>

                                <div className="flex items-center gap-3">

                                    <Globe size={18} />

                                    <span>

                                        {form.website || "Website"}

                                    </span>

                                </div>

                            </div>

                            <div className="mt-8 rounded-2xl bg-green-50 p-5 w-full">

                                <div className="flex items-center gap-3">

                                    <Check
                                        className="text-green-600"
                                    />

                                    Profile Ready

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    );

}