"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Shield,
  Check,
  ArrowRight,
  Users,
} from "lucide-react";

import { createOrder, openCheckout } from "../services/paymentService";
import { validateSignup } from "@/app/api/signup/services/validationService";

export default function SignupStep3({ data, back }) {
  const BUSINESS_PRICE = 99;
  const YEARLY_DISCOUNT = 15;

  const [billingType, setBillingType] = useState(data.subscription?.billingType || "monthly");
  const [selectedPlan, setSelectedPlan] = useState("business");
  const [employeeCount, setEmployeeCount] = useState(data.subscription?.employeeCount || 10);
  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  /*
   * Monthly:
   * users × ₹99
   *
   * Yearly:
   * users × ₹99 × 12
   * then 15% discount
   */
  useEffect(() => {
    if (selectedPlan !== "business") {
      setAmount(0);
      return;
    }

    const users = Number(employeeCount) || 0;
    const monthlyAmount = BUSINESS_PRICE * users;

    if (billingType === "yearly") {
      const yearlyAmount = monthlyAmount * 12;
      const discountedAmount =
        yearlyAmount * (1 - YEARLY_DISCOUNT / 100);

      setAmount(Number(discountedAmount.toFixed(2)));
    } else {
      setAmount(monthlyAmount);
    }
  }, [employeeCount, billingType, selectedPlan]);

  const effectiveYearlyPrice = Number(
    (
      BUSINESS_PRICE *
      (1 - YEARLY_DISCOUNT / 100)
    ).toFixed(2)
  );

  const handleEmployeeCountChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value === "") {
      setEmployeeCount("");
      return;
    }

    const count = Number(value);

    if (count > 10000) {
      setEmployeeCount(10000);
      return;
    }

    setEmployeeCount(count);
  };

  const handleContinue = async () => {
    if (selectedPlan !== "business") {
      return;
    }

    const users = Number(employeeCount);

    if (!users || users < 1) {
      alert("Please enter at least 1 user.");
      return;
    }

    try {
      setLoading(true);

      const finalData = {
        ...data,

        subscription: {
          plan: "business",
          planName: "Business",

          billingType,

          employeeCount: users,

          // Kept for compatibility if existing backend expects this field
          employeeRange: `${users} Employees`,

          pricePerUser: BUSINESS_PRICE,

          yearlyDiscount:
            billingType === "yearly"
              ? YEARLY_DISCOUNT
              : 0,

          amount,
        },
      };

      // Validate signup
      const validation = await validateSignup(finalData);

      if (!validation.success || validation.state === "completed") {
        alert(validation.message);
        setLoading(false);
        return;
      }

      // Create Cashfree order
      const order = await createOrder(finalData);

      if (order.state === "completed") {
        alert(order.message);
        return;
      }
      if (order.state === "paid") {
        window.location.assign(`/signup/success?order_id=${encodeURIComponent(order.orderId)}`);
        return;
      }

      // Open Cashfree checkout
      await openCheckout(order.paymentSessionId);
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Unable to start payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-7">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-semibold text-slate-800">
          {data.subscription ? "Resume Your Signup" : "Choose Your Plan"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {data.subscription
            ? "Your saved company, administrator and plan details have been restored. Continue to resume payment."
            : "Simple pricing based on the number of users in your company."}
        </p>
      </div>

      {/* Plan Selection */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* BUSINESS */}
        <button
          type="button"
          onClick={() => setSelectedPlan("business")}
          disabled={Boolean(data.subscription)}
          className={`
            relative
            rounded-2xl
            border-2
            p-5
            text-left
            transition-all
            ${
              selectedPlan === "business"
                ? "border-blue-600 bg-blue-50"
                : "border-slate-200 bg-white hover:border-blue-300"
            }
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
              <Building2
                size={22}
                className="text-blue-600"
              />
            </div>

            {selectedPlan === "business" && (
              <div className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white">
                SELECTED
              </div>
            )}
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Business
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            All standard SHARO features included
          </p>

          <div className="mt-5 flex items-end gap-1">
            <span className="mb-1 text-lg font-semibold text-slate-800">
              ₹
            </span>

            <span className="text-4xl font-bold text-blue-600">
              {billingType === "yearly"
                ? effectiveYearlyPrice
                : BUSINESS_PRICE}
            </span>

            <span className="mb-1 text-xs text-slate-500">
              / user / month
            </span>
          </div>

          {billingType === "yearly" && (
            <p className="mt-2 text-xs font-medium text-green-600">
              Effective price with 15% annual discount
            </p>
          )}

          <div className="mt-5 space-y-2">
            {[
              "All SHARO features",
              "Pay only for active users",
              "Employee mobile app",
              "Owner & manager dashboard",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2"
              >
                <Check
                  size={15}
                  className="text-blue-600"
                />

                <span className="text-xs text-slate-600">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </button>

        {/* ENTERPRISE */}
        <button
          type="button"
          onClick={() => setSelectedPlan("enterprise")}
          disabled={Boolean(data.subscription)}
          className={`
            relative
            rounded-2xl
            border-2
            p-5
            text-left
            transition-all
            ${
              selectedPlan === "enterprise"
                ? "border-indigo-600 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-indigo-300"
            }
          `}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100">
              <Shield
                size={22}
                className="text-indigo-600"
              />
            </div>

            {selectedPlan === "enterprise" && (
              <div className="rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-bold text-white">
                SELECTED
              </div>
            )}
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900">
            Enterprise
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Tailored for larger organizations
          </p>

          <div className="mt-5">
            <span className="text-4xl font-bold text-slate-900">
              Custom
            </span>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Pricing based on your requirements
          </p>

          <div className="mt-5 space-y-2">
            {[
              "Everything in Business",
              "Custom integrations",
              "Multi-company setup",
              "Priority support & SLA",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-2"
              >
                <Check
                  size={15}
                  className="text-indigo-600"
                />

                <span className="text-xs text-slate-600">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </button>
      </div>

      {/* BUSINESS SETTINGS */}
      {selectedPlan === "business" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT */}
          <div className="space-y-6">
            {/* Billing Cycle */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Billing Cycle
              </label>

              <div className="mt-3 flex overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setBillingType("monthly")}
          disabled={Boolean(data.subscription)}
                  className={`
                    flex-1
                    rounded-lg
                    py-3
                    text-sm
                    font-semibold
                    transition
                    ${
                      billingType === "monthly"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >
                  Monthly
                </button>

                <button
                  type="button"
                  onClick={() => setBillingType("yearly")}
          disabled={Boolean(data.subscription)}
                  className={`
                    flex-1
                    rounded-lg
                    py-3
                    text-sm
                    font-semibold
                    transition
                    ${
                      billingType === "yearly"
                        ? "bg-blue-600 text-white"
                        : "text-slate-600 hover:bg-slate-50"
                    }
                  `}
                >
                  Yearly
                </button>
              </div>

              {billingType === "yearly" && (
                <p className="mt-2 text-sm font-medium text-green-600">
                  🎉 Save 15% with yearly billing
                </p>
              )}
            </div>

            {/* Number of Users */}
            <div>
              <label className="text-sm font-medium text-slate-700">
                Number of Users
              </label>

              <div className="relative mt-2">
                <Users
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  inputMode="numeric"
                  value={employeeCount}
                  onChange={handleEmployeeCountChange}
          disabled={Boolean(data.subscription)}
                  placeholder="Enter number of users"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-300
                    bg-white
                    py-3
                    pl-11
                    pr-4
                    outline-none
                    transition
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-100
                  "
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                You pay only for the number of users you add.
              </p>
            </div>

            {/* Example */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-medium text-slate-800">
                Example
              </p>

              <p className="mt-1 text-sm text-slate-600">
                10 users × ₹99 ={" "}
                <span className="font-semibold text-blue-600">
                  ₹990/month
                </span>
              </p>
            </div>
          </div>

          {/* PRICE SUMMARY */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="font-semibold text-slate-900">
              Price Summary
            </h3>

            <div className="mt-4 space-y-1">
              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">
                  Plan
                </span>

                <span className="text-sm font-semibold">
                  Business
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">
                  Users
                </span>

                <span className="text-sm font-semibold">
                  {employeeCount || 0}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">
                  Billing
                </span>

                <span className="text-sm font-semibold capitalize">
                  {billingType}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-sm text-slate-600">
                  Price / User
                </span>

                <span className="text-sm font-semibold">
                  ₹{BUSINESS_PRICE}/month
                </span>
              </div>

              {billingType === "yearly" && (
                <>
                  <div className="flex justify-between py-2">
                    <span className="text-sm text-slate-600">
                      Annual Base Price
                    </span>

                    <span className="text-sm font-semibold">
                      ₹
                      {(
                        (Number(employeeCount) || 0) *
                        BUSINESS_PRICE *
                        12
                      ).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="flex justify-between py-2 text-green-600">
                    <span className="text-sm">
                      Yearly Discount
                    </span>

                    <span className="text-sm font-semibold">
                      15%
                    </span>
                  </div>
                </>
              )}

              <hr className="my-4 border-blue-200" />

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-slate-600">
                    Total Payable
                  </p>

                  <h2 className="mt-1 text-3xl font-bold text-blue-600">
                    ₹
                    {amount.toLocaleString("en-IN", {
                      minimumFractionDigits:
                        amount % 1 === 0 ? 0 : 2,
                      maximumFractionDigits: 2,
                    })}
                  </h2>
                </div>

                <p className="text-right text-xs text-slate-500">
                  {billingType === "monthly"
                    ? "per month"
                    : "per year"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENTERPRISE CONTACT */}
      {selectedPlan === "enterprise" && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Let's build your Enterprise plan
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Enterprise pricing depends on your company size,
            integrations, custom workflows, branches and support
            requirements.
          </p>

          <Link
            href="/contact"
            className="
              mt-5
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              px-6
              py-3
              text-sm
              font-semibold
              text-white
              transition
              hover:bg-indigo-700
            "
          >
            Contact Sales
            <ArrowRight size={17} />
          </Link>
        </div>
      )}

      {/* BUTTONS */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={back}
          className="
            w-full
            rounded-xl
            border
            border-slate-300
            py-3
            font-medium
            text-slate-700
            transition
            hover:bg-slate-100
          "
        >
          Back
        </button>

        {selectedPlan === "business" ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={
              loading ||
              !employeeCount ||
              Number(employeeCount) < 1
            }
            className="
              w-full
              rounded-xl
              bg-blue-600
              py-3
              font-semibold
              text-white
              transition
              hover:bg-blue-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {loading
              ? "Creating Order..."
              : "Continue to Payment"}
          </button>
        ) : (
          <Link
            href="/contact"
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-indigo-600
              py-3
              font-semibold
              text-white
              transition
              hover:bg-indigo-700
            "
          >
            Contact Sales
            <ArrowRight size={17} />
          </Link>
        )}
      </div>
    </div>
  );
}