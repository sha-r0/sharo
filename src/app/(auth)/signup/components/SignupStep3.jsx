"use client";

import { useState, useEffect } from "react";
import { createCompany } from "../services/companyService";

export default function SignupStep3({ data, back }) {
  const [plan, setPlan] = useState({ basic: 0, pro: 0, enterprise: 0 });
  const [billingType, setBillingType] = useState("monthly");
  const [duration, setDuration] = useState(1);
  const [amount, setAmount] = useState(0);
  const [utr, setUtr] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setsuccess] = useState(false);

  const prices = { basic: 49, pro: 59, enterprise: 99 };

  // AUTO CALCULATION
  useEffect(() => {
    let monthlyAmount =
      plan.basic * prices.basic +
      plan.pro * prices.pro +
      plan.enterprise * prices.enterprise;

    let finalAmount =
      billingType === "yearly"
        ? monthlyAmount * 12 * duration
        : monthlyAmount * duration;

    setAmount(finalAmount);
  }, [plan, billingType, duration]);

  // 🔥 UPI QR LINK (replace pa later)
  const upiLink = `upi://pay?pa=9811880794@idfcfirst&pn=Sharo&am=${amount}&cu=INR`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    upiLink
  )}`;

  const handleNext = () => {
    if (amount <= 0) {
      alert("Please select at least 1 user");
      return;
    }
    setShowPayment(true);
  };

  const handleSubmit = async () => {
    if (!utr) {
      alert("Enter UTR / Transaction ID");
      return;
    }

    try {
      setLoading(true);

      const finalData = {
        ...data,
        planDistribution: plan,
        billingMonths: billingType === "yearly" ? duration * 12 : duration,
        billingLabel:
          billingType === "yearly"
            ? `${duration} Year`
            : `${duration} Month`,
        amount,
        paymentUTR: utr,
      };

      const res = await createCompany(finalData);

      if (res.success) {
        setsuccess(true);
      } else {
        alert("❌ Error");
      }

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">

        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">

          <h2 className="text-2xl font-semibold text-green-600">
            🎉 Payment Submitted Successfully
          </h2>

          <p className="text-gray-600 mt-2">
            Your company account has been created.  
            Our team will verify your payment shortly.
          </p>

          <div className="mt-4 text-sm text-gray-700 space-y-1">
            <p><strong>Company:</strong> {data.companyName}</p>
            <p><strong>Amount:</strong> ₹{amount}</p>
            <p><strong>Transaction ID:</strong> {utr}</p>
          </div>

        </div>

        <button
          onClick={() => window.location.href = "/"}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          Go to Login
        </button>

      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Plan & Billing
        </h2>
        <p className="text-sm text-gray-500">
          Choose how many users you want and your billing cycle
        </p>
      </div>

      {!showPayment ? (
        <>
          {/* PLAN */}
          <div className="space-y-3">
            <label className="text-sm text-gray-600">Plan Distribution</label>

            <input
              type="number"
              placeholder="Basic Users (₹49/month)"
              className="w-full p-3 border rounded-lg"
              onChange={(e) =>
                setPlan({ ...plan, basic: Number(e.target.value) })
              }
            />

            <input
              type="number"
              placeholder="Pro Users (₹59/month)"
              className="w-full p-3 border rounded-lg"
              onChange={(e) =>
                setPlan({ ...plan, pro: Number(e.target.value) })
              }
            />

            <input
              type="number"
              placeholder="Enterprise Users (₹99/month)"
              className="w-full p-3 border rounded-lg"
              onChange={(e) =>
                setPlan({ ...plan, enterprise: Number(e.target.value) })
              }
            />
          </div>

          {/* BILLING */}
          <div className="space-y-2">
            <label className="text-sm text-gray-600">Billing Cycle</label>

            <div className="flex gap-3">
              <select
                className="w-full p-3 border rounded-lg"
                value={billingType}
                onChange={(e) => setBillingType(e.target.value)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              <input
                type="number"
                placeholder="Duration"
                className="w-full p-3 border rounded-lg"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>

          {/* AMOUNT */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Payable</p>
            <p className="text-2xl font-bold text-blue-600">₹{amount}</p>
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white py-3 rounded-lg"
          >
            Continue to Payment
          </button>

          <button onClick={back} className="w-full border py-3 rounded-lg">
            Back
          </button>
        </>
      ) : (
        <>
          {/* PAYMENT */}
          <div className="text-center space-y-3">
            <p className="text-gray-600">
              Scan & Pay using UPI apps (GPay / PhonePe)
            </p>

            <img src={qrUrl} alt="QR" className="mx-auto rounded-lg" />

            <p className="text-lg font-semibold text-blue-600">
              ₹{amount}
            </p>

            {/* UPI LINK BUTTON */}
            <a
              href={upiLink}
              className="block bg-green-600 text-white py-2 rounded-lg"
            >
              Pay via UPI App
            </a>
          </div>

          {/* UTR */}
          <input
            type="text"
            placeholder="Enter UTR / Transaction ID"
            className="w-full p-3 border rounded-lg"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-green-600 text-white py-3 rounded-lg"
          >
            {loading ? "Submitting..." : "Confirm Payment"}
          </button>

          <button
            onClick={() => setShowPayment(false)}
            className="w-full border py-3 rounded-lg"
          >
            Back
          </button>
        </>
      )}
    </div>
  );
}