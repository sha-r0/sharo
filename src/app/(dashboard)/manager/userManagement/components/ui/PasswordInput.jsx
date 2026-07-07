"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({

  label,

  value = "",

  onChange,

  placeholder = "Enter password",

  required = false,

  disabled = false,

  className = "",

}) {

  const [showPassword, setShowPassword] = useState(false);

  return (

    <div className={className}>

      {label && (

        <label className="block mb-2 text-sm font-semibold text-slate-700">

          {label}

          {required && (

            <span className="text-red-500 ml-1">*</span>

          )}

        </label>

      )}

      <div
        className="
          flex
          items-center
          h-12
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          focus-within:border-blue-600
          focus-within:ring-2
          focus-within:ring-blue-100
          transition
        "
      >

        <input

          type={showPassword ? "text" : "password"}

          value={value}

          disabled={disabled}

          placeholder={placeholder}

          onChange={(e)=>onChange?.(e.target.value)}

          className="
            flex-1
            bg-transparent
            outline-none
            text-slate-700
            placeholder:text-slate-400
          "

        />

        <button

          type="button"

          onClick={()=>setShowPassword(!showPassword)}

          className="
            ml-3
            text-slate-500
            hover:text-blue-600
            transition
          "

        >

          {showPassword ? (

            <EyeOff size={18} />

          ) : (

            <Eye size={18} />

          )}

        </button>

      </div>

    </div>

  );

}