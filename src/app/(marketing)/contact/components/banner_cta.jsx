"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, MessageCircle } from "lucide-react";

export default function Contact_CTA() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <section className="bg-[#F5F6FA] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className={`relative overflow-hidden rounded-[42px] bg-[#F5F6FA] border border-white/70 ${neoShadow}`}
        >
          <div className="grid lg:grid-cols-[280px_1fr_auto] gap-10 items-center p-10 lg:p-14">

            {/* Left Illustration */}

            <div className="relative flex justify-center">

              <div
                className={`w-48 h-48 rounded-full bg-[#F5F6FA] flex items-center justify-center ${neoShadow}`}
              >
                <MessageCircle
                  size={80}
                  className="text-blue-600"
                />
              </div>

              <motion.div
                animate={{ y: [0, -12, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                }}
                className={`absolute -top-2 right-6 w-14 h-14 rounded-full bg-white flex items-center justify-center ${neoShadow}`}
              >
                <Sparkles
                  size={22}
                  className="text-blue-600"
                />
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                }}
                className="absolute bottom-0 left-6 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"
              />

              <motion.div
                animate={{ x: [0, 10, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                }}
                className="absolute top-10 left-0 w-5 h-5 rounded-full bg-blue-200"
              />
            </div>

            {/* Content */}

            <div>

              <span
                className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-blue-600 bg-[#F5F6FA] ${neoShadow}`}
              >
                Let's Work Together
              </span>

              <h2 className="mt-6 text-4xl lg:text-5xl font-bold leading-tight text-slate-900">
                Ready to discuss
                <br />
                your next project?
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-500">
                Whether it's engineering consultancy, infrastructure,
                construction, telecom, or industrial solutions, our experts are
                here to help you find the right approach.
              </p>

            </div>

            {/* Button */}

            <div className="flex lg:justify-end">

              <button
                className="group inline-flex items-center gap-4 rounded-full
                bg-gradient-to-r from-blue-600 to-blue-500
                px-8 py-5
                text-white font-semibold
                shadow-xl
                transition-all duration-300
                hover:scale-105"
              >
                Schedule a Meeting

                <ArrowRight
                  size={20}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </button>

            </div>

          </div>

          {/* Decorative Background */}

          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-100 opacity-40 blur-3xl"></div>

          <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-slate-100 opacity-60 blur-3xl"></div>

        </motion.div>

      </div>
    </section>
  );
}