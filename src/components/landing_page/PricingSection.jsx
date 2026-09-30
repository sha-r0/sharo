"use client";

import { useState } from "react";
import {
  Building2,
  Shield,
  Check,
  ArrowRight,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function PricingSection() {
  const [yearly, setYearly] = useState(false);

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const businessMonthlyPrice = 99;
  const businessYearlyPrice = 84;

  const plans = [
    {
      icon: Building2,
      title: "Business",
      description:
        "Everything you need to manage your people, payroll, projects and daily operations.",
      monthly: businessMonthlyPrice,
      yearly: businessYearlyPrice,
      popular: true,
      button: "Start Free Trial",
      features: [
        "Employee Management",
        "GPS Attendance",
        "Leave & Shift Management",
        "Payroll Management",
        "PF & ESI Compliance",
        "Expense Management",
        "Employee Advances",
        "Project Management",
        "Work Logs",
        "Approvals Center",
        "Quotations & Invoices",
        "Purchase Orders",
        "Vendor Payments",
        "Performance Management",
        "Notifications",
        "Employee Mobile App",
        "Manager Dashboard",
        "Owner Dashboard",
      ],
    },
    {
      icon: Shield,
      title: "Enterprise",
      description:
        "Flexible enterprise deployment built around your organization's requirements.",
      monthly: "Custom",
      yearly: "Custom",
      button: "Contact Sales",
      features: [
        "Everything in Business",
        "Custom Pricing",
        "Multi-Company Setup",
        "Multi-Branch Setup",
        "Custom Roles",
        "Custom Permissions",
        "Custom Workflows",
        "Custom Reports",
        "API Access",
        "Third-Party Integrations",
        "Biometric Integrations",
        "Data Migration",
        "White Label Options",
        "Dedicated Account Manager",
        "Priority Support",
        "Custom SLA",
      ],
    },
  ];

  const monthlyExamples = [
    {
      users: 10,
      amount: 10 * businessMonthlyPrice,
    },
    {
      users: 25,
      amount: 25 * businessMonthlyPrice,
    },
    {
      users: 50,
      amount: 50 * businessMonthlyPrice,
    },
  ];

  const yearlyExamples = [
    {
      users: 10,
      amount: 10 * businessYearlyPrice,
    },
    {
      users: 25,
      amount: 25 * businessYearlyPrice,
    },
    {
      users: 50,
      amount: 50 * businessYearlyPrice,
    },
  ];

  const examples = yearly ? yearlyExamples : monthlyExamples;

  return (
    <section
      id="pricing"
      className="relative overflow-hidden py-12 md:py-16 scroll-mt-32"
    >
      {/* Background */}
      <div className="pointer-events-none absolute bottom-10 left-0 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-20 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-[1300px] px-5 md:px-8">
        {/* Badge */}
        <div className="flex justify-center">
          <div
            className={`
              flex items-center gap-2
              rounded-full
              bg-[#f5f5f5]
              px-5 py-2
              text-sm font-semibold
              text-blue-600
              ${neoShadow}
            `}
          >
            <Sparkles size={16} />
            SIMPLE & TRANSPARENT PRICING
          </div>
        </div>

        {/* Heading */}
        <div className="mx-auto mt-6 max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#071330] md:text-5xl">
            Simple pricing that grows with you
          </h2>

          <p className="mt-4 text-base text-slate-500 md:text-lg">
            Pay only for active users. Every standard SHARO feature is included.
          </p>
        </div>

        {/* Toggle */}
        <div className="mt-7 flex justify-center">
          <div
            className={`
              flex items-center gap-1
              rounded-full
              bg-[#f5f5f5]
              p-1.5
              ${neoShadow}
            `}
          >
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`
                rounded-full
                px-6 py-2.5
                text-sm font-semibold
                transition-all duration-300
                ${!yearly
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:text-blue-600"
                }
              `}
            >
              Monthly
            </button>

            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`
                flex items-center gap-2
                rounded-full
                px-6 py-2.5
                text-sm font-semibold
                transition-all duration-300
                ${yearly
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-600 hover:text-blue-600"
                }
              `}
            >
              Yearly

              <span
                className={`
                  rounded-full px-2 py-0.5
                  text-[10px] font-bold
                  ${yearly
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                  }
                `}
              >
                SAVE 15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mt-12 grid max-w-[1450px] gap-7 lg:grid-cols-2">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCustom = plan.monthly === "Custom";

            return (
              <div
                key={plan.title}
                className={`
                  relative
                  flex h-full flex-col
                  rounded-[30px]
                  bg-[#f5f5f5]
                  p-6 md:p-7
                  ${neoShadow}
                  ${plan.popular
                    ? "border-2 border-blue-500"
                    : "border border-slate-100"
                  }
                `}
              >
                {/* Popular */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="whitespace-nowrap rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-lg">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Top Section */}
                <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-start">
                  {/* Plan Info */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`
                        flex h-14 w-14 shrink-0
                        items-center justify-center
                        rounded-2xl
                        bg-[#eef2ff]
                        ${neoShadow}
                      `}
                    >
                      <Icon
                        size={27}
                        className={
                          plan.popular
                            ? "text-blue-600"
                            : "text-indigo-600"
                        }
                      />
                    </div>

                    <div>
                      <h3 className="text-2xl font-bold text-[#071330]">
                        {plan.title}
                      </h3>

                      <p className="mt-1.5 max-w-md text-sm leading-5 text-slate-500">
                        {plan.description}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="min-w-[180px] md:text-right">
                    {isCustom ? (
                      <>
                        <h4 className="text-4xl font-bold tracking-tight text-[#071330]">
                          Custom
                        </h4>

                        <p className="mt-1 text-xs text-slate-500">
                          Tailored to your company
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-end gap-1 md:justify-end">
                          <span className="mb-1 text-xl font-semibold text-[#071330]">
                            ₹
                          </span>

                          <h4 className="text-5xl font-bold tracking-tight text-blue-600">
                            {yearly ? plan.yearly : plan.monthly}
                          </h4>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          per user / month
                        </p>

                        {yearly && (
                          <p className="mt-1 text-xs font-semibold text-emerald-600">
                            Save 15%
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-slate-200" />

                {/* Business Usage Examples */}
                {plan.title === "Business" && (
                  <div className="grid gap-3 sm:grid-cols-[150px_1fr] sm:items-center">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                        <Users size={17} className="text-blue-600" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-[#071330]">
                          Pay as you grow
                        </p>

                        <p className="text-[11px] text-slate-500">
                          No fixed company fee
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {examples.map((example) => (
                        <div
                          key={example.users}
                          className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-center"
                        >
                          <p className="text-[11px] text-slate-500">
                            {example.users} users
                          </p>

                          <p className="mt-0.5 text-sm font-bold text-[#071330]">
                            ₹{example.amount.toLocaleString("en-IN")}
                          </p>

                          <p className="text-[9px] text-slate-400">
                            / month
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Enterprise Short Highlight */}
                {plan.title === "Enterprise" && (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3 text-center">
                      <p className="text-xs font-semibold text-[#071330]">
                        Custom Setup
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Built for your workflow
                      </p>
                    </div>

                    <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3 text-center">
                      <p className="text-xs font-semibold text-[#071330]">
                        Integrations
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        APIs & third-party tools
                      </p>
                    </div>

                    <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3 text-center">
                      <p className="text-xs font-semibold text-[#071330]">
                        Priority Support
                      </p>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Dedicated assistance
                      </p>
                    </div>
                  </div>
                )}

                {/* Features */}
                <div className="mt-5 flex-1">
                  <p className="mb-3 text-sm font-semibold text-[#071330]">
                    {plan.title === "Business"
                      ? "Everything included"
                      : "Enterprise includes"}
                  </p>

                  <div className="grid gap-x-5 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex min-w-0 items-start gap-2"
                      >
                        <div className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <Check
                            size={11}
                            strokeWidth={3}
                            className="text-blue-600"
                          />
                        </div>

                        <span className="text-[13px] leading-5 text-slate-600">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <div className="mt-6">
                  {plan.title === "Business" ? (
                    <Link
                      href="/signup"
                      className="
        flex w-full
        items-center justify-center gap-2
        rounded-full
        bg-blue-600
        py-3.5
        text-sm font-semibold
        text-white
        shadow-[0_10px_25px_rgba(37,99,235,0.25)]
        transition-all duration-300
        hover:bg-blue-700
      "
                    >
                      Start Free Trial
                      <ArrowRight size={17} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`
        flex w-full
        items-center justify-center gap-2
        rounded-full
        py-3.5
        text-sm font-semibold
        text-blue-600
        transition-all duration-300
        ${neoShadow}
      `}
                    >
                      Contact Sales
                      <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mx-auto mt-9 max-w-4xl text-center">
          <p className="text-sm text-slate-500">
            🛡️ All standard SHARO features included • No hidden module
            charges • Pay only for active users
          </p>
        </div>
      </div>
    </section>
  );
}