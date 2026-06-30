"use client";

import {
  LifeBuoy,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function LoginFooter() {
  const neo =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";




  return (
    <div className="mt-10">

      {/* Help Card */}

      <div
        className={`
          rounded-2xl
          bg-[#f5f5f5]
          border
          border-white/70
          p-5
          ${neo}
        `}
      >
        <div className="flex items-start justify-between">

          <div className="flex gap-4">

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <LifeBuoy size={22} className="text-white" />
            </div>

            <div>

              <h4 className="font-semibold text-slate-800">
                Need Help?
              </h4>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Contact your system administrator if
                you're unable to access your account.
              </p>

            </div>

          </div>

          <button
            className="
              group
              flex
              items-center
              gap-2
              text-blue-600
              font-semibold
              hover:text-blue-700
              transition
            "
          >
            Contact

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

        </div>
      </div>

      {/* Bottom */}

      <div className="mt-6 flex items-center justify-between text-sm">

        <div className="flex items-center gap-2 text-slate-500">
          <ShieldCheck
            size={16}
            className="text-green-600"
          />

          <span>Secure SSL Protected</span>
        </div>

        <span className="text-slate-400">
          Version 1.0.0
        </span>

      </div>

      {/* Copyright */}

      <p className="mt-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} SHARO Workforce Management.
        All rights reserved.
      </p>

    </div>
  );
}