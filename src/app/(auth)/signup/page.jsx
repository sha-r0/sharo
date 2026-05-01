"use client";
import { useState } from "react";

import SignupStep1 from "./components/SignupStep1";
import SignupStep2 from "./components/SignupStep2";
import SignupStep3 from "./components/SignupStep3";

export default function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});

  const next = (data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setStep((prev) => prev + 1);
  };

  const back = () => {
    setStep((prev) => prev - 1);
  };

  return (
    <main className="bg-gray-50 min-h-screen flex items-center justify-center px-6">

      <div className="w-full max-w-xl bg-white p-8 rounded-xl border border-gray-200 shadow-sm">

        {/* HEADER */}
        <h1 className="text-2xl font-semibold mb-6 text-center text-gray-800">
          Create Company Account
        </h1>

        {/* STEP INDICATOR */}
        <div className="flex justify-between mb-8 text-sm text-gray-400">
          <span className={step >= 1 ? "text-blue-600 font-medium" : ""}>
            1. Company
          </span>
          <span className={step >= 2 ? "text-blue-600 font-medium" : ""}>
            2. Admin
          </span>
          <span className={step >= 3 ? "text-blue-600 font-medium" : ""}>
            3. Payment
          </span>
        </div>

        {/* STEPS */}
        {step === 1 && <SignupStep1 next={next} />}

        {step === 2 && (
          <SignupStep2
            next={next}
            back={back}
            data={formData}   // ✅ IMPORTANT FIX
          />
        )}

        {step === 3 && (
          <SignupStep3
            data={formData}
            back={back}
          />
        )}
      </div>
    </main>
  );
}