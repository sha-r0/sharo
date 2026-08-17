"use client";

export default function FormSection({
  title,
  subtitle,
  children,
}) {
  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-4 sm:p-5 lg:p-6">

      <div className="mb-4 sm:mb-5">

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

    </section>
  );
}
