"use client";

import {
  Check,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function PricingCard({
  title,
  description,
  price,
  period,
  features,
  popular = false,
  selected = false,
  onSelect,
  buttonText = "Select Plan",
}) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div
      onClick={onSelect}
      className={`
        relative
        rounded-[28px]
        bg-[#f5f5f5]
        p-8
        cursor-pointer
        transition-all
        duration-300
        ${neoShadow}
        ${
          selected
            ? "border-2 border-[#3D5AFE] scale-[1.03] shadow-[0_20px_50px_rgba(61,90,254,0.20)]"
            : "border border-transparent hover:-translate-y-2 hover:border-[#3D5AFE]/30"
        }
      `}
    >
      {/* Most Popular */}

      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="px-5 py-2 rounded-full bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white text-sm font-semibold flex items-center gap-2 shadow-lg">
            <Sparkles size={14} />
            Most Popular
          </div>
        </div>
      )}

      {/* Title */}

      <div className="text-center mt-4">

        <h3 className="text-3xl font-bold text-[#071330]">
          {title}
        </h3>

        <p className="mt-3 text-slate-500">
          {description}
        </p>

      </div>

      {/* Price */}

      <div className="text-center mt-8">

        <div className="flex items-end justify-center gap-2">

          <span className="text-5xl font-bold text-[#3D5AFE]">
            {price}
          </span>

          <span className="text-slate-500 mb-2">
            {period}
          </span>

        </div>

      </div>

      {/* Features */}

      <div className="mt-10 space-y-5">

        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-center gap-4"
          >
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <Check
                size={16}
                className="text-green-600"
              />
            </div>

            <span className="text-slate-700">
              {feature}
            </span>
          </div>
        ))}

      </div>

      {/* Button */}

      <button
        className={`
          w-full
          h-14
          mt-10
          rounded-2xl
          text-base
          font-semibold
          transition-all
          flex
          items-center
          justify-center
          gap-3
          ${
            selected
              ? "bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white shadow-[0_20px_40px_rgba(61,90,254,.35)]"
              : "border border-[#3D5AFE] text-[#3D5AFE] hover:bg-[#3D5AFE] hover:text-white"
          }
        `}
      >
        {buttonText}

        <ArrowRight size={18} />
      </button>
    </div>
  );
}