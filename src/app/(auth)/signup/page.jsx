"use client";

import { useState } from "react";

import SignupStep1 from "./components/SignupStep1";
import SignupStep2 from "./components/SignupStep2";
import SignupStep3 from "./components/SignupStep3";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const next = (data) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));

    setStep((prev) => prev + 1);
  };

  const back = () => {
    setStep((prev) => prev - 1);
  };

  return (
    <main className="bg-gray-50 min-h-screen py-10 px-6">

      <div className="w-full max-w-6xl mx-auto bg-white rounded-xl border border-gray-200 shadow-sm p-8">

        {/* Header */}

        <h1 className="text-3xl font-bold text-center text-gray-800">
          Create Company Account
        </h1>

        {/* Step Indicator */}

        <div className="flex justify-between mt-8 mb-10 text-sm">

          <span
            className={
              step >= 1
                ? "text-blue-600 font-semibold"
                : "text-gray-400"
            }
          >
            1. Company
          </span>

          <span
            className={
              step >= 2
                ? "text-blue-600 font-semibold"
                : "text-gray-400"
            }
          >
            2. Admin
          </span>

          <span
            className={
              step >= 3
                ? "text-blue-600 font-semibold"
                : "text-gray-400"
            }
          >
            3. Payment
          </span>

        </div>

        {/* Step Content */}

        {step === 1 && (
          <div className="max-w-3xl mx-auto">
            <SignupStep1 next={next} />
          </div>
        )}

        {step === 2 && (
          <div className="max-w-3xl mx-auto">
            <SignupStep2
              next={next}
              back={back}
              data={formData}
            />
          </div>
        )}

        {step === 3 && (
          <div className="max-w-7xl mx-auto">
            <SignupStep3
              data={formData}
              back={back}
            />
          </div>
        )}

      </div>

    </main>
  );
}