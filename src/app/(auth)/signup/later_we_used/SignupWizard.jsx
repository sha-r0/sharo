"use client";

import { useState } from "react";

import ProgressStepper from "./ProgressStepper";
import CompanyForm from "./CompanyForm";
import WorkspaceSummary from "./WorkspaceSummary";
import PlanSelection from "./PlanSelection";
import PaymentStep from "./PaymentStep";


export default function SignupWizard() {
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        companyName: "",
        companyEmail: "",
        phone: "",
        industry: "",
        employees: "",
        country: "",
        plan: "Professional",
        total: "₹999",
    });

    function handleChange(e) {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    }

    function nextStep() {
        if (step < 3) setStep((prev) => prev + 1);
    }

    function previousStep() {
        if (step > 1) setStep((prev) => prev - 1);
    }

    const neoShadow =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    return (
        <div className="w-full ">

            {/* Main Signup Card */}

            <div
                className={`
          bg-[#eef2f7]
          p-8 md:p-10
        `}
            >

                {/* Stepper */}

                <ProgressStepper step={step} />

                {/* Main Content */}

                <div className="grid xl:grid-cols-[1fr_460px] gap-8 mt-12 items-start">

                    {/* LEFT */}

                    <div
                        className={`
              bg-[#f5f5f5]
              rounded-[32px]
              p-8
              ${neoShadow}
            `}
                    >
                        {step === 1 && (
                            <CompanyForm
                                formData={formData}
                                handleChange={handleChange}
                                handleContinue={nextStep}
                            />
                        )}

                        {step === 2 && (
                            <PlanSelection
                                formData={formData}
                                setFormData={setFormData}
                                handleContinue={nextStep}
                                handleBack={previousStep}
                            />
                        )}

                        {step === 3 && (
                            <PaymentStep
                                formData={formData}
                                setFormData={setFormData}
                                handleBack={previousStep}
                                handlePayment={() => {
                                    router.push("/auth/workspace-creating");
                                  }}
                            />
                        )}
                    </div>

                    {/* RIGHT */}

                    <WorkspaceSummary
                        company={formData.companyName}
                        employees={formData.employees}
                        plan={formData.plan}
                        total={formData.total}
                    />
                </div>

                {/* Back Button */}

                {step > 1 && (
                    <div className="mt-8">
                        <button
                            onClick={previousStep}
                            className="text-slate-500 hover:text-blue-600 transition"
                        >
                            ← Back
                        </button>
                    </div>
                )}
            </div>

            {/* Trust Bar */}

            {/* <TrustBar /> */}

        </div>
    );
}