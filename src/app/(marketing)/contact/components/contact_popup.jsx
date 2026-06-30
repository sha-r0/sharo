"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Listbox } from "@headlessui/react";
import { useState } from "react";
import {
 
  X,
  User,
  Mail,
  Phone,
  Building2,
  CalendarDays,
  Clock,
  Headphones,
  Send,
  TriangleAlert,
  ChevronDown,
  
} from "lucide-react";

export default function ContactPopup({
  open,
  onClose,
  type = "demo",
}) {
  if (!open) return null;

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const isDemo = type === "demo";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-md p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0, scale: .95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: .35 }}
          className={`relative w-full max-w-4xl rounded-[35px] bg-[#F5F6FA] p-10 ${neoShadow}`}
        >
          {/* Close */}

          <button
            onClick={onClose}
            className={`absolute right-8 top-8 h-12 w-12 rounded-full flex items-center justify-center bg-[#F5F6FA] ${neoShadow}`}
          >
            <X />
          </button>

          {/* Header */}

          <div className="flex gap-6 items-center mb-10">

            <div
              className={`h-24 w-24 rounded-full flex items-center justify-center bg-[#F5F6FA] ${neoShadow}`}
            >
              {isDemo ? (
                <CalendarDays className="text-blue-600" size={42} />
              ) : (
                <Headphones className="text-blue-600" size={42} />
              )}
            </div>

            <div>

              <h2 className="text-4xl font-bold text-slate-900">
                {isDemo ? "Book a Demo" : "Support Center"}
              </h2>

              <p className="mt-2 text-slate-500">
                {isDemo
                  ? "Fill in the details and our team will schedule a personalized demo."
                  : "Describe your issue and our support engineers will contact you."}
              </p>

            </div>

          </div>

          {/* Form */}

          <div >
            {isDemo

           ? <div className="grid md:grid-cols-2 gap-6"> 
           
           <Input icon={<User size={18} />} placeholder="Full Name" />

            <Input icon={<Mail size={18} />} placeholder="Email Address" />

            <Input icon={<Building2 size={18} />} placeholder="Company" />

            <Input icon={<Phone size={18} />} placeholder="Phone Number" />

             <Input icon={<CalendarDays size={18} />} placeholder="Preferred Date" />

             <Input icon={<Clock size={18} />} placeholder="Preferred Time" />

             </div>

             
             
           :<div className="grid md:grid-cols-2 gap-6"> 
           
           <Input icon={<User size={18} />} placeholder="Full Name" />

            <Input icon={<Mail size={18} />} placeholder="Email Address" />

            <Input icon={<Building2 size={18} />} placeholder="Company" />

            <SelectInput icon={<TriangleAlert size={18} />} label="Issue Type"/>
             
             </div>
             }

          </div>

          <div className="mt-6">

            <textarea
              rows={5}
              placeholder={
                isDemo
                  ? "Tell us about your project..."
                  : "Describe your issue..."
              }
              className={`w-full rounded-3xl bg-[#F5F6FA] p-6 resize-none outline-none ${neoShadow}`}
            />
            <p>Support Email</p>
            <a
  href="mailto:info@yourcompany.com"
  className="text-blue-600 hover:underline"
>
 support@sharo.in
</a>

          </div>

          <div className="mt-10 flex justify-end gap-5">

            <button
              onClick={onClose}
              className={`rounded-full px-8 py-4 bg-[#F5F6FA] ${neoShadow}`}
            >
              Cancel
            </button>

            <button className="rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-8 py-4 text-white font-semibold flex items-center gap-3">
              {isDemo ? "Schedule Demo" : "Submit Request"}

              <Send size={18} />
            </button>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Input({ icon, placeholder }) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl bg-[#F5F6FA] px-5 py-4 ${neoShadow}`}
    >
      <span className="text-slate-400">{icon}</span>



      <input
        className="w-full bg-transparent outline-none"
        placeholder={placeholder}
      />
    </div>


  );
}





function SelectInput({ icon, label }) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  return (
    <div
      className={`relative flex items-center rounded-2xl bg-[#F5F6FA] px-5 py-4 border border-white/60 ${neoShadow}`}
    >
      {/* Left Icon */}
      <span className="mr-3 text-slate-400">
        {icon}
      </span>

      {/* Select */}
      <select
        defaultValue=""
        className="
          w-full
          bg-transparent
          text-slate-700
          outline-none
          appearance-none
          cursor-pointer
          pr-10
          font-medium
        "
      >
        <option value="" disabled hidden>
          {label}
        </option>

        <option value="login">Login Issue</option>
        <option value="attendance">Attendance Issue</option>
        <option value="payroll">Payroll Issue</option>
        <option value="billing">Billing Issue</option>
        <option value="other">Other</option>
      </select>

      {/* Custom Arrow */}
      <div
        className={`absolute right-4 h-8 w-8 rounded-full flex items-center justify-center bg-[#F5F6FA] border border-white/60 ${neoShadow}`}
      >
        <ChevronDown
          size={16}
          className="text-slate-500 pointer-events-none"
        />
      </div>
    </div>
  );
}



