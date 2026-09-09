"use client";
export default function PerformanceMetric({ label, title, value, hint }) {
  const text = typeof value === "string" ? value : Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "—";
  return <article className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label || title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{text}</p>{hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}</article>;
}
