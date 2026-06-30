"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Gift } from "lucide-react";

import BillingToggle from "./BillingToggle";
import PricingCard from "./PricingCard";

export default function PlanSelection({
  formData,
  setFormData,
  handleContinue,
  handleBack,
}) {
  const [billingCycle, setBillingCycle] = useState("monthly");

  const plans = [
    {
      id: "Starter",
      title: "Starter",
      description: "Perfect for small teams",
      monthly: 999,
      yearly: 799,
      features: [
        "Up to 25 Users",
        "Attendance Tracking",
        "Expense Management",
        "Basic Reports",
        "Email Support",
      ],
    },
    {
      id: "Business",
      title: "Business",
      description: "Best for growing businesses",
      monthly: 2999,
      yearly: 2399,
      popular: true,
      features: [
        "Up to 100 Users",
        "Attendance Tracking",
        "Project Management",
        "Payroll Management",
        "Advanced Reports",
        "Priority Support",
      ],
    },
    {
      id: "Enterprise",
      title: "Enterprise",
      description: "For large organizations",
      monthly: null,
      yearly: null,
      buttonText: "Contact Sales",
      features: [
        "Unlimited Users",
        "Everything in Business",
        "API Access",
        "Dedicated Support",
        "Custom Integrations",
      ],
    },
  ];

  function selectPlan(plan) {
    const price =
      plan.monthly === null
        ? "Custom"
        : billingCycle === "monthly"
        ? `₹${plan.monthly.toLocaleString()}`
        : `₹${plan.yearly.toLocaleString()}`;

    setFormData((prev) => ({
      ...prev,
      plan: plan.title,
      total: price,
      billingCycle,
    }));
  }

  return (
    <div>

      {/* Heading */}

      <div className="mb-10">

        <h2 className="text-5xl font-bold text-[#071330]">
          Choose Your Plan
        </h2>

        <p className="text-slate-500 mt-3 text-lg">
          Select the perfect plan for your business.
        </p>

      </div>

      {/* Toggle */}

      <BillingToggle
        billingCycle={billingCycle}
        setBillingCycle={setBillingCycle}
      />

      {/* Cards */}

      <div className="grid lg:grid-cols-3 gap-8 mt-10">

        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            title={plan.title}
            description={plan.description}
            price={
              plan.monthly === null
                ? "Custom"
                : billingCycle === "monthly"
                ? `₹${plan.monthly.toLocaleString()}`
                : `₹${plan.yearly.toLocaleString()}`
            }
            period={plan.monthly === null ? "" : "/month"}
            features={plan.features}
            popular={plan.popular}
            buttonText={plan.buttonText || "Select Plan"}
            selected={formData.plan === plan.title}
            onSelect={() => selectPlan(plan)}
          />
        ))}

      </div>

      {/* Trial Banner */}

      <div className="mt-10 rounded-3xl bg-[#f5f5f5] p-6 flex items-center gap-5 shadow-[0px_0.7px_0.7px_-0.6px_rgba(0,0,0,.08),0px_30px_30px_-4px_rgba(0,0,0,.03),inset_0px_2px_1px_rgba(255,255,255,1)]">

        <div className="h-14 w-14 rounded-2xl bg-[#eef3ff] flex items-center justify-center">
          <Gift className="text-[#3D5AFE]" />
        </div>

        <div>
          <h4 className="font-semibold text-lg">
            All plans include a 14-day free trial
          </h4>

          <p className="text-slate-500">
            No credit card required. Cancel anytime.
          </p>
        </div>

      </div>

      {/* Navigation */}

      <div className="flex items-center justify-between mt-10">

        <button
          onClick={handleBack}
          className="h-14 px-8 rounded-2xl border border-slate-300 flex items-center gap-3 font-semibold hover:bg-white transition"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <button
          disabled={!formData.plan}
          onClick={handleContinue}
          className="h-14 px-10 rounded-2xl bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white font-semibold flex items-center gap-3 shadow-[0_20px_40px_rgba(61,90,254,.35)] hover:scale-[1.02] transition disabled:opacity-40"
        >
          Continue to Payment
          <ArrowRight size={18} />
        </button>

      </div>

    </div>
  );
}