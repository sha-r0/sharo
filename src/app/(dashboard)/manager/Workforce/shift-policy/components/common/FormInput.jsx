"use client";

export default function FormInput({
  label,
  value,
  className = "",
  required = false,
  ...props
}) {
  const inputId = props.id || props.name;
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
          {required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      <input
        {...props}
        id={inputId}
        value={value ?? ""}
        className={`h-12 w-full rounded-[10px] border border-slate-300 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 ${className}`}
      />
    </div>
  );
}
