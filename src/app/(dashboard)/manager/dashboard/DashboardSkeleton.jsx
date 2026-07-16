const blocks = Array.from({ length: 8 });

export default function DashboardSkeleton() {
  return <div className="animate-pulse space-y-6 px-2 py-2 sm:px-4 lg:px-6" aria-label="Loading dashboard">
    <div className="h-28 rounded-3xl bg-white/70" />
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">{blocks.map((_, index) => <div key={index} className="h-28 rounded-3xl bg-white/70" />)}</div>
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 11 }, (_, index) => <div key={index} className="h-80 rounded-3xl bg-white/70"/>)}</div>
  </div>;
}
