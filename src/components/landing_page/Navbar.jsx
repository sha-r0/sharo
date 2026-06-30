"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";

const neoShadow = "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const NAV_ITEMS = [
    { label: "Features", href: "#features" },
    { label: "Solutions", href: "#solutions" },
    { label: "Pricing", href: "#pricing" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
]

export default function Navbar() {
    return (
        <header className="sticky top-7 z-50 px-4">
            <nav className="max-w-7xl mx-auto px-6 py-3 rounded-[30px] bg-[#f5f5f5] flex items-center justify-between
               shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]"
            >
                {/* LOGO */}
                <Link href="/" className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#5f72ff] to-[#3d5afe] flex items-center justify-center
                                  text-white  font-bold text-xl shadow-[0_15px_30px_rgba(95,114,255,0.35)]">
                        S
                    </div>

                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                        SHARO
                    </span>
                </Link>

                {/* MENU */}
                <div className="hidden lg:flex items-center gap-10">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.label}
                            href={item.href}
                            className="
                text-slate-600
                hover:text-slate-900
                transition-colors
                duration-200
                font-medium
              "
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-4">
                    {/* LOGIN */}
                    <Link
                        href="/login"
                        className="
              h-10
              px-7
              rounded-[18px]
              bg-[#f5f5f5]
              flex
              items-center
              text-[#071330]
              font-medium
              shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]
            "
                    >
                        Login
                    </Link>

                    {/* CREATE COMPANY */}
                    <Link
                        href="/signup"
                        className="
              h-10
              px-7
              rounded-[18px]
              bg-gradient-to-r
              from-[#5f72ff]
              to-[#3d5afe]
              text-white
              font-medium
              flex
              items-center
              gap-2
              shadow-[0_15px_30px_rgba(95,114,255,0.35)]
              hover:-translate-y-0.5
              transition-all
            "
                    >
                        Create Company
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </nav>
        </header>
    );
}