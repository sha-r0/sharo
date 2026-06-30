"use client";

import { useState } from "react";
import ContactPopup from "./contact_popup";

import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  CalendarDays,
  Headphones,
  ArrowRight,
} from "lucide-react";

const cards = [
  {
    icon: BriefcaseBusiness,
    title: "Talk to Sales",
    description:
      "Speak with our experts about pricing, enterprise solutions, and custom engineering services.",
    button: "Contact Sales",
  },
  {
    icon: CalendarDays,
    title: "Book a Demo",
    description:
      "Schedule a personalized consultation and discover how we can help your business grow.",
    button: "Book Demo",
  },
  {
    icon: Headphones,
    title: "Support Center",
    description:
      "Need technical assistance? Our dedicated support team is always ready to help.",
    button: "Get Support",
  },
];

export default function Contact_cards() {
  const [popup, setPopup] = useState(null);
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";


  return (
    <section className="bg-[#F5F6FA] py-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">

          {cards.map((card, index) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className={`group rounded-[32px] bg-[#F5F6FA]
                p-10 text-center
                ${neoShadow}
                transition-all duration-300`}>
                {/* Icon */}

                <div
                  className={`mx-auto mb-8 flex h-20 w-20 items-center justify-center
                  rounded-full bg-[#F5F6FA]
                   ${neoShadow}`}
                >
                  <Icon
                    size={34}
                    className="text-blue-600 transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                {/* Title */}

                <h3 className="text-2xl font-bold text-slate-900">
                  {card.title}
                </h3>

                {/* Description */}

                <p className="mt-5 text-slate-500 leading-7">
                  {card.description}
                </p>

                {/* Button */}
<button
  onClick={() => {
    if (card.title === "Book a Demo") {
      setPopup("demo");
    }

    if (card.title === "Support Center") {
      setPopup("support");
    }
  }}
  className={`mt-10 inline-flex items-center justify-between gap-6
  rounded-full px-8 py-4
  bg-[#F5F6FA]
  ${neoShadow}
  text-blue-600 font-semibold
  transition-all duration-300
  group-hover:bg-blue-600
  group-hover:text-white`}
>
  {card.button}

  <ArrowRight
    size={18}
    className="transition-transform duration-300 group-hover:translate-x-1"
  />
</button>
                
              </motion.div>
            );
          })}

        </div>

      </div>
      <ContactPopup
  open={popup !== null}
  type={popup}
  onClose={() => setPopup(null)}
/>
    </section>
  );
}