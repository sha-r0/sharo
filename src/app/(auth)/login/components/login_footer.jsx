"use client";

import Link from "next/link";

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
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg">
              <LifeBuoy size={22} className="text-white" />
            </div>

            <div>
              <h4 className="font-semibold text-slate-800">
                Need Help?
              </h4>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Contact your system administrator if you're unable to access
                your account.
              </p>
            </div>
          </div>

          <Link
            href="/contact"
            className="
              group
              flex
              shrink-0
              items-center
              gap-2
              font-semibold
              text-blue-600
              transition
              hover:text-blue-700
            "
          >
            Contact

            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>
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
        © {new Date().getFullYear()} SHARO Workforce Management. All rights
        reserved.
      </p>
    </div>
  );
}