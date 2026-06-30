"use client";

import Link from "next/link";
import {
    ArrowRight,
    Mail,
    Phone,
    MapPin,
    //   Linkedin,
    //   Twitter,
    //   Instagram,
} from "lucide-react";

export default function Footer() {
    const neoShadow =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    return (
        <footer className="relative py-20 overflow-hidden">
            {/* Top Border */}
            <div className={`max-w-7xl mx-auto px-6 bg-[#f5f5f5] relative overflow-hidden ${neoShadow} rounded-[40px] p-10 md:p-14`}>

            {/* Video */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] opacity-20 pointer-events-none select-none invert grayscale"
            >
                <source src="/hero.mp4" type="video/mp4" />
            </video>

                <div>
                    <div className="grid lg:grid-cols-5 gap-12">

                        {/* COMPANY */}
                        <div className="lg:col-span-2">

                            <div className="flex items-center gap-4">

                                <div
                                    className="
                  h-12 w-12
                  rounded-2xl
                  bg-gradient-to-br
                  from-blue-500
                  to-indigo-600
                  flex items-center justify-center
                  text-white
                  font-bold
                  text-xl
                "
                                >
                                    S
                                </div>

                                <span className="text-3xl font-bold text-[#071330]">
                                    SHARO
                                </span>

                            </div>

                            <p className="mt-6 text-slate-500 leading-8 max-w-md">
                                The modern operating system for growing companies.
                                Manage employees, attendance, projects, payroll,
                                expenses and operations from one platform.
                            </p>

                            {/* Contact */}
                            <div className="space-y-4 mt-8">

                                <div className="flex items-center gap-3 text-slate-600">
                                    <Mail size={18} />
                                    hello@sharo.in
                                </div>

                                <div className="flex items-center gap-3 text-slate-600">
                                    <Phone size={18} />
                                    +91 98118 80794
                                </div>

                                <div className="flex items-center gap-3 text-slate-600">
                                    <MapPin size={18} />
                                    New Delhi, India
                                </div>

                            </div>

                        </div>

                        {/* PRODUCT */}
                        <div>
                            <h4 className="font-bold text-[#071330] text-lg mb-6">
                                Product
                            </h4>

                            <div className="space-y-4 text-slate-500">
                                <Link href="#">Features</Link>
                                <Link href="#" className="block">Pricing</Link>
                                <Link href="#" className="block">Integrations</Link>
                                <Link href="#" className="block">Updates</Link>
                            </div>
                        </div>

                        {/* COMPANY */}
                        <div>
                            <h4 className="font-bold text-[#071330] text-lg mb-6">
                                Company
                            </h4>

                            <div className="space-y-4 text-slate-500">
                                <Link href="#">About</Link>
                                <Link href="#" className="block">Customers</Link>
                                <Link href="#" className="block">Careers</Link>
                                <Link href="#" className="block">Contact</Link>
                            </div>
                        </div>

                        {/* RESOURCES */}
                        <div>
                            <h4 className="font-bold text-[#071330] text-lg mb-6">
                                Resources
                            </h4>

                            <div className="space-y-4 text-slate-500">
                                <Link href="#">Documentation</Link>
                                <Link href="#" className="block">Help Center</Link>
                                <Link href="#" className="block">Privacy Policy</Link>
                                <Link href="#" className="block">Terms</Link>
                            </div>
                        </div>

                    </div>

                    {/* Newsletter */}
                    <div
                        className="
            mt-14
            pt-10
            border-t
            border-slate-200
          "
                    >
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">

                            <div>
                                <h4 className="text-2xl font-bold text-[#071330]">
                                    Stay updated
                                </h4>

                                <p className="text-slate-500 mt-2">
                                    Get product updates and company news.
                                </p>
                            </div>

                            <div className="flex gap-4 w-full lg:w-auto">

                                <input
                                    placeholder="Enter your email"
                                    className={`
                  flex-1 lg:w-80
                  px-5 py-4
                  rounded-2xl
                  bg-[#f5f5f5]
                  outline-none
                  ${neoShadow}
                `}
                                />

                                <button
                                    className="
                  px-6 py-4
                  rounded-2xl
                  bg-blue-600
                  text-white
                  flex items-center gap-2
                  shadow-[0_10px_25px_rgba(37,99,235,0.35)]
                "
                                >
                                    Subscribe
                                    <ArrowRight size={18} />
                                </button>

                            </div>

                        </div>
                    </div>

                    {/* Bottom */}
                    <div
                        className="
            mt-10
            pt-8
            border-t
            border-slate-200

            flex
            flex-col
            md:flex-row
            items-center
            justify-between
            gap-6
          "
                    >
                        <p className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} SHARO. All rights reserved.
                        </p>

                        {/* Social */}
                        {/* <div className="flex gap-4">

              {[Linkedin, Twitter, Instagram].map((Icon, i) => (
                <button
                  key={i}
                  className={`
                  h-12 w-12
                  rounded-2xl
                  flex items-center justify-center
                  bg-[#f5f5f5]
                  text-slate-600
                  ${neoShadow}
                `}
                >
                  <Icon size={18} />
                </button>
              ))}

            </div> */}

                    </div>
                </div>
            </div>
        </footer>
    );
}