"use client";

import { motion } from "framer-motion";
import {
  User,
  Mail,
  Building2,
  Phone,
  Pencil,
  MessageSquare,
  Send,
  ShieldCheck,
  Clock3,
  MapPin,
} from "lucide-react";

export default function Contact_form() {
     const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <section className="bg-[#F5F6FA] py-20">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="grid lg:grid-cols-[2fr_1fr] gap-8"
        >

          {/* ================= LEFT FORM ================= */}

          <div
            className={`rounded-[36px] bg-[#F5F6FA] p-10
            ${neoShadow}`}
          >
            <h2 className="text-4xl font-bold text-slate-900">
              Send us a message
            </h2>

            <p className="mt-3 text-slate-500">
              Fill out the form and our engineering team will get back to you
              shortly.
            </p>

            <form className="mt-10 space-y-6">

              <div className="grid md:grid-cols-2 gap-6">

                <Input
                  icon={<User size={18} />}
                  placeholder="Enter your name"
                  label="Full Name"
                />

                <Input
                  icon={<Mail size={18} />}
                  placeholder="Enter your email"
                  label="Work Email"
                />

                <Input
                  icon={<Building2 size={18} />}
                  placeholder="Company name"
                  label="Company"
                />

                <Input
                  icon={<Phone size={18} />}
                  placeholder="Phone Number"
                  label="Phone"
                />

              </div>

              <Input
                icon={<Pencil size={18} />}
                placeholder="How can we help you?"
                label="Subject"
              />

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Message
                </label>

                <div
                  className={`mt-2 flex rounded-2xl bg-[#F5F6FA]
                  ${neoShadow}
                  px-5 py-4`}
                >
                  <MessageSquare
                    className="mr-3 mt-1 text-slate-400"
                    size={18}
                  />

                  <textarea
                    rows={6}
                    placeholder="Tell us more about your project..."
                    className="w-full bg-transparent resize-none outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">

                <button
                  className="inline-flex items-center justify-center gap-3
                  rounded-full px-10 py-4
                  bg-gradient-to-r from-blue-500 to-blue-700
                  text-white font-semibold shadow-lg
                  transition hover:scale-105"
                >
                  Send Message
                  <Send size={18} />
                </button>

                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <ShieldCheck size={18} />
                  We respect your privacy.
                </div>

              </div>

            </form>
          </div>

          {/* ================= RIGHT SIDEBAR ================= */}

          <div className="space-y-6">

            <div
              className={`rounded-[36px] bg-[#F5F6FA] p-8
              ${neoShadow}`}
            >
              <h3 className="text-2xl font-bold text-slate-900 mb-8">
                Quick Contact
              </h3>

              <InfoCard
                icon={<Mail size={22} />}
                title="Email Us"
                value="contact@yourcompany.com"
                subtitle="Reply within 2 hours"
              />

              <InfoCard
                icon={<Phone size={22} />}
                title="Call Us"
                value="+91 98765 43210"
                subtitle="Mon - Sat | 9 AM - 6 PM"
              />

              <InfoCard
                icon={<MapPin size={22} />}
                title="Our Office"
                value="Mumbai, Maharashtra"
                subtitle="India"
              />
            </div>

            <div
              className={`rounded-[30px] bg-[#F5F6FA] p-6
              ${neoShadow}`}
            >
              <div className="flex items-center gap-4">

                <div
                  className={`h-14 w-14 rounded-full flex items-center justify-center
                  bg-[#F5F6FA]
                 ${neoShadow}`}
                >
                  <Clock3 className="text-blue-600" />
                </div>

                <div>
                  <p className="text-slate-500 text-sm">
                    Average Response Time
                  </p>

                  <h4 className="text-xl font-bold text-blue-600">
                    Under 2 Hours
                  </h4>
                </div>

              </div>
            </div>

          </div>

        </motion.div>
      </div>
    </section>
  );
}

/* ================= INPUT ================= */

function Input({ icon, label, placeholder }) {
     const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div>
      <label className="text-sm font-medium text-slate-700">
        {label}
      </label>

      <div
        className={`mt-2 flex items-center rounded-2xl bg-[#F5F6FA]
        ${neoShadow}
        px-5 py-4`}
      >
        <span className="text-slate-400 mr-3">
          {icon}
        </span>

        <input
          type="text"
          placeholder={placeholder}
          className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

/* ================= INFO CARD ================= */

function InfoCard({ icon, title, value, subtitle }) {
     const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div className="flex gap-4 mb-8">

      <div
        className={`h-14 w-14 rounded-full flex items-center justify-center
        bg-[#F5F6FA]
         ${neoShadow}`}
      >
        <span className="text-blue-600">
          {icon}
        </span>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900">
          {title}
        </h4>

        <p className="text-slate-700">
          {value}
        </p>

        <p className="text-sm text-slate-500">
          {subtitle}
        </p>
      </div>

    </div>
  );
}