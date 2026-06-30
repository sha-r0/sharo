"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

export default function AdminForm() {
   const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";


  const [showPassword, setShowPassword] = useState(false);

  

  return (
    <motion.form
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 mt-8"
    >
      {/* Company ID */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Company ID
        </label>

        <div
          className={`
            flex
            items-center
            gap-3
            h-16
            rounded-2xl
            bg-[#f5f5f5]
            px-5
           
         ${neoShadow} `}
        >
          <Building2 size={20} className="text-blue-600" />

          <input
            type="text"
            placeholder="Enter Company ID"
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Admin Email */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Admin Email
        </label>

        <div
          className={`
            flex
            items-center
            gap-3
            h-16
            rounded-2xl
            bg-[#f5f5f5]
            px-5
            ${neoShadow}
          `}
        >
          <Mail size={20} className="text-blue-600" />

          <input
            type="email"
            placeholder="Enter Admin Email"
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Password */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Password
        </label>

        <div
          className={`
            flex
            items-center
            gap-3
            h-16
            rounded-2xl
            bg-[#f5f5f5]
            px-5
          ${neoShadow}
          `}
        >
          <Lock size={20} className="text-blue-600" />

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-500 hover:text-blue-600 transition"
          >
            {showPassword ? (
              <EyeOff size={20} />
            ) : (
              <Eye size={20} />
            )}
          </button>
        </div>
      </div>
    </motion.form>
  );
}