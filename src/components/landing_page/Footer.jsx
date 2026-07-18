"use client";

import Link from "next/link";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const neoShadow =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Integrations", href: "/integrations" },
  { label: "Updates", href: "/updates" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Customers", href: "/customers" },
  { label: "Careers", href: "/careers" },
  { label: "Contact", href: "/contact" },
];

const resourceLinks = [
  { label: "Documentation", href: "/documentation" },
  { label: "Help Center", href: "/help" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden px-3 py-10 sm:px-4 sm:py-14 lg:py-20">
      <div
        className={`
          relative
          mx-auto
          max-w-7xl
          overflow-hidden
          rounded-[24px]
          bg-[#f5f5f5]
          px-4
          py-8
          sm:rounded-[30px]
          sm:px-6
          sm:py-10
          md:px-8
          md:py-12
          lg:rounded-[40px]
          lg:px-10
          lg:py-14
          ${neoShadow}
        `}
      >
        {/* Background Video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="
            pointer-events-none
            absolute
            bottom-0
            left-1/2
            h-full
            min-h-[700px]
            w-auto
            min-w-full
            -translate-x-1/2
            object-cover
            opacity-[0.08]
            grayscale
            invert
            sm:opacity-[0.12]
            lg:w-[1200px]
            lg:min-w-0
            lg:opacity-20
          "
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        <div className="relative z-10">
          {/* Main footer grid */}
          <div
            className="
              grid
              grid-cols-1
              gap-10
              sm:grid-cols-2
              sm:gap-10
              lg:grid-cols-5
              lg:gap-12
            "
          >
            {/* Company Information */}
            <div className="sm:col-span-2 lg:col-span-2">
              <Link
                href="/"
                className="inline-flex items-center gap-3 sm:gap-4"
                aria-label="Go to SHARO homepage"
              >
                <div
                  className="
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-gradient-to-br
                    from-blue-500
                    to-indigo-600
                    text-lg
                    font-bold
                    text-white
                    sm:h-12
                    sm:w-12
                    sm:rounded-2xl
                    sm:text-xl
                  "
                >
                  S
                </div>

                <span className="text-2xl font-bold text-[#071330] sm:text-3xl">
                  SHARO
                </span>
              </Link>

              <p
                className="
                  mt-5
                  max-w-md
                  text-sm
                  leading-7
                  text-slate-500
                  sm:mt-6
                  sm:text-base
                  sm:leading-8
                "
              >
                The modern operating system for growing companies. Manage
                employees, attendance, projects, payroll, expenses and
                operations from one platform.
              </p>

              {/* Contact Information */}
              <div className="mt-7 space-y-4 sm:mt-8">
                <a
                  href="mailto:hello@sharo.in"
                  className="
                    flex
                    items-start
                    gap-3
                    text-sm
                    text-slate-600
                    transition-colors
                    hover:text-[#4f6df5]
                    sm:text-base
                  "
                >
                  <Mail className="mt-0.5 h-[18px] w-[18px] shrink-0" />
                  <span className="break-all">hello@sharo.in</span>
                </a>

                <a
                  href="tel:+919811880794"
                  className="
                    flex
                    items-center
                    gap-3
                    text-sm
                    text-slate-600
                    transition-colors
                    hover:text-[#4f6df5]
                    sm:text-base
                  "
                >
                  <Phone className="h-[18px] w-[18px] shrink-0" />
                  <span>+91 98118 80794</span>
                </a>

                <div className="flex items-center gap-3 text-sm text-slate-600 sm:text-base">
                  <MapPin className="h-[18px] w-[18px] shrink-0" />
                  <span>New Delhi, India</span>
                </div>
              </div>
            </div>

            {/* Product */}
            <FooterColumn title="Product" links={productLinks} />

            {/* Company */}
            <FooterColumn title="Company" links={companyLinks} />

            {/* Resources */}
            <FooterColumn title="Resources" links={resourceLinks} />
          </div>

          {/* Newsletter */}
          <div className="mt-10 border-t border-slate-200 pt-8 sm:mt-12 sm:pt-10 lg:mt-14">
            <div
              className="
                flex
                flex-col
                items-start
                justify-between
                gap-6
                lg:flex-row
                lg:items-center
              "
            >
              <div>
                <h4 className="text-xl font-bold text-[#071330] sm:text-2xl">
                  Stay updated
                </h4>

                <p className="mt-2 text-sm text-slate-500 sm:text-base">
                  Get product updates and company news.
                </p>
              </div>

              <form
                className="
                  flex
                  w-full
                  flex-col
                  gap-3
                  sm:flex-row
                  lg:w-auto
                "
                onSubmit={(event) => event.preventDefault()}
              >
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className={`
                    h-11
                    w-full
                    min-w-0
                    rounded-[15px]
                    bg-[#f5f5f5]
                    px-4
                    text-sm
                    text-[#071330]
                    outline-none
                    placeholder:text-slate-400
                    focus:ring-2
                    focus:ring-[#4f6df5]/25
                    sm:h-12
                    sm:flex-1
                    sm:px-5
                    sm:text-base
                    lg:w-80
                    ${neoShadow}
                  `}
                />

                <button
                  type="submit"
                  className="
                    flex
                    h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-[15px]
                    bg-blue-600
                    px-5
                    text-sm
                    font-medium
                    text-white
                    shadow-[0_10px_25px_rgba(37,99,235,0.35)]
                    transition-all
                    duration-200
                    hover:-translate-y-0.5
                    hover:bg-blue-700
                    sm:h-12
                    sm:w-auto
                    sm:px-6
                    sm:text-base
                  "
                >
                  Subscribe
                  <ArrowRight className="h-[18px] w-[18px]" />
                </button>
              </form>
            </div>
          </div>

          {/* Bottom */}
          <div
            className="
              mt-8
              flex
              flex-col
              items-start
              justify-between
              gap-3
              border-t
              border-slate-200
              pt-6
              sm:mt-10
              sm:flex-row
              sm:items-center
              sm:gap-6
              sm:pt-8
            "
          >
            <p className="text-xs leading-6 text-slate-500 sm:text-sm">
              © {new Date().getFullYear()} SHARO. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500 sm:text-sm">
              <Link
                href="/privacy-policy"
                className="transition-colors hover:text-[#4f6df5]"
              >
                Privacy
              </Link>

              <Link
                href="/terms"
                className="transition-colors hover:text-[#4f6df5]"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div>
      <h4 className="mb-4 text-base font-bold text-[#071330] sm:mb-6 sm:text-lg">
        {title}
      </h4>

      <div className="flex flex-col items-start gap-3 text-sm text-slate-500 sm:gap-4 sm:text-base">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="
              transition-all
              duration-200
              hover:translate-x-1
              hover:text-[#4f6df5]
            "
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}