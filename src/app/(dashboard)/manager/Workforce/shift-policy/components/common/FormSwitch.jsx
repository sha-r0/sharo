"use client";

export default function FormSwitch({
  label,
  checked,
  onChange,
  disabled = false,
}) {
  return (
    <label className="inline-flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 transition hover:border-indigo-200 hover:bg-indigo-50/40">

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 accent-indigo-600 focus:ring-2 focus:ring-indigo-200"
      />

      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

    </label>
  );
}
