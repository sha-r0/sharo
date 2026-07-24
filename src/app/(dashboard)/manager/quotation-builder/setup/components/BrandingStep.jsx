"use client";

import {
    ArrowRight,
    Building2,
    Globe2,
    Mail,
    MapPin,
    Palette,
    Phone,
    ReceiptText,
    Upload,
} from "lucide-react";

const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function BrandingStep({
    form,
    setForm,
    next,
}) {
    function update(key, value) {
        setForm((previous) => ({
            ...previous,
            [key]: value,
        }));
    }

    function handleLogoChange(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            alert("Only JPG, PNG and WEBP images are allowed.");
            event.target.value = "";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Logo size must be less than 5 MB.");
            event.target.value = "";
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        setForm((previous) => ({
            ...previous,
            logo: previewUrl,
            logoFile: file,
        }));
    }

    function normalizeWebsite(value) {
        return value.trim();
    }

    function validateStep() {
        if (!form.companyName?.trim()) {
            alert("Company name is required.");
            return false;
        }

        if (!form.phone?.trim()) {
            alert("Mobile number is required.");
            return false;
        }

        if (!form.email?.trim()) {
            alert("Email address is required.");
            return false;
        }

        if (!form.address?.trim()) {
            alert("Company address is required.");
            return false;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(form.email.trim())) {
            alert("Enter a valid email address.");
            return false;
        }

        const phoneDigits = form.phone.replace(/\D/g, "");

        if (phoneDigits.length < 10) {
            alert("Enter a valid mobile number.");
            return false;
        }

        if (
            form.gstNumber?.trim() &&
            form.gstNumber.trim().length !== 15
        ) {
            alert("GST number must contain 15 characters.");
            return false;
        }

        return true;
    }

    function handleContinue() {
        if (!validateStep()) return;

        setForm((previous) => ({
            ...previous,
            companyName: previous.companyName.trim(),
            tagline: previous.tagline?.trim() || "",
            gstNumber:
                previous.gstNumber?.trim().toUpperCase() || "",
            phone: previous.phone?.trim() || "",
            email: previous.email?.trim().toLowerCase() || "",
            address: previous.address?.trim() || "",
            website: normalizeWebsite(previous.website || ""),
        }));

        next();
    }

    const inputClass =
        "mt-2 w-full rounded-2xl border border-slate-300 bg-white p-4 text-slate-900 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100";

    return (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            {/* Form */}
            <div className="xl:col-span-2">
                <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-6 sm:p-8`}>
                    <h2 className="text-2xl font-bold text-slate-900">
                        Company Branding
                    </h2>

                    <p className="mt-2 text-slate-500">
                        Configure your company identity and contact details for every quotation.
                    </p>

                    {/* Logo */}
                    <div className="mt-8">
                        <label className="font-semibold text-slate-800">
                            Company Logo
                        </label>

                        <label className="mt-3 flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 transition hover:border-indigo-500 hover:bg-indigo-50/30">
                            {form.logo ? (
                                <>
                                    <img
                                        src={form.logo}
                                        alt="Company logo preview"
                                        className="h-28 max-w-full object-contain"
                                    />

                                    <span className="mt-3 text-sm font-medium text-indigo-600">
                                        Click to replace logo
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Upload
                                        size={38}
                                        className="text-slate-400"
                                    />

                                    <span className="mt-3 font-medium text-slate-600">
                                        Upload Logo
                                    </span>

                                    <span className="mt-1 text-xs text-slate-400">
                                        JPG, PNG or WEBP up to 5 MB
                                    </span>
                                </>
                            )}

                            <input
                                type="file"
                                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                hidden
                                onChange={handleLogoChange}
                            />
                        </label>
                    </div>

                    {/* Company name and tagline */}
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="font-semibold text-slate-800">
                                Company Name
                                <span className="ml-1 text-red-500">*</span>
                            </label>

                            <input
                                type="text"
                                value={form.companyName || ""}
                                onChange={(event) =>
                                    update(
                                        "companyName",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="Troynoy A Pvt Ltd"
                            />
                        </div>

                        <div>
                            <label className="font-semibold text-slate-800">
                                Tagline
                            </label>

                            <input
                                type="text"
                                value={form.tagline || ""}
                                onChange={(event) =>
                                    update(
                                        "tagline",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="Engineering Excellence"
                            />
                        </div>
                    </div>

                    {/* GST and phone */}
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="flex items-center gap-2 font-semibold text-slate-800">
                                <ReceiptText size={17} />
                                GST Number
                            </label>

                            <input
                                type="text"
                                maxLength={15}
                                value={form.gstNumber || ""}
                                onChange={(event) =>
                                    update(
                                        "gstNumber",
                                        event.target.value.toUpperCase()
                                    )
                                }
                                className={inputClass}
                                placeholder="07ABCDE1234F1Z5"
                            />

                            <p className="mt-1 text-xs text-slate-400">
                                Optional. Enter the 15-character GSTIN.
                            </p>
                        </div>

                        <div>
                            <label className="flex items-center gap-2 font-semibold text-slate-800">
                                <Phone size={17} />
                                Mobile Number
                                <span className="text-red-500">*</span>
                            </label>

                            <input
                                type="tel"
                                value={form.phone || ""}
                                onChange={(event) =>
                                    update(
                                        "phone",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                    </div>

                    {/* Email and website */}
                    <div className="mt-6 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="flex items-center gap-2 font-semibold text-slate-800">
                                <Mail size={17} />
                                Email Address
                                <span className="text-red-500">*</span>
                            </label>

                            <input
                                type="email"
                                value={form.email || ""}
                                onChange={(event) =>
                                    update(
                                        "email",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="company@example.com"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 font-semibold text-slate-800">
                                <Globe2 size={17} />
                                Website
                            </label>

                            <input
                                type="text"
                                value={form.website || ""}
                                onChange={(event) =>
                                    update(
                                        "website",
                                        event.target.value
                                    )
                                }
                                className={inputClass}
                                placeholder="https://example.com"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div className="mt-6">
                        <label className="flex items-center gap-2 font-semibold text-slate-800">
                            <MapPin size={17} />
                            Company Address
                            <span className="text-red-500">*</span>
                        </label>

                        <textarea
                            rows={4}
                            value={form.address || ""}
                            onChange={(event) =>
                                update(
                                    "address",
                                    event.target.value
                                )
                            }
                            className={`${inputClass} resize-none`}
                            placeholder="Registered office address"
                        />
                    </div>

                    {/* Colors */}
                    <div className="mt-8 grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="font-semibold text-slate-800">
                                Primary Color
                            </label>

                            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3">
                                <input
                                    type="color"
                                    value={
                                        form.primaryColor ||
                                        "#2563eb"
                                    }
                                    onChange={(event) =>
                                        update(
                                            "primaryColor",
                                            event.target.value
                                        )
                                    }
                                    className="h-12 w-16 cursor-pointer rounded-xl border-0 bg-transparent"
                                />

                                <span className="font-mono text-sm text-slate-600">
                                    {form.primaryColor || "#2563eb"}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="font-semibold text-slate-800">
                                Secondary Color
                            </label>

                            <div className="mt-3 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3">
                                <input
                                    type="color"
                                    value={
                                        form.secondaryColor ||
                                        "#111827"
                                    }
                                    onChange={(event) =>
                                        update(
                                            "secondaryColor",
                                            event.target.value
                                        )
                                    }
                                    className="h-12 w-16 cursor-pointer rounded-xl border-0 bg-transparent"
                                />

                                <span className="font-mono text-sm text-slate-600">
                                    {form.secondaryColor || "#111827"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Continue */}
                    <div className="mt-10 flex justify-end">
                        <button
                            type="button"
                            onClick={handleContinue}
                            className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-8 py-4 font-semibold text-white transition hover:bg-indigo-700"
                        >
                            Continue
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Live Preview */}
            <div>
                <div className={`${neo} sticky top-6 rounded-3xl bg-white p-6 sm:p-8`}>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                        Quotation Header Preview
                    </p>

                    <div className="mt-5 flex items-start gap-4">
                        <div
                            className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                            style={{
                                background:
                                    form.primaryColor || "#2563eb",
                            }}
                        >
                            {form.logo ? (
                                <img
                                    src={form.logo}
                                    alt="Company logo"
                                    className="h-14 max-w-[90%] object-contain"
                                />
                            ) : (
                                <Building2
                                    size={40}
                                    color="white"
                                />
                            )}
                        </div>

                        <div className="min-w-0">
                            <h2
                                className="break-words text-2xl font-bold"
                                style={{
                                    color:
                                        form.secondaryColor ||
                                        "#111827",
                                }}
                            >
                                {form.companyName || "Company Name"}
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                {form.tagline || "Company Tagline"}
                            </p>
                        </div>
                    </div>

                    <div className="mt-7 space-y-3 border-t border-slate-100 pt-6 text-sm">
                        <div className="flex items-start gap-3">
                            <MapPin
                                size={16}
                                className="mt-0.5 shrink-0 text-slate-400"
                            />
                            <span className="break-words text-slate-600">
                                {form.address || "Company address"}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <Phone
                                size={16}
                                className="shrink-0 text-slate-400"
                            />
                            <span className="text-slate-600">
                                {form.phone || "Mobile number"}
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <Mail
                                size={16}
                                className="shrink-0 text-slate-400"
                            />
                            <span className="break-all text-slate-600">
                                {form.email || "Email address"}
                            </span>
                        </div>

                        {form.website && (
                            <div className="flex items-center gap-3">
                                <Globe2
                                    size={16}
                                    className="shrink-0 text-slate-400"
                                />
                                <span className="break-all text-slate-600">
                                    {form.website}
                                </span>
                            </div>
                        )}

                        {form.gstNumber && (
                            <div className="flex items-center gap-3">
                                <ReceiptText
                                    size={16}
                                    className="shrink-0 text-slate-400"
                                />
                                <span className="font-medium text-slate-600">
                                    GSTIN: {form.gstNumber}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 rounded-2xl bg-slate-50 p-6">
                        <div className="flex items-center gap-3">
                            <Palette
                                size={22}
                                color={
                                    form.primaryColor ||
                                    "#2563eb"
                                }
                            />

                            <span className="font-medium text-slate-700">
                                Live Branding Preview
                            </span>
                        </div>

                        <div className="mt-6 h-2 rounded-full bg-slate-200">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: "75%",
                                    background:
                                        form.primaryColor ||
                                        "#2563eb",
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}