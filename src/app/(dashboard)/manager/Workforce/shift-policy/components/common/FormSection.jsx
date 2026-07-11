"use client";

export default function FormSection({
  title,
  subtitle,
  children,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">

      <div className="mb-6">

        <h2 className="text-lg font-bold text-slate-800">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}

      </div>

      {children}

    </div>
  );
}