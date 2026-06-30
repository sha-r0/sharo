"use client";

import {
  CreditCard,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle2,
} from "lucide-react";

export default function PaymentMethod({
  formData,
  setFormData,
}) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const methods = [
    {
      id: "card",
      title: "Credit / Debit Card",
      subtitle: "Visa, Mastercard, RuPay",
      icon: CreditCard,
    },
    {
      id: "upi",
      title: "UPI",
      subtitle: "Google Pay, PhonePe, Paytm",
      icon: Smartphone,
    },
    {
      id: "netbanking",
      title: "Net Banking",
      subtitle: "All major banks",
      icon: Building2,
    },
    {
      id: "wallet",
      title: "Wallet",
      subtitle: "Amazon Pay & Others",
      icon: Wallet,
    },
  ];

  return (
    <div
      className={`bg-[#f5f5f5] rounded-[30px] p-8 ${neoShadow}`}
    >
      <h3 className="text-2xl font-bold text-[#071330]">
        Payment Method
      </h3>

      <p className="text-slate-500 mt-2">
        Choose how you'd like to complete your payment.
      </p>

      <div className="grid md:grid-cols-2 gap-5 mt-8">
        {methods.map((method) => {
          const Icon = method.icon;

          const active =
            formData.paymentMethod === method.id;

          return (
            <button
              key={method.id}
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  paymentMethod: method.id,
                }))
              }
              className={`
                relative
                rounded-[24px]
                p-5
                text-left
                transition-all
                duration-300
                bg-[#f5f5f5]
                ${neoShadow}
                ${
                  active
                    ? "border-2 border-[#3D5AFE] scale-[1.02]"
                    : "border border-transparent hover:border-[#3D5AFE]/30 hover:-translate-y-1"
                }
              `}
            >
              {active && (
                <CheckCircle2
                  className="absolute top-4 right-4 text-[#3D5AFE]"
                  size={22}
                />
              )}

              <div
                className={`w-14 h-14 rounded-2xl bg-[#f5f5f5] flex items-center justify-center ${neoShadow}`}
              >
                <Icon
                  size={26}
                  className="text-[#3D5AFE]"
                />
              </div>

              <h4 className="mt-5 font-bold text-lg text-[#071330]">
                {method.title}
              </h4>

              <p className="text-slate-500 mt-2 text-sm leading-6">
                {method.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-100 p-5">
        <p className="text-[#3D5AFE] font-semibold">
          🔒 Secure Checkout
        </p>

        <p className="text-slate-600 mt-2 text-sm leading-6">
          Payments are securely processed through Cashfree.
          Your card details are never stored on SHARO servers.
        </p>
      </div>
    </div>
  );
}