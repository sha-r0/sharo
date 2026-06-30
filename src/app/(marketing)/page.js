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
        <main className="min-h-screen bg-[#eef2f7]">
            <section className="grid lg:grid-cols-2 gap-20 mt-12 items-end max-w-7xl mx-auto px-8 py-5 w-full">
                <HeroLeft />
                <DashboardPreview />
            </section>
            <TrustedSection />
            <FeaturesSection />
            {/* <DashboardShowcase /> */}
            <BenefitsSection />
            <PricingSection />
            <BlogSection />
            <FAQSection />
            <CTASection />
        </main>
    );
}