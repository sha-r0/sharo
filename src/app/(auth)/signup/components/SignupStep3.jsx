"use client";

import { useState, useEffect } from "react";
import { createOrder, openCheckout } from "../services/paymentService";
import { savePendingRegistration } from "../services/pendingRegistrationService";
import { or } from "firebase/firestore";
import { validateSignup } from "@/app/api/signup/services/validationService";

export default function SignupStep3({ data, back }) {

  const plans = {
    starter: {
      name: "Starter",
      price: 49,
      description: "Perfect for small teams",
    },

    professional: {
      name: "Professional",
      price: 59,
      description: "Most Popular",
    },

    enterprise: {
      name: "Enterprise",
      price: 99,
      description: "Advanced Features",
    },
  };

  const employeeRanges = [
    { label: "1-10 Employees", value: 10 },
    { label: "11-25 Employees", value: 25 },
    { label: "26-50 Employees", value: 50 },
    { label: "51-100 Employees", value: 100 },
    { label: "101-250 Employees", value: 250 },
    { label: "251-500 Employees", value: 500 },
    { label: "500+ Employees", value: 500 },
  ];

  const [billingType, setBillingType] = useState("monthly");

  const [selectedPlan, setSelectedPlan] =
    useState("professional");

  const [employees, setEmployees] =
    useState(employeeRanges[0]);

  const [amount, setAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {

    const monthlyAmount =
      plans[selectedPlan].price *
      employees.value;

    if (billingType === "yearly") {

      const yearly = monthlyAmount * 12;

      const discount = yearly * 0.15;

      setAmount(yearly - discount);

    } else {

      setAmount(monthlyAmount);

    }

  }, [
    selectedPlan,
    employees,
    billingType,
  ]);

  const handleContinue = async () => {
    try {
      setLoading(true);

      const finalData = {
        ...data,

        subscription: {
          billingType,

          plan: selectedPlan,

          employeeRange: employees.label,

          employeeCount: employees.value,

          pricePerUser: plans[selectedPlan].price,

          yearlyDiscount:
            billingType === "yearly" ? 15 : 0,

          amount,
        },
      };

      // Validate first
      const validation = await validateSignup(finalData);

      if (!validation.success) {
        alert(validation.message);
        setLoading(false);
        return;
      }

      // Create Cashfree Order
      const order = await createOrder(finalData);

      console.log("Saving registration...", finalData);

      const saved = await savePendingRegistration(
        order.orderId,
        finalData
      );

      console.log("Saved:", saved);

      if (!saved) {
        alert("Unable to start registration.");
        return;
      }

      // Open Cashfree Checkout
      await openCheckout(order.paymentSessionId);

    } catch (error) {
      console.error(error);
      alert(error.message || "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  };

  return (

    <div className="flex justify-between items-center">

      <div className="space-y-8">

        <div>

          <h2 className="text-xl font-semibold">
            Subscription Plan
          </h2>

          <p className="text-gray-500 text-sm mt-1">
            Choose your billing preference.
          </p>

        </div>

        <div>

          <label className="text-sm font-medium">
            Billing Cycle
          </label>

          <div className="flex mt-3 rounded-lg overflow-hidden border">

            <button

              className={`flex-1 py-3 ${billingType === "monthly"
                ? "bg-blue-600 text-white"
                : "bg-white"
                }`}

              onClick={() => setBillingType("monthly")}

            >

              Monthly

            </button>

            <button

              className={`flex-1 py-3 ${billingType === "yearly"
                ? "bg-blue-600 text-white"
                : "bg-white"
                }`}

              onClick={() => setBillingType("yearly")}

            >

              Yearly

            </button>

          </div>

          {billingType === "yearly" && (

            <p className="text-green-600 text-sm mt-2">

              🎉 Save 15% with yearly billing

            </p>

          )}

        </div>

        <div>

          <label className="text-sm font-medium">

            Employees

          </label>

          <select

            className="w-full border rounded-lg p-3 mt-2"

            value={employees.label}

            onChange={(e) => {

              const selected =
                employeeRanges.find(
                  item => item.label === e.target.value
                );

              setEmployees(selected);

            }}

          >

            {employeeRanges.map((item) => (

              <option
                key={item.label}
                value={item.label}
              >

                {item.label}

              </option>

            ))}

          </select>

        </div>

        <div>

          <label className="text-sm font-medium">

            Choose Plan

          </label>

          <div className="grid grid-cols-3 gap-4 mt-3">

            {Object.entries(plans).map(([key, plan]) => (

              <div

                key={key}

                onClick={() => setSelectedPlan(key)}

                className={`

border

rounded-xl

cursor-pointer

p-5

transition

${selectedPlan === key

                    ?

                    "border-blue-600 bg-blue-50"

                    :

                    "border-gray-200"

                  }

`}

              >

                <h3 className="font-semibold">

                  {plan.name}

                </h3>

                <p className="text-sm text-gray-500 mt-1">

                  {plan.description}

                </p>

                <p className="mt-4 text-2xl font-bold">

                  ₹{plan.price}

                </p>

                <p className="text-xs text-gray-500">

                  per user / month

                </p>

              </div>

            ))}

          </div>

        </div>

      </div>

      <div className="w-lg max-w-md space-y-6">
        {/* PRICE SUMMARY */}

        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">

          <div className="flex justify-between py-2">
            <span className="text-gray-600">Plan</span>
            <span className="font-semibold">
              {plans[selectedPlan].name}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-600">Employees</span>
            <span className="font-semibold">
              {employees.label}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-600">Billing</span>
            <span className="font-semibold capitalize">
              {billingType}
            </span>
          </div>

          <div className="flex justify-between py-2">
            <span className="text-gray-600">
              Price / User
            </span>
            <span className="font-semibold">
              ₹{plans[selectedPlan].price}
            </span>
          </div>

          {billingType === "yearly" && (
            <div className="flex justify-between py-2 text-green-600">
              <span>Yearly Discount</span>
              <span>15%</span>
            </div>
          )}

          <hr className="my-4" />

          <div className="flex justify-between items-center">

            <div>

              <p className="text-gray-600 text-sm">
                Total Payable
              </p>

              <h2 className="text-3xl font-bold text-blue-600">
                ₹{amount.toLocaleString()}
              </h2>

            </div>

            <div className="text-right text-sm text-gray-500">

              {billingType === "monthly"
                ? "per month"
                : "per year"}

            </div>

          </div>

        </div>

        {/* BUTTONS */}

        <div className="flex gap-3">

          <button
            onClick={back}
            className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-100"
          >
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating Order..." : "Continue to Payment"}
          </button>

        </div>
      </div>

    </div>
  );
}