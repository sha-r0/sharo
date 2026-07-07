"use client";

import { ChevronDown } from "lucide-react";

export default function Select({

  label,

  value = "",

  onChange,

  options = [],

  icon: Icon,

  required = false,

  disabled = false,

  placeholder = "Select",

  className = "",

}) {

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
          relative
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

        {Icon && (

          <Icon
            size={18}
            className="text-blue-600 mr-3 shrink-0"
          />

        )}

        <select

          value={value}

          disabled={disabled}

          onChange={(e)=>onChange?.(e.target.value)}

          className="
            flex-1
            bg-transparent
            outline-none
            appearance-none
            text-slate-700
            pr-8
            cursor-pointer
          "

        >

          <option value="">

            {placeholder}

          </option>

          {options.map((option)=>{

            if(typeof option==="string"){

              return(

                <option

                  key={option}

                  value={option}

                >

                  {option}

                </option>

              );

            }

            return(

              <option

                key={option.value}

                value={option.value}

              >

                {option.label}

              </option>

            );

          })}

        </select>

        <ChevronDown

          size={18}

          className="
            absolute
            right-4
            text-slate-400
            pointer-events-none
          "

        />

      </div>

    </div>

  );

}