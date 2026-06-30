"use client";

import { useState } from "react";
import {
  Rocket,
  Building2,
  Shield,
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const plans = [
    {
      icon: Rocket,
      title: "Starter",
      description: "Perfect for small teams getting started.",
      monthly: "999",
      yearly: "799",
      button: "Get Started",
      features: [
        "Up to 25 Employees",
        "Attendance Tracking",
        "Projects Management",
        "Expenses Management",
        "Basic Reports",
      ],
    },
    {
      icon: Building2,
      title: "Business",
      description: "Best for growing businesses that want more.",
      monthly: "2999",
      yearly: "2399",
      popular: true,
      button: "Start Trial",
      features: [
        "Unlimited Employees",
        "Everything in Starter",
        "Payroll Management",
        "Advanced Analytics",
        "AI Insights",
        "Inventory Management",
        "Approvals & Workflows",
      ],
    },
    {
      icon: Shield,
      title: "Enterprise",
      description:
        "Advanced security and customization for large teams.",
      monthly: "Custom",
      yearly: "Custom",
      button: "Contact Us",
      features: [
        "Everything in Business",
        "Custom Roles & Permissions",
        "API Access",
        "White Label (Optional)",
        "Dedicated Account Manager",
        "Priority Support (SLA)",
        "Custom Integrations",
      ],
    },
  ];

  return (
    <section id="pricing" className="relative py-10 overflow-hidden scroll-mt-32">

      {/* Background */}
      <div className="absolute left-20 bottom-20 w-52 h-52 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="absolute right-20 top-40 w-64 h-64 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="max-w-7xl mx-auto px-6">

        {/* Badge */}
        <div className="flex justify-center">
          <div
            className={`
            px-6 py-2
            rounded-full
            bg-[#f5f5f5]
            flex items-center gap-2
            text-blue-600
            font-medium
            ${neoShadow}
          `}
          >
            <Sparkles size={16} />
            SIMPLE PRICING
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mt-8">
          <h2 className="text-3xl md:text-5xl font-bold text-[#071330]">
            Flexible plans for every business
          </h2>

          <p className="mt-5 text-s text-slate-500">
            Start free. Upgrade as you grow.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mt-10">
          <div
            className={`
            bg-[#f5f5f5]
            p-2
            rounded-full
            flex items-center gap-2
            ${neoShadow}
          `}
          >
            <button
              onClick={() => setYearly(false)}
              className={`px-8 py-3 rounded-full font-medium transition ${
                !yearly
                  ? "bg-blue-600 text-white"
                  : "text-slate-600"
              }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setYearly(true)}
              className={`px-8 py-3 rounded-full font-medium transition ${
                yearly
                  ? "bg-blue-600 text-white"
                  : "text-slate-600"
              }`}
            >
              Yearly (Save 20%)
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mt-20">

          {plans.map((plan, index) => {
            const Icon = plan.icon;

            return (
              <div
                key={index}
                className={`
                relative
                bg-[#f5f5f5]
                rounded-[32px]
                p-8
                ${neoShadow}

                ${
                  plan.popular
                    ? "border-2 border-blue-500 scale-105"
                    : ""
                }
              `}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <div
                      className="
                      bg-blue-600
                      text-white
                      px-5
                      py-2
                      rounded-full
                      text-sm
                      font-medium
                      shadow-lg
                    "
                    >
                      ⭐ MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Icon */}
                <div className="flex justify-center">
                  <div
                    className={`
                    h-20
                    w-20
                    rounded-[24px]
                    bg-[#eef2ff]
                    flex
                    items-center
                    justify-center
                    ${neoShadow}
                  `}
                  >
                    <Icon
                      size={36}
                      className={
                        plan.popular
                          ? "text-blue-600"
                          : "text-indigo-500"
                      }
                    />
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mt-6">
                  <h3 className="text-3xl font-bold text-[#071330]">
                    {plan.title}
                  </h3>

                  <p className="mt-3 text-slate-500">
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="mt-8 pt-8 border-t border-slate-200 text-center">
                  {plan.monthly === "Custom" ? (
                    <>
                      <h4 className="text-5xl font-bold text-violet-600">
                        Custom
                      </h4>

                      <p className="mt-2 text-slate-500">
                        Let's talk
                      </p>
                    </>
                  ) : (
                    <>
                      <h4
                        className={`text-5xl font-bold ${
                          plan.popular
                            ? "text-blue-600"
                            : "text-[#071330]"
                        }`}
                      >
                        ₹
                        {yearly
                          ? plan.yearly
                          : plan.monthly}
                      </h4>

                      <p className="mt-2 text-slate-500">
                        / month
                      </p>
                    </>
                  )}
                </div>

                {/* Features */}
                <div className="mt-8 space-y-4">

                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3"
                    >
                      <Check
                        size={18}
                        className="text-blue-600"
                      />

                      <span className="text-slate-600">
                        {feature}
                      </span>
                    </div>
                  ))}

                </div>

                {/* CTA */}
                <button
                  className={`
                  mt-10
                  w-full
                  py-4
                  rounded-full
                  font-medium

                  flex
                  items-center
                  justify-center
                  gap-2

                  transition

                  ${
                    plan.popular
                      ? "bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.35)]"
                      : `bg-[#f5f5f5] text-blue-600 ${neoShadow}`
                  }
                `}
                >
                  {plan.button}
                  <ArrowRight size={18} />
                </button>

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-slate-500">
          🛡️ 14-day free trial • Cancel anytime • No credit card required
        </div>

      </div>
    </section>
  );
}