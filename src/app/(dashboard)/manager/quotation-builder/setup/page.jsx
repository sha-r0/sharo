"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import Stepper from "./components/Stepper";
import BrandingStep from "./components/BrandingStep";
import BankStep from "./components/BankStep";
import TermsStep from "./components/TermsStep";
import SignatureStep from "./components/SignatureStep";

import QuotationSetupService from "../services/QuotationSetupService";

export default function QuotationSetupPage() {

    const router = useRouter();

    const { company } = useAuth();

    const TOTAL_STEPS = 4;

    const [step, setStep] = useState(1);

    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({

        // Branding

        logo: "",

        companyName: "",

        tagline: "",

        primaryColor: "#2563eb",

        secondaryColor: "#111827",

        // Bank

        bankName: "",

        accountName: "",

        accountNumber: "",

        ifsc: "",

        branch: "",

        upi: "",

        qrCode: "",

        // Terms

        paymentTerms: "",

        deliveryTerms: "",

        warranty: "",

        notes: "",

        declaration: "",

        // Signature

        signature: "",

        signatory: "",

        designation: "",

        seal: "",

    });

    // Autofill from Company document

    useEffect(() => {

        if (!company) return;

        setForm((prev) => ({

            ...prev,

            logo: company.logoUrl || "",

            companyName: company.companyName || "",

            signatory: company.ownerName || "",

        }));

    }, [company]);

    function next() {

        setStep((prev) =>

            Math.min(prev + 1, TOTAL_STEPS)

        );

    }

    function back() {

        setStep((prev) =>

            Math.max(prev - 1, 1)

        );

    }

    async function finish() {

        if (!company?.id) {

            alert("Company not found.");

            return;

        }

        try {

            setSaving(true);

            await QuotationSetupService.save(

                company.id,

                form

            );

            router.replace("/manager/quotation-builder");

        } catch (error) {

            console.error(error);

            alert("Failed to save quotation setup.");

        } finally {

            setSaving(false);

        }

    }

    return (

        <div className="space-y-8">

            <Stepper

                step={step}

            />

            {

                step === 1 &&

                <BrandingStep

                    form={form}

                    setForm={setForm}

                    next={next}

                />

            }

            {

                step === 2 &&

                <BankStep

                    form={form}

                    setForm={setForm}

                    next={next}

                    back={back}

                />

            }

            {

                step === 3 &&

                <TermsStep

                    form={form}

                    setForm={setForm}

                    next={next}

                    back={back}

                />

            }

            {

                step === 4 &&

                <SignatureStep

                    form={form}

                    setForm={setForm}

                    back={back}

                    finish={finish}

                    saving={saving}

                />

            }

        </div>

    );

}