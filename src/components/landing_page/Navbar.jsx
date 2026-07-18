"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowRight,
    Menu,
    X,
} from "lucide-react";

const NAV_ITEMS = [
    {
        label: "Features",
        href: "/#features",
    },
    {
        label: "Solutions",
        href: "/#solutions",
    },
    {
        label: "Pricing",
        href: "/#pricing",
    },
    // {
    //     label: "Blog",
    //     href: "/blog",
    // },
    {
        label: "Contact",
        href: "/contact",
    },
];

const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function Navbar() {
    const pathname = usePathname();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        handleScroll();

        window.addEventListener("scroll", handleScroll);

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    useEffect(() => {
        document.body.style.overflow = isMenuOpen ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
        };
    }, [isMenuOpen]);

    const isActiveLink = (href) => {
        if (href === "/blog") {
            return pathname.startsWith("/blog");
        }

        if (href === "/contact") {
            return pathname.startsWith("/contact");
        }

        const isActiveLink = (href) => {
            if (href === "/blog") {
                return pathname.startsWith("/blog");
            }

            if (href === "/contact") {
                return pathname.startsWith("/contact");
            }

            return pathname === href;
        };

        return pathname === href;
    };

    return (
        <header
            className={`
        sticky top-0 z-50
        px-3 sm:px-4
        py-3 sm:py-4
        transition-all duration-300
        ${isScrolled
                    ? "bg-[#eef2f7]/85 backdrop-blur-xl"
                    : "bg-transparent"
                }
      `}
        >
            <nav
                className={`
          relative
          max-w-7xl
          mx-auto
          rounded-[22px] sm:rounded-[28px]
          bg-[#f5f5f5]
          px-4 sm:px-5 lg:px-6
          py-2.5 sm:py-3
          flex items-center justify-between
          ${neoShadow}
        `}
            >
                {/* Logo */}
                <Link
                    href="/"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex min-w-0 items-center gap-2.5 sm:gap-3"
                    aria-label="Go to SHARO homepage"
                >
                    <div
                        className="
              flex h-10 w-10
              shrink-0
              items-center justify-center
              rounded-xl sm:h-11 sm:w-11 sm:rounded-2xl
              bg-gradient-to-br
              from-[#5f72ff] to-[#3d5afe]
              text-lg font-bold text-white
              shadow-[0_12px_25px_rgba(95,114,255,0.32)]
            "
                    >
                        S
                    </div>

                    <span className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                        SHARO
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden items-center gap-6 xl:gap-9 lg:flex">
                    {NAV_ITEMS.map((item) => {
                        const active = isActiveLink(item.href);

                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="
                                py-2
                                text-sm xl:text-base
                                font-medium
                                text-slate-600
                                transition-colors duration-200
                                hover:text-[#3d5afe]
                              "
                            >
                                {item.label}

                                <span
                                    className={`
    absolute bottom-0 left-0
    h-0.5 rounded-full
    bg-[#3d5afe]
    transition-all duration-200
    ${active ? "w-full" : "w-0"}
  `}
                                />
                            </Link>
                        );
                    })}
                </div>

                {/* Desktop Actions */}
                <div className="hidden items-center gap-3 lg:flex">
                    <Link
                        href="/login"
                        className={`
              flex h-10 items-center justify-center
              rounded-[16px]
              bg-[#f5f5f5]
              px-5 xl:px-6
              text-sm xl:text-base
              font-medium text-[#071330]
              transition-transform duration-200
              hover:-translate-y-0.5
              ${neoShadow}
            `}
                    >
                        Login
                    </Link>

                    <Link
                        href="/signup"
                        className="
              flex h-10
              items-center justify-center gap-2
              rounded-[16px]
              bg-gradient-to-r
              from-[#5f72ff] to-[#3d5afe]
              px-5 xl:px-6
              text-sm xl:text-base
              font-medium text-white
              shadow-[0_12px_25px_rgba(95,114,255,0.3)]
              transition-all duration-200
              hover:-translate-y-0.5
              hover:shadow-[0_16px_30px_rgba(95,114,255,0.38)]
            "
                    >
                        Create Company
                        <ArrowRight size={17} />
                    </Link>
                </div>

                {/* Mobile Right Side */}
                <div className="flex items-center gap-2 lg:hidden">
                    <Link
                        href="/login"
                        className={`
              hidden h-9
              items-center justify-center
              rounded-[14px]
              px-4
              text-sm font-medium
              text-[#071330]
              sm:flex
              ${neoShadow}
            `}
                    >
                        Login
                    </Link>

                    <button
                        type="button"
                        onClick={() => setIsMenuOpen((current) => !current)}
                        className={`
              flex h-10 w-10
              items-center justify-center
              rounded-[14px]
              bg-[#f5f5f5]
              text-[#071330]
              ${neoShadow}
            `}
                        aria-label={
                            isMenuOpen
                                ? "Close navigation menu"
                                : "Open navigation menu"
                        }
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? (
                            <X size={21} />
                        ) : (
                            <Menu size={21} />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                <div
                    className={`
            absolute
            left-0 right-0
            top-[calc(100%+10px)]
            rounded-[22px]
            bg-[#f5f5f5]
            p-4
            transition-all duration-300
            lg:hidden
            ${neoShadow}
            ${isMenuOpen
                            ? "visible translate-y-0 opacity-100"
                            : "invisible -translate-y-3 opacity-0 pointer-events-none"
                        }
          `}
                >
                    <div className="flex flex-col gap-1">
                        {NAV_ITEMS.map((item) => {
                            const active = isActiveLink(item.href);

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`
                    rounded-2xl
                    px-4 py-3.5
                    text-base font-medium
                    transition-colors
                    ${active
                                            ? "bg-[#e7ebff] text-[#3d5afe]"
                                            : "text-slate-700 hover:bg-white hover:text-slate-950"
                                        }
                  `}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-2">
                        <Link
                            href="/login"
                            onClick={() => setIsMenuOpen(false)}
                            className={`
                flex h-11
                items-center justify-center
                rounded-[16px]
                bg-[#f5f5f5]
                font-medium text-[#071330]
                ${neoShadow}
              `}
                        >
                            Login
                        </Link>

                        <Link
                            href="/signup"
                            onClick={() => setIsMenuOpen(false)}
                            className="
                flex h-11
                items-center justify-center gap-2
                rounded-[16px]
                bg-gradient-to-r
                from-[#5f72ff] to-[#3d5afe]
                px-4
                font-medium text-white
                shadow-[0_12px_25px_rgba(95,114,255,0.3)]
              "
                        >
                            Create Company
                            <ArrowRight size={18} />
                        </Link>
                    </div>
                </div>
            </nav>
        </header>
    );
}