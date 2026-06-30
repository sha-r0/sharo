"use client";

import { MessageCircle, Circle } from "lucide-react";
import { motion } from "framer-motion";

export default function Contact_hero() {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";


  return (
    <section className="bg-[#F5F6FA] pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: .7 }}
            viewport={{ once: true }}
          >
            {/* Badge */}

            <div className={`inline-flex items-center rounded-full px-5 py-2 text-sm font-semibold text-blue-600 bg-[#F5F6FA] ${neoShadow}`}>
              CONTACT US
            </div>

            {/* Heading */}

            <h1 className="mt-8 text-5xl lg:text-6xl font-bold leading-tight text-slate-900">
              Let's build a better
              <br />
              business together.
            </h1>

            {/* Paragraph */}

            <p className="mt-6 text-lg text-slate-500 leading-8 max-w-lg">
              Talk to our sales team, book a personalized demo,
              or get the support you need for your business.
            </p>
          </motion.div>

          {/* Right Illustration */}

          <motion.div
            initial={{ opacity: 0, scale: .9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: .8 }}
            viewport={{ once: true }}
            className="relative flex justify-center items-center h-[420px]">

            {/* Floating Ball */}

            <div className={`absolute left-8 top-36 w-16 h-16 rounded-full bg-[#F5F6FA]
            ${neoShadow}`} />

            <div className={`absolute right-4 top-40 w-20 h-20 rounded-full bg-[#F5F6FA]
            ${neoShadow}`} />

            {/* Blue Ball */}

            <div className={`absolute bottom-10 right-10 w-16 h-16 rounded-full
            bg-gradient-to-br from-blue-400 to-blue-600
             ${neoShadow}`} />

            {/* Chat Bubble */}

            <div
              className={`relative  w-[340px] h-[260px] rounded-[38px]
              bg-[#F5F6FA]
               ${neoShadow}`}
            >

              {/* Bubble Tail */}

              <div
                className={`absolute bottom-[-22px] left-12 w-12 h-12  rotate-45
                bg-[#F5F6FA]
                 ${neoShadow}`}
              />

              {/* Content */}

              <div className="relative z-10 flex justify-center items-center h-full gap-6">

                {[1, 2, 3].map((item) => (
                  <motion.div
                    key={item}
                    animate={{
                      y: [0, -8, 0],
                    }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      delay: item * .25,
                    }}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg"
                  />
                ))}

              </div>

            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
}