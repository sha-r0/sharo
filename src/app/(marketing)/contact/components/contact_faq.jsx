"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Minus,
  HelpCircle,
  ArrowRight,
} from "lucide-react";

const faqs = [
  {
    question: "How quickly can you respond to an enquiry?",
    answer:
      "Our team usually responds within 2 hours during business hours. Enterprise enquiries are prioritized.",
  },
  {
    question: "Do you provide on-site engineering consultancy?",
    answer:
      "Yes. We provide consultancy, inspections, structural audits, and complete project management services across India and internationally.",
  },
  {
    question:
      "Can I schedule a meeting before requesting a quotation?",
    answer:
      "Absolutely. You can book an online or in-person meeting with our experts to discuss your project requirements.",
  },
  {
    question: "Which industries do you serve?",
    answer:
      "We work across telecom infrastructure, civil construction, airports, renewable energy, industrial facilities, and smart city projects.",
  },
];

export default function Contact_FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggleFAQ = (index) => {
    setOpenIndex((prev) =>
      prev === index ? -1 : index
    );
  };

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <section className="bg-[#F5F6FA] py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-14"
        >
          <div>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-blue-600 bg-[#F5F6FA] ${neoShadow}`}
            >
              <HelpCircle size={16} />
              FAQ
            </span>

            <h2 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
              Frequently Asked Questions
            </h2>

            <p className="mt-5 max-w-2xl text-base sm:text-lg text-slate-500 leading-8">
              Find answers to the most common questions about our engineering
              services and project consultation.
            </p>
          </div>

          <button className="group mt-8 lg:mt-0 flex items-center gap-2 text-blue-600 font-semibold">
            View All
            <ArrowRight
              size={18}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </button>
        </motion.div>

        {/* FAQ GRID */}
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {faqs.map((faq, index) => (
            <motion.div
              layout
              key={index}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1,
              }}
              viewport={{ once: true }}
              className={`
                rounded-[28px]
                bg-[#F5F6FA]
                border
                border-white/70
                overflow-hidden
                ${neoShadow}
              `}
            >
              {/* QUESTION */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-5 sm:p-7 text-left"
              >
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 pr-5 leading-relaxed">
                  {faq.question}
                </h3>

                <div
                  className={`
                    w-10 h-10
                    sm:w-12 sm:h-12
                    rounded-full
                    flex items-center justify-center
                    bg-[#F5F6FA]
                    flex-shrink-0
                    ${neoShadow}
                  `}
                >
                  <motion.div
                    animate={{
                      rotate:
                        openIndex === index
                          ? 180
                          : 0,
                    }}
                    transition={{
                      duration: 0.25,
                    }}
                  >
                    {openIndex === index ? (
                      <Minus
                        size={20}
                        className="text-blue-600"
                      />
                    ) : (
                      <Plus
                        size={20}
                        className="text-slate-700"
                      />
                    )}
                  </motion.div>
                </div>
              </button>

              {/* ANSWER */}
              <AnimatePresence initial={false}>
                {openIndex === index && (
                  <motion.div
                    layout
                    initial={{
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                    }}
                    transition={{
                      duration: 0.3,
                    }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 sm:px-7 pb-7 text-slate-500 leading-7">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}