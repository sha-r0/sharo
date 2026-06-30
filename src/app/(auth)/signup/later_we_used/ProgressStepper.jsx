"use client";

import { Check } from "lucide-react";

export default function ProgressStepper({ step = 1 }) {
  const steps = [
    {
      number: 1,
      title: "Company Details",
      subtitle: "Basic information",
    },
    {
      number: 2,
      title: "Plan Selection",
      subtitle: "Choose your plan",
    },
    {
      number: 3,
      title: "Payment",
      subtitle: "Complete setup",
    },
  ];

  const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div className="relative flex justify-between items-start ">

      {/* Progress Line */}
      <div className="absolute top-6 left-0 right-0 h-[2px] bg-slate-200 rounded-full">

        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] transition-all duration-500"
          style={{
            width:
              step === 1
                ? "0%"
                : step === 2
                ? "50%"
                : "100%",
          }}
        />
      </div>

      {steps.map((item) => {
        const active = item.number === step;
        const completed = item.number < step;

        return (
          <div
            key={item.number}
            className="relative z-10 flex flex-col items-center text-center w-1/3"
          >
            <div
              className={`
              w-12
              h-12
              rounded-full
              flex
              items-center
              justify-center
              font-semibold
              transition-all
              duration-300
              ${neo}

              ${
                active
                  ? "bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white scale-110"
                  : completed
                  ? "bg-[#3D5AFE] text-white"
                  : "bg-[#f5f5f5] text-slate-500"
              }
            `}
            >
              {completed ? (
                <Check size={20} />
              ) : (
                item.number
              )}
            </div>

            <h4
              className={`mt-4 text-[15px] font-semibold ${
                active
                  ? "text-[#3D5AFE]"
                  : "text-slate-700"
              }`}
            >
              {item.title}
            </h4>

            <p className="mt-1 text-[13px] text-slate-500">
              {item.subtitle}
            </p>
          </div>
        );
      })}
    </div>
  );
}