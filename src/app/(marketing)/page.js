"use client";

import BenefitsSection from "@/components/landing_page/Benefits";
import BlogSection from "@/components/landing_page/Blog";
import CTASection from "@/components/landing_page/Cta";
import DashboardPreview from "@/components/landing_page/Dashboard";
import FAQSection from "@/components/landing_page/Faq";
import FeaturesSection from "@/components/landing_page/Feature";
import HeroLeft from "@/components/landing_page/Hero";
import PricingSection from "@/components/landing_page/PricingSection";
import TrustedSection from "@/components/landing_page/Trusted";

export default function HeroSection() {
    return (
        <main className="min-h-screen bg-[#eef2f7] overflow-x-hidden">
            <section
                className="
    grid grid-cols-1
    lg:grid-cols-2
    items-center
    gap-10 lg:gap-14 xl:gap-20
    max-w-7xl
    mx-auto
    w-full
    px-4 sm:px-6 lg:px-8
    pt-8 sm:pt-12 lg:pt-16
    pb-10 lg:pb-16
  "
            >
                <HeroLeft />

                <div className="hidden lg:block">
                    <DashboardPreview />
                </div>
            </section>

            <TrustedSection />
            <FeaturesSection />
            <BenefitsSection />
            <PricingSection />
            <BlogSection />
            <FAQSection />
            <CTASection />
        </main>
    );
}