export default function ExpenseSkeleton() {
  return <div role="status" aria-label="Loading expenses" className="space-y-6 motion-safe:animate-pulse">
    <span className="sr-only">Loading expenses…</span>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-16 rounded-2xl bg-slate-100" />)}</div>
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="h-36 rounded-3xl border border-slate-100 bg-slate-50 p-6"><div className="h-4 w-24 rounded bg-slate-200" /><div className="mt-6 h-7 w-32 rounded bg-slate-200" /></div>)}</div>
    <div className="space-y-3">{Array.from({ length: 8 }, (_, i) => <div key={i} className="grid h-28 grid-cols-3 gap-6 rounded-2xl border border-slate-100 p-4 lg:grid-cols-9"><div className="h-4 rounded bg-slate-200" /><div className="col-span-2 space-y-3"><div className="h-4 w-3/4 rounded bg-slate-200" /><div className="h-3 w-1/2 rounded bg-slate-100" /></div>{Array.from({ length: 7 }, (_, j) => <div key={j} className="hidden h-5 rounded bg-slate-100 lg:block" />)}</div>)}</div>
  </div>;
}
