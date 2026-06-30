"use client";

import { useState } from "react";
import {
  Gift,
  Tag,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function CouponCard() {
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState(false);

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  function applyCoupon() {
    if (!coupon.trim()) return;
    setApplied(true);
  }

  return (
    <div
      className={`bg-[#f5f5f5] rounded-[30px] p-8 ${neoShadow}`}
    >
      {/* Heading */}

      <div className="flex items-center gap-4">

        <div
          className={`w-14 h-14 rounded-2xl bg-[#f5f5f5] flex items-center justify-center ${neoShadow}`}
        >
          <Gift className="text-[#3D5AFE]" />
        </div>

        <div>

          <h3 className="text-2xl font-bold text-[#071330]">
            Coupon & Offers
          </h3>

          <p className="text-slate-500">
            Have a coupon? Apply it below.
          </p>

        </div>

      </div>

      {/* Coupon */}

      <div className="flex gap-4 mt-8">

        <div
          className={`flex-1 h-14 rounded-2xl bg-[#f5f5f5] px-5 flex items-center ${neoShadow}`}
        >
          <Tag
            className="text-[#3D5AFE]"
            size={18}
          />

          <input
            value={coupon}
            onChange={(e) =>
              setCoupon(e.target.value)
            }
            placeholder="Enter coupon code"
            className="flex-1 ml-4 bg-transparent outline-none placeholder:text-slate-400"
          />

        </div>

        <button
          onClick={applyCoupon}
          className="px-8 rounded-2xl bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white font-semibold hover:scale-[1.02] transition"
        >
          Apply
        </button>

      </div>

      {/* Success */}

      {applied && (

        <div className="mt-6 rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">

          <CheckCircle2 className="text-green-600" />

          <div>

            <p className="font-semibold text-green-700">
              Coupon Applied Successfully
            </p>

            <p className="text-sm text-green-600">
              Your discount will be applied during checkout.
            </p>

          </div>

        </div>

      )}

      {/* Benefits */}

      <div className="grid md:grid-cols-3 gap-5 mt-8">

        <div
          className={`rounded-2xl p-5 bg-[#f5f5f5] ${neoShadow}`}
        >
          <Sparkles
            className="text-[#3D5AFE]"
            size={22}
          />

          <h4 className="mt-4 font-semibold">
            3-Month Trial
          </h4>

          <p className="text-sm text-slate-500 mt-2">
            No payment today.
          </p>

        </div>

        <div
          className={`rounded-2xl p-5 bg-[#f5f5f5] ${neoShadow}`}
        >
          <ShieldCheck
            className="text-green-500"
            size={22}
          />

          <h4 className="mt-4 font-semibold">
            Secure Checkout
          </h4>

          <p className="text-sm text-slate-500 mt-2">
            SSL encrypted payments.
          </p>

        </div>

        <div
          className={`rounded-2xl p-5 bg-[#f5f5f5] ${neoShadow}`}
        >
          <Gift
            className="text-orange-500"
            size={22}
          />

          <h4 className="mt-4 font-semibold">
            Cancel Anytime
          </h4>

          <p className="text-sm text-slate-500 mt-2">
            No long-term contracts.
          </p>

        </div>

      </div>

    </div>
  );
}