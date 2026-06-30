"use client";

import { Sparkles } from "lucide-react";

export default function HeroSection() {
  const neo =
    
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";



  return (
    <section className="relative">
      {/* Badge */}

      <div
        className={`
        inline-flex
        items-center
        gap-3
        mt-12
        px-6
        py-3
        rounded-full
        bg-[#f5f5f5]
        border
        border-white/80
        ${neo}
      `}
      >
        <Sparkles
          size={18}
          className="text-blue-600"
        />

        <span className="font-semibold text-blue-700">
          Workforce Operating System
        </span>

      </div>

      {/* Heading */}

      <h1 className="mt-10 max-w-[700px] text-[50px] leading-[1.05] font-extrabold tracking-[-2px] text-slate-900">

        Manage Employees, Projects & Payroll From{" "}

        <span className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 bg-clip-text text-transparent">

          One Platform

        </span>

      </h1>

      {/* Description */}

      <p className="mt-8 max-w-[620px] text-[18px] leading-9 text-slate-500">

        Streamline attendance, payroll, employee records,
        project tracking, and business operations with one
        intelligent platform built for modern organizations.

      </p>

      {/* CTA Buttons */}

      <div className="mt-10 flex items-center gap-5">

        <button
          className="
          px-8
          py-4
          rounded-2xl
          bg-gradient-to-r
          from-blue-600
          to-blue-700
          text-white
          font-semibold
          shadow-[0_18px_35px_rgba(37,99,235,.35)]
          hover:-translate-y-1
          transition-all
        "
        >
          Get Started
        </button>

        <button
          className={`
          px-8
          py-4
          rounded-2xl
          bg-[#f5f5f5]
          border
          border-white/80
          text-slate-700
          font-semibold
          ${neo}
          hover:text-blue-600
          transition-all
        `}
        >
          Learn More
        </button>

      </div>

    </section>
  );
}