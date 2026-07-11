"use client";

export default function FormSelect({
  label,
  children,
  value,
  required = false,
  className = "",
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="mb-2 block text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="text-red-500 ml-1">*</span>
          )}
        </label>
      )}

      <select
        {...props}
        value={value ?? ""}
        className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}