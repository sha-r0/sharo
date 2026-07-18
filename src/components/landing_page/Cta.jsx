"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const avatars = [
  "https://i.pravatar.cc/100?img=1",
  "https://i.pravatar.cc/100?img=2",
  "https://i.pravatar.cc/100?img=3",
  "https://i.pravatar.cc/100?img=4",
];

export default function CTASection() {
  return (
    <section className="overflow-hidden px-3 py-10 sm:px-4 sm:py-12 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="
            relative
            overflow-hidden
            rounded-[24px]
            bg-gradient-to-r
            from-blue-600
            via-blue-500
            to-indigo-600
            px-5
            py-8
            sm:rounded-[30px]
            sm:px-8
            sm:py-10
            md:px-10
            md:py-12
            lg:rounded-[40px]
            lg:p-16
          "
        >
          {/* Background Circles */}
          <div
            className="
              pointer-events-none
              absolute
              -bottom-16
              -left-20
              h-48
              w-48
              rounded-full
              border
              border-white/10
              sm:h-64
              sm:w-64
              lg:h-72
              lg:w-72
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              -bottom-20
              -right-24
              h-56
              w-56
              rounded-full
              border
              border-white/10
              sm:h-72
              sm:w-72
              lg:h-80
              lg:w-80
            "
          />

          {/* Decorative Dots */}
          <div className="pointer-events-none absolute bottom-6 left-6 hidden grid-cols-4 gap-2 opacity-20 sm:grid lg:bottom-10 lg:left-10">
            {Array.from({ length: 16 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-white"
              />
            ))}
          </div>

          <div className="pointer-events-none absolute bottom-6 right-6 hidden grid-cols-4 gap-2 opacity-20 sm:grid lg:bottom-10 lg:right-10">
            {Array.from({ length: 16 }).map((_, index) => (
              <div
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-white"
              />
            ))}
          </div>

          <div
            className="
              relative
              z-10
              grid
              min-w-0
              grid-cols-1
              items-center
              gap-8
              lg:grid-cols-2
              lg:gap-12
            "
          >
            {/* Left */}
            <div className="min-w-0 text-center lg:text-left">
              <div
                className="
                  inline-flex
                  max-w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-white/20
                  px-3
                  py-2
                  text-[10px]
                  font-medium
                  tracking-wide
                  text-white
                  backdrop-blur-sm
                  sm:px-4
                  sm:text-xs
                  md:px-5
                  md:text-sm
                "
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0" />

                <span className="truncate">
                  JOIN 500+ COMPANIES
                </span>
              </div>

              <h2
                className="
                  mt-5
                  break-words
                  text-[32px]
                  font-bold
                  leading-[1.08]
                  tracking-[-1.5px]
                  text-white
                  min-[380px]:text-[36px]
                  sm:mt-6
                  sm:text-4xl
                  md:text-5xl
                  lg:text-6xl
                  lg:tracking-[-2px]
                "
              >
                Ready to streamline
                <span className="block">
                  your operations?
                </span>
              </h2>

              <p
                className="
                  mx-auto
                  mt-5
                  max-w-xl
                  text-sm
                  leading-6
                  text-blue-100
                  sm:text-base
                  sm:leading-7
                  md:mt-6
                  md:text-lg
                  lg:mx-0
                  lg:text-xl
                "
              >
                Join hundreds of companies already growing faster with SHARO.
              </p>
            </div>

            {/* Right */}
            <div
              className="
                flex
                min-w-0
                flex-col
                items-center
                lg:items-end
              "
            >
              <Link
                href="/signup"
                className={`
                  flex
                  h-11
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-[16px]
                  bg-white
                  px-5
                  text-sm
                  font-semibold
                  text-blue-600
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  sm:w-auto
                  sm:px-7
                  sm:text-base
                  md:h-12
                  md:rounded-[20px]
                  md:px-8
                  lg:h-auto
                  lg:rounded-[24px]
                  lg:px-10
                  lg:py-5
                  lg:text-lg
                  ${neoShadow}
                `}
              >
                Start Free Trial
                <ArrowRight className="h-[18px] w-[18px] shrink-0 lg:h-5 lg:w-5" />
              </Link>

              {/* Users */}
              <div
                className="
                  mt-7
                  flex
                  w-full
                  min-w-0
                  flex-col
                  items-center
                  gap-4
                  sm:mt-8
                  sm:w-auto
                  sm:flex-row
                  sm:gap-5
                  lg:mt-10
                "
              >
                <div className="flex shrink-0 -space-x-2.5 sm:-space-x-3 lg:-space-x-4">
                  {avatars.map((image, index) => (
                    <img
                      key={image}
                      src={image}
                      alt={`SHARO customer ${index + 1}`}
                      className="
                        h-9
                        w-9
                        rounded-full
                        border-2
                        border-white
                        object-cover
                        min-[380px]:h-10
                        min-[380px]:w-10
                        sm:h-11
                        sm:w-11
                        lg:h-14
                        lg:w-14
                        lg:border-4
                      "
                    />
                  ))}

                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      border-2
                      border-white
                      bg-white/20
                      text-[10px]
                      font-semibold
                      text-white
                      backdrop-blur-sm
                      min-[380px]:h-10
                      min-[380px]:w-10
                      min-[380px]:text-xs
                      sm:h-11
                      sm:w-11
                      lg:h-14
                      lg:w-14
                      lg:border-4
                      lg:text-sm
                    "
                  >
                    +500
                  </div>
                </div>

                <div className="min-w-0 text-center text-white sm:text-left">
                  <p className="text-sm font-semibold sm:text-base">
                    Trusted by 500+
                  </p>

                  <p className="text-xs text-blue-100 sm:text-sm">
                    companies worldwide
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}