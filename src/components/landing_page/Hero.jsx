"use client";

import Link from "next/link";
import { ArrowRight, PlayCircle, Star } from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const features = [
  "Employee Management",
  "Attendance Tracking",
  "Expense Management",
];

const avatars = [11, 12, 13, 14];

export default function HeroLeft() {
  return (
    <div className="w-full min-w-0">
      {/* Badge */}
      <div
        className={`
          mt-2
          inline-flex
          max-w-full
          items-center
          gap-2
          rounded-full
          bg-[#f5f5f5]
          px-3 py-2
          text-[11px]
          font-medium
          leading-4
          text-[#4f6df5]
          sm:mt-4
          sm:gap-2.5
          sm:px-4
          sm:py-2.5
          sm:text-xs
          md:text-sm
          ${neoShadow}
        `}
      >
        <Star className="h-3.5 w-3.5 shrink-0 fill-current sm:h-4 sm:w-4" />

        <span className="break-words">
          The Operating System for Growing Companies
        </span>
      </div>

      {/* Heading */}
      <h1
        className="
          mt-6
          max-w-4xl
          text-[38px]
          font-bold
          leading-[1.02]
          tracking-[-2px]
          text-[#071330]
          min-[380px]:text-[42px]
          sm:mt-8
          sm:text-[50px]
          sm:tracking-[-3px]
          md:text-[58px]
          lg:mt-10
          lg:text-[52px]
          xl:text-[62px]
          xl:tracking-[-4px]
        "
      >
        Manage your
        <br />

        <span className="bg-gradient-to-r from-[#5f72ff] to-[#3d5afe] bg-clip-text text-transparent">
          workforce.
        </span>

        <br />
        Drive your growth.
      </h1>

      {/* Description */}
      <p
        className="
          mt-5
          max-w-[720px]
          text-sm
          leading-6
          text-[#64748b]
          sm:mt-6
          sm:text-base
          sm:leading-7
          md:text-lg
          md:leading-8
          lg:mt-8
        "
      >
        SHARO helps you manage employees, attendance, projects, expenses,
        payroll and more — all in one powerful platform.
      </p>

      {/* CTA */}
      <div
        className="
          mt-7
          flex
          w-full
          flex-col
          gap-3
          min-[430px]:flex-row
          min-[430px]:items-center
          sm:mt-8
          sm:gap-4
          lg:mt-10
          lg:gap-6
        "
      >
        <Link
          href="/signup"
          className="
            flex
            h-10
            w-full
            items-center
            justify-center
            gap-2
            rounded-[15px]
            bg-[#4f6df5]
            px-4
            text-sm
            font-medium
            text-white
            shadow-[0_14px_28px_rgba(79,109,245,0.3)]
            transition-all
            duration-200
            hover:-translate-y-0.5
            hover:bg-[#425fe8]
            min-[430px]:w-auto
            sm:h-11
            sm:rounded-[17px]
            sm:px-5
            sm:text-base
            lg:h-12
            lg:rounded-[20px]
            lg:px-6
            lg:text-lg
          "
        >
          Start Free Trial
          <ArrowRight className="h-4 w-4 sm:h-[18px] sm:w-[18px] lg:h-5 lg:w-5" />
        </Link>

        <button
          type="button"
          className={`
            flex
            h-10
            w-full
            items-center
            justify-center
            gap-2
            rounded-[15px]
            bg-[#f5f5f5]
            px-4
            text-sm
            font-medium
            text-[#071330]
            transition-all
            duration-200
            hover:-translate-y-0.5
            min-[430px]:w-auto
            sm:h-11
            sm:rounded-[17px]
            sm:px-5
            sm:text-base
            lg:h-12
            lg:rounded-[20px]
            lg:px-6
            lg:text-lg
            ${neoShadow}
          `}
        >
          <PlayCircle className="h-[18px] w-[18px] text-[#4f6df5] sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
          Watch Demo
        </button>
      </div>

      {/* Pills */}
      <div
        className="
          mt-8
          flex
          flex-wrap
          gap-2.5
          sm:mt-10
          sm:gap-3
          lg:mt-12
          lg:gap-5
        "
      >
        {features.map((item) => (
          <div
            key={item}
            className={`
              rounded-[14px]
              bg-[#f5f5f5]
              px-3
              py-2
              text-[11px]
              font-medium
              leading-4
              text-[#334155]
              sm:rounded-[16px]
              sm:px-3.5
              sm:py-2.5
              sm:text-xs
              md:text-sm
              lg:rounded-[18px]
              lg:px-4
              lg:py-3
              ${neoShadow}
            `}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Trust */}
      <div
        className="
          mt-10
          flex
          items-center
          gap-3
          sm:mt-12
          sm:gap-4
          lg:mt-16
          lg:gap-5
        "
      >
        <div className="flex shrink-0 -space-x-2 sm:-space-x-2.5 lg:-space-x-3">
          {avatars.map((id) => (
            <img
              key={id}
              src={`https://i.pravatar.cc/100?img=${id}`}
              className="
                h-8
                w-8
                rounded-full
                border-2
                border-white
                object-cover
                sm:h-10
                sm:w-10
                lg:h-12
                lg:w-12
              "
              alt="SHARO customer"
            />
          ))}
        </div>

        <div className="min-w-0">
          <div className="text-xs font-semibold leading-5 text-[#071330] sm:text-sm lg:text-base">
            500+ companies trust SHARO
          </div>

          <div className="text-[11px] leading-4 text-[#64748b] sm:text-xs lg:text-base">
            to streamline their operations
          </div>
        </div>
      </div>
    </div>
  );
}