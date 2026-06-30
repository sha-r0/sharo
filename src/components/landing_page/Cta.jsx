"use client";

import { ArrowRight, Sparkles } from "lucide-react";

export default function CTASection() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-6">

        <div
          className="
          relative overflow-hidden

          rounded-[40px]

          bg-gradient-to-r
          from-blue-600
          via-blue-500
          to-indigo-600

          p-10 md:p-16
        "
        >
          {/* Background Circles */}
          <div className="absolute -left-20 bottom-0 w-72 h-72 rounded-full border border-white/10" />
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full border border-white/10" />

          {/* Dots Left */}
          <div className="absolute left-10 bottom-10 grid grid-cols-4 gap-2 opacity-30">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white"
              />
            ))}
          </div>

          {/* Dots Right */}
          <div className="absolute right-10 bottom-10 grid grid-cols-4 gap-2 opacity-30">
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-white"
              />
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">

            {/* LEFT */}
            <div>

              <div
                className="
                inline-flex
                items-center
                gap-2

                px-5
                py-2

                rounded-full

                bg-white/20
                backdrop-blur-sm

                text-white
                text-sm
                font-medium
              "
              >
                <Sparkles size={14} />
                JOIN 500+ COMPANIES
              </div>

              <h2 className="mt-6 text-4xl md:text-6xl font-bold text-white leading-tight">
                Ready to streamline
                <br />
                your operations?
              </h2>

              <p className="mt-6 text-xl text-blue-100 max-w-xl">
                Join hundreds of companies already growing
                faster with SHARO.
              </p>

            </div>

            {/* RIGHT */}
            <div className="flex flex-col items-center lg:items-end">

              <button
                className={`
                px-10
                py-5

                rounded-[24px]

                bg-white

                text-blue-600
                font-semibold
                text-lg

                flex items-center gap-3

                ${neoShadow}
              `}
              >
                Start Free Trial
                <ArrowRight size={20} />
              </button>

              {/* Users */}
              <div className="flex items-center gap-5 mt-10">

                <div className="flex -space-x-4">

                  {[
                    "https://i.pravatar.cc/100?img=1",
                    "https://i.pravatar.cc/100?img=2",
                    "https://i.pravatar.cc/100?img=3",
                    "https://i.pravatar.cc/100?img=4",
                  ].map((img) => (
                    <img
                      key={img}
                      src={img}
                      alt=""
                      className="
                      h-14
                      w-14
                      rounded-full
                      border-4
                      border-white
                    "
                    />
                  ))}

                  <div
                    className="
                    h-14
                    w-14

                    rounded-full

                    bg-white/20
                    backdrop-blur-sm

                    border-4 border-white

                    flex
                    items-center
                    justify-center

                    text-white
                    font-semibold
                  "
                  >
                    +500
                  </div>

                </div>

                <div className="text-white">
                  <p className="font-semibold">
                    Trusted by 500+
                  </p>

                  <p className="text-blue-100 text-sm">
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