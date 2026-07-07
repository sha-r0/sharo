"use client";

export default function Input({

  label,

  value = "",

  onChange,

  placeholder = "",

  icon: Icon,

  type = "text",

  required = false,

  disabled = false,

  error = "",

  helperText = "",

  prefix,

  suffix,

  className = "",

}) {

  return (

    <div className={className}>

      {/* Label */}

      {label && (

        <div className="flex justify-between mb-2">

          <label className="text-sm font-semibold text-slate-700">

            {label}

            {required && (

              <span className="text-red-500 ml-1">*</span>

            )}

          </label>

        </div>

      )}

      {/* Input */}

      <div

        className={`
          flex
          items-center
          gap-3
          h-12
          rounded-xl
          border
          px-4
          transition

          ${
            error
              ? "border-red-500 focus-within:ring-red-100"
              : "border-slate-200 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-100"
          }

          ${disabled ? "bg-slate-100" : "bg-white"}

        `}
      >

        {Icon && (

          <Icon

            size={18}

            className="text-blue-600 shrink-0"

          />

        )}

        {prefix && (

          <span className="text-slate-500">

            {prefix}

          </span>

        )}

        <input

          type={type}

          value={value ?? ""}

          placeholder={placeholder}

          disabled={disabled}

          onChange={(e)=>onChange?.(e.target.value)}

          className="
            flex-1
            bg-transparent
            outline-none
            text-slate-700
            placeholder:text-slate-400
          "

        />

        {suffix && (

          <span className="text-slate-500">

            {suffix}

          </span>

        )}

      </div>

      {/* Footer */}

      {error ? (

        <p className="mt-2 text-xs text-red-500">

          {error}

        </p>

      ) : helperText ? (

        <p className="mt-2 text-xs text-slate-500">

          {helperText}

        </p>

      ) : null}

    </div>

  );

}