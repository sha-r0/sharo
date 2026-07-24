"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    useRouter,
    useSearchParams,
} from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import Stepper from "./components/Stepper";
import BrandingStep from "./components/BrandingStep";
import BankStep from "./components/BankStep";
import TermsStep from "./components/TermsStep";
import SignatureStep from "./components/SignatureStep";

import QuotationSetupService from "../services/QuotationSetupService";

const INITIAL_FORM = {
    //////////////////////////////////////////////////////
    // Branding
    //////////////////////////////////////////////////////

    logo: "",
    logoFile: null,

    companyName: "",
    tagline: "",

    gstNumber: "",
    phone: "",
    email: "",
    address: "",
    website: "",

    primaryColor: "#2563eb",
    secondaryColor: "#111827",

    //////////////////////////////////////////////////////
    // Bank
    //////////////////////////////////////////////////////

    bankName: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    branch: "",
    upi: "",

    qrCode: "",
    qrCodeFile: null,

    //////////////////////////////////////////////////////
    // Terms
    //////////////////////////////////////////////////////

    paymentTerms: "",
    deliveryTerms: "",
    warranty: "",
    notes: "",
    declaration: "",

    //////////////////////////////////////////////////////
    // Signature
    //////////////////////////////////////////////////////

    signature: "",
    signatureFile: null,

    signatory: "",
    designation: "",

    seal: "",
    sealFile: null,

    //////////////////////////////////////////////////////
    // Quotation Settings
    //////////////////////////////////////////////////////

    quotationPrefix: "QT",
    defaultValidityDays: 30,
};

export default function QuotationSetupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { company } = useAuth();

    const TOTAL_STEPS = 4;

    const isEditMode =
        searchParams.get("mode") === "edit";

    const [step, setStep] = useState(1);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [form, setForm] =
        useState(INITIAL_FORM);

    //////////////////////////////////////////////////////
    // Load Existing Setup or Company Data
    //////////////////////////////////////////////////////

    useEffect(() => {
        if (!company?.id) return;

        loadSetup();
    }, [company?.id]);

    async function loadSetup() {
        try {
            setLoading(true);

            const savedSettings =
                await QuotationSetupService.load(
                    company.id
                );

            const populatedForm =
                QuotationSetupService.settingsToForm(
                    savedSettings,
                    company
                );

            setForm({
                ...INITIAL_FORM,
                ...populatedForm,
            });
        } catch (error) {
            console.error(
                "Failed to load quotation setup:",
                error
            );

            setForm({
                ...INITIAL_FORM,

                logo:
                    company?.logoUrl || "",

                companyName:
                    company?.companyName || "",

                gstNumber:
                    company?.gstNumber || "",

                phone:
                    company?.phone ||
                    company?.ownerPhone ||
                    "",

                email:
                    company?.companyEmail ||
                    company?.ownerEmail ||
                    "",

                address:
                    company?.companyAddress || "",

                website:
                    company?.website || "",

                signatory:
                    company?.ownerName || "",
            });
        } finally {
            setLoading(false);
        }
    }

    //////////////////////////////////////////////////////
    // Navigation
    //////////////////////////////////////////////////////

    function next() {
        setStep((previousStep) =>
            Math.min(
                previousStep + 1,
                TOTAL_STEPS
            )
        );
    }

    function back() {
        setStep((previousStep) =>
            Math.max(
                previousStep - 1,
                1
            )
        );
    }

    //////////////////////////////////////////////////////
    // Final Validation
    //////////////////////////////////////////////////////

    function validateBeforeSave() {
        if (!form.companyName?.trim()) {
            alert("Company name is required.");
            setStep(1);
            return false;
        }

        if (!form.phone?.trim()) {
            alert("Mobile number is required.");
            setStep(1);
            return false;
        }

        if (!form.email?.trim()) {
            alert("Email address is required.");
            setStep(1);
            return false;
        }

        if (!form.address?.trim()) {
            alert("Company address is required.");
            setStep(1);
            return false;
        }

        const emailPattern =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailPattern.test(form.email.trim())) {
            alert("Enter a valid email address.");
            setStep(1);
            return false;
        }

        if (
            form.defaultValidityDays &&
            Number(form.defaultValidityDays) <= 0
        ) {
            alert(
                "Default validity days must be greater than zero."
            );
            return false;
        }

        return true;
    }

    //////////////////////////////////////////////////////
    // Save Setup
    //////////////////////////////////////////////////////

    async function finish() {
        if (!company?.id) {
            alert("Company not found.");
            return;
        }

        if (!validateBeforeSave()) {
            return;
        }

        try {
            setSaving(true);

            await QuotationSetupService.save(
                company.id,
                form
            );

            router.replace(
                "/manager/quotation-builder"
            );
        } catch (error) {
            console.error(
                "Failed to save quotation setup:",
                error
            );

            alert(
                error?.message ||
                "Failed to save quotation setup."
            );
        } finally {
            setSaving(false);
        }
    }

    //////////////////////////////////////////////////////
    // Loading
    //////////////////////////////////////////////////////

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />

                    <p className="mt-4 text-sm text-slate-500">
                        Loading quotation setup...
                    </p>
                </div>
            </div>
        );
    }

    //////////////////////////////////////////////////////
    // UI
    //////////////////////////////////////////////////////

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isEditMode
                        ? "Edit Quotation Template"
                        : "Quotation Setup"}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    {isEditMode
                        ? "Update company details, banking information, terms and signature."
                        : "Complete the setup before creating quotations."}
                </p>
            </div>

            <Stepper step={step} />

            {step === 1 && (
                <BrandingStep
                    form={form}
                    setForm={setForm}
                    next={next}
                />
            )}

            {step === 2 && (
                <BankStep
                    form={form}
                    setForm={setForm}
                    next={next}
                    back={back}
                />
            )}

            {step === 3 && (
                <TermsStep
                    form={form}
                    setForm={setForm}
                    next={next}
                    back={back}
                />
            )}

            {step === 4 && (
                <SignatureStep
                    form={form}
                    setForm={setForm}
                    back={back}
                    finish={finish}
                    saving={saving}
                    isEditMode={isEditMode}
                />
            )}
        </div>
    );
}