"use client";

import { motion } from "framer-motion";
import {
  MessageCircleMore,
  ArrowRight,
  PhoneCall,
} from "lucide-react";

export default function Bottom_CTA() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <section className="bg-[#F5F6FA] pb-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className={`relative overflow-hidden rounded-[42px] bg-[#F5F6FA] border border-white/70 ${neoShadow}`}
        >
          {/* Decorative Blur */}

          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-blue-100 blur-3xl opacity-50" />
          <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-slate-100 blur-3xl opacity-70" />

          <div className="relative z-10 flex flex-col items-center text-center px-8 py-20">

            {/* Floating Icon */}

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
              className={`mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#F5F6FA] ${neoShadow}`}
            >
              <MessageCircleMore
                size={42}
                className="text-blue-600"
              />
            </motion.div>

            {/* Heading */}

            <h2 className="max-w-3xl text-4xl lg:text-5xl font-bold text-slate-900 leading-tight">
              Still have questions?
            </h2>

            {/* Description */}

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">
              Whether you need engineering consultation, project planning,
              structural design, or technical support, our experts are always
              ready to assist you.
            </p>

            {/* Buttons */}

            <div className="mt-12 flex flex-col sm:flex-row gap-5">

              {/* Primary */}

              <button className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-white font-semibold shadow-xl transition-all duration-300 hover:scale-105">

                Contact Our Team

                <ArrowRight
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />

              </button>

              {/* Secondary */}

              <button
                className={`group inline-flex items-center gap-3 rounded-full bg-[#F5F6FA] px-8 py-4 font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-1 ${neoShadow}`}
              >
                <PhoneCall
                  size={18}
                  className="text-blue-600"
                />

                Schedule a Call

              </button>

            </div>

          </div>

        </motion.div>

      </div>
    </section>
  );
}