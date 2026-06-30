"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";

import PaymentMethod from "./PaymentMethod";
import BillingDetails from "./BillingDetails";
import CouponCard from "./CouponCard";

export default function PaymentStep({
  formData,
  setFormData,
  handleBack,
  handlePayment,
}) {
  return (
    <div>

      {/* Heading */}

      <div className="mb-10">

        <h2 className="text-5xl font-bold text-[#071330]">
          Complete Your Purchase
        </h2>

        <p className="mt-3 text-lg text-slate-500">
          One final step to activate your SHARO workspace.
        </p>

      </div>

      <div className=" gap-8">

        {/* LEFT */}

        <div className="space-y-6">

          <PaymentMethod
            formData={formData}
            setFormData={setFormData}
          />

          <BillingDetails
            formData={formData}
            setFormData={setFormData}
          />

          <CouponCard />

        </div>

      </div>

      {/* Buttons */}

      <div className="flex justify-between mt-10">

        <button
          onClick={handleBack}
          className="h-14 px-8 rounded-2xl border border-slate-300 font-semibold flex items-center gap-3 hover:bg-white transition"
        >
          <ArrowLeft size={18} />

          Back
        </button>

        <button
          onClick={handlePayment}
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white font-semibold flex items-center gap-3 shadow-[0_20px_40px_rgba(61,90,254,.35)] hover:scale-[1.02] transition"
        >
          Proceed to Payment

          <ArrowRight size={18} />
        </button>

      </div>

    </div>
  );
}