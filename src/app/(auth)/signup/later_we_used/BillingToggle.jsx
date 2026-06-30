"use client";

export default function BillingToggle({
  billingCycle,
  setBillingCycle,
}) {
  return (
    <div className="flex items-center justify-center mb-10">

      <div className="bg-[#f5f5f5] rounded-full p-1 flex items-center shadow-[0px_0.7px_0.7px_-0.6px_rgba(0,0,0,.08),0px_30px_30px_-4px_rgba(0,0,0,.03),inset_0px_2px_1px_rgba(255,255,255,1)]">

        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
            billingCycle === "monthly"
              ? "bg-[#3D5AFE] text-white shadow-lg"
              : "text-slate-500"
          }`}
        >
          Monthly
        </button>

        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-8 py-3 rounded-full font-semibold transition-all duration-300 ${
            billingCycle === "yearly"
              ? "bg-[#3D5AFE] text-white shadow-lg"
              : "text-slate-500"
          }`}
        >
          Yearly
        </button>

      </div>

      <span className="ml-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
        Save 20%
      </span>

    </div>
  );
}