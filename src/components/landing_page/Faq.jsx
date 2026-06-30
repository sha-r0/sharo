"use client";

import { useState } from "react";
import {
    MessageCircle,
    Gift,
    Building2,
    Shield,
    Smartphone,
    Headphones,
    Sparkles,
    Plus,
    Minus,
} from "lucide-react";

export default function FAQSection() {
    const [open, setOpen] = useState(0);

    const neoShadow =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

    const faqs = [
        {
            icon: MessageCircle,
            question: "What is SHARO?",
            answer:
                "SHARO is an all-in-one business management platform that helps companies manage employees, attendance, projects, payroll, expenses and operations from a single dashboard.",
        },
        {
            icon: Gift,
            question: "Do you offer a free trial?",
            answer:
                "Yes, SHARO offers a 14-day free trial with full access to all core features. No credit card is required.",
        },
        {
            icon: Building2,
            question: "Can I manage multiple branches?",
            answer:
                "Absolutely. Business and Enterprise plans support multi-location and multi-branch operations.",
        },
        {
            icon: Shield,
            question: "Is my data secure?",
            answer:
                "Yes. Your data is protected using secure infrastructure, encrypted connections and enterprise-grade security practices.",
        },
        {
            icon: Smartphone,
            question: "Can I use SHARO on mobile?",
            answer:
                "Yes. SHARO works seamlessly across desktop, tablet and mobile devices.",
        },
        {
            icon: Headphones,
            question: "Do you provide customer support?",
            answer:
                "Yes. We provide email, chat and priority support depending on your subscription plan.",
        },
    ];

    return (
        <section className="relative py-28 overflow-hidden">
            {/* Background Blur */}
            <div className="absolute left-20 top-32 w-52 h-52 rounded-full bg-blue-200/20 blur-3xl" />

            <div className="absolute right-20 bottom-20 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl" />

            <div className="max-w-7xl mx-auto px-6">
                {/* Badge */}
                <div className="flex justify-center">
                    <div
                        className={`
            px-6 py-2 rounded-full
            flex items-center gap-2
            text-blue-600 font-medium
            bg-[#f5f5f5]
            ${neoShadow}
          `}
                    >
                        <Sparkles size={16} />
                        FAQ
                    </div>
                </div>

                {/* Heading */}
                <div className="text-center mt-8">
                    <h2 className="text-3xl md:text-5xl font-bold text-[#071330]">
                        Frequently Asked Questions
                    </h2>

                    <p className="mt-5 text-lg text-slate-500">
                        Everything you need to know about SHARO
                    </p>
                </div>

                {/* FAQ Grid */}
                {/* FAQ Grid */}
                <div className="grid lg:grid-cols-2 gap-6 mt-16 items-start">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6">
                        {faqs.slice(0, 3).map((faq, index) => {
                            const Icon = faq.icon;
                            const isOpen = open === index;

                            return (
                                <div
                                    key={index}
                                    className={`
          bg-[#f5f5f5]
          rounded-[24px]
          overflow-hidden
          ${neoShadow}
        `}
                                >
                                    <button
                                        onClick={() =>
                                            setOpen(isOpen ? null : index)
                                        }
                                        className="
            w-full
            p-6
            flex
            items-center
            justify-between
            text-left
          "
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`
                h-12 w-12
                rounded-2xl
                bg-[#f5f5f5]
                flex items-center justify-center
                ${neoShadow}
              `}
                                            >
                                                <Icon
                                                    size={20}
                                                    className="text-blue-600"
                                                />
                                            </div>

                                            <span className="font-semibold text-lg text-[#071330]">
                                                {faq.question}
                                            </span>
                                        </div>

                                        {isOpen ? (
                                            <Minus className="text-blue-600" />
                                        ) : (
                                            <Plus className="text-slate-500" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-6 pb-6">
                                            <div className="pl-16 text-slate-500 leading-7">
                                                {faq.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-6">
                        {faqs.slice(3, 6).map((faq, i) => {
                            const index = i + 3;
                            const Icon = faq.icon;
                            const isOpen = open === index;

                            return (
                                <div
                                    key={index}
                                    className={`
          bg-[#f5f5f5]
          rounded-[24px]
          overflow-hidden
          ${neoShadow}
        `}
                                >
                                    <button
                                        onClick={() =>
                                            setOpen(isOpen ? null : index)
                                        }
                                        className="
            w-full
            p-6
            flex
            items-center
            justify-between
            text-left
          "
                                    >
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`
                h-12 w-12
                rounded-2xl
                bg-[#f5f5f5]
                flex items-center justify-center
                ${neoShadow}
              `}
                                            >
                                                <Icon
                                                    size={20}
                                                    className="text-blue-600"
                                                />
                                            </div>

                                            <span className="font-semibold text-lg text-[#071330]">
                                                {faq.question}
                                            </span>
                                        </div>

                                        {isOpen ? (
                                            <Minus className="text-blue-600" />
                                        ) : (
                                            <Plus className="text-slate-500" />
                                        )}
                                    </button>

                                    {isOpen && (
                                        <div className="px-6 pb-6">
                                            <div className="pl-16 text-slate-500 leading-7">
                                                {faq.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                </div>
            </div>
        </section>
    );
}