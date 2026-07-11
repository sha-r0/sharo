"use client";

export default function FormSwitch({
  label,
  checked,
  onChange,
}) {
  return (
    <label className="flex items-center gap-3">

      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4"
      />

      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

    </label>
  );
}