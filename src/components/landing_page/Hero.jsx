"use client";

import { ArrowRight, PlayCircle, Star } from "lucide-react";

export default function HeroLeft() {
  return (
    <div className="w-full">

      {/* Badge */}
      <div
        className="
          inline-flex items-center gap-3 mt-10
          px-6 py-3
          rounded-full text-[14px]
          bg-[#f5f5f5]
          text-[#4f6df5]
          font-medium
          shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
        "
      >
        <Star className="w-4 h-4 fill-current" />
        <span>The Operating System for Growing Companies</span>
      </div>

      {/* Heading */}

      <h1 className="mt-10 text-[52px] leading-[0.95] font-bold tracking-[-4px] text-[#071330]">
        Manage your
        <br />

        <span className="bg-gradient-to-r from-[#5f72ff] to-[#3d5afe] bg-clip-text text-transparent">
          workforce.
        </span>

        <br />

        Drive your growth.
      </h1>


      {/* Description */}

      <p className="mt-8 text-[18px] leading-[1.6] text-[#64748b] max-w-[720px]">
        SHARO helps you manage employees,
        attendance, projects, expenses,
        payroll and more — all in one
        powerful platform.
      </p>


      {/* CTA */}

      <div className="flex items-center gap-6 mt-10">


        <button
          className="
              h-12 px-6
              rounded-[20px]
              bg-[#4f6df5]
              text-white text-lg font-medium
              flex items-center gap-3
              shadow-[0_20px_40px_rgba(79,109,245,0.35)]
            "
        >
          Start Free Trial
          <ArrowRight size={20} />
        </button>



        <button
          className="
              h-12 px-6
              rounded-[20px]
              bg-[#f5f5f5]
              flex items-center gap-3
              text-[#071330]
              text-lg font-medium
              shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
            "
        >
          <PlayCircle className="text-[#4f6df5]" />
          Watch Demo
        </button>


      </div>


      {/* Pills */}
      <div className="mt-12 flex flex-wrap gap-5">
        {[
          "Employee Management",
          "Attendance Tracking",
          "Expense Management",
        ].map((item, index) => (

          <div
          key={item}
            className="
              px-4 py-3 text-[14px]
              rounded-[18px]
              bg-[#f5f5f5]
              text-[#334155]
              font-medium
              shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
            "
          >
            {item}
          </div>
        ))}
      </div>

      {/* Trust */}

      <div className="mt-16 flex items-center gap-5">

        <div className="flex -space-x-3">
          {[11, 12, 13, 14].map((id) => (

            <img
            key={id}
              src={`https://i.pravatar.cc/100?img=${id}`}
              className="w-12 h-12 rounded-full border-2 border-white"
              alt=""
            />

          ))}
        </div>

        <div>
          <div className="font-semibold text-[#071330]">
            500+ companies trust SHARO
          </div>

          <div className="text-[#64748b]">
            to streamline their operations
          </div>
        </div>

      </div>


    </div>
  );
}