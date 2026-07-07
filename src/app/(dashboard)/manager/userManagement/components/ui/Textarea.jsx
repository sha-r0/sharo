"use client";

export default function Textarea({

  label,

  value = "",

  onChange,

  placeholder = "",

  required = false,

  rows = 4,

  disabled = false,

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

      <textarea

        rows={rows}

        value={value}

        disabled={disabled}

        placeholder={placeholder}

        onChange={(e)=>onChange?.(e.target.value)}

        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          p-4
          outline-none
          resize-none
          transition
          focus:border-blue-600
          focus:ring-2
          focus:ring-blue-100
          placeholder:text-slate-400
        "

      />

    </div>

  );

}