"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import { EmptyState, SectionCard, neo } from "@/app/(dashboard)/manager/dashboard/DashboardWidgets";
import PerformanceMetric from "./PerformanceMetric";
import PerformanceService from "./services/PerformanceService";

const percent = (value) => `${Number(value || 0).toFixed(0)}%`;
const score = (value) => (Number.isFinite(value) ? `${Number(value).toFixed(0)}/100` : "—");
const trendColor = (value) => value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500";
const coverageTone = {
  good: "bg-emerald-50 text-emerald-700 border-emerald-100",
  partial: "bg-amber-50 text-amber-700 border-amber-100",
  insufficient: "bg-slate-100 text-slate-500 border-slate-200",
};
const dataLabel = {
  good: "Good data",
  partial: "Partial data",
  insufficient: "Insufficient data",
};

function currentDefaults() {
  const now = new Date();
  return {
    period: "month",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

function filterKey(filters) {
  return `${filters.period}:${filters.year}:${filters.month || ""}:${filters.quarter || ""}`;
}

function formatPeriod(filters) {
  if (filters.period === "quarter") return `Q${filters.quarter} ${filters.year}`;
  if (filters.period === "year") return String(filters.year);
  return new Date(filters.year, (filters.month || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function scoreLabel(row) {
  if (!row) return "Insufficient data";
  if (!row.rankingEligible) return "Insufficient data";
  return dataLabel[row.dataCoverage] || "Good data";
}

function leaderSummary(leader) {
  if (!leader) return "Insufficient data";
  return [
    `${percent(leader.attendancePercent)} attendance`,
    `${leader.completedWork} completed work`,
    `${leader.projectCount} projects`,
  ].join(" • ");
}

export default function PerformancePage() {
  const router = useRouter();
  const { firebaseUser, can } = useAuth();
  const [filters, setFilters] = useState(currentDefaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  useEffect(() => {
    if (!firebaseUser || !can("performance.view")) {
      setLoading(false);
      setData(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setData(null);
    setError(null);
    PerformanceService.getDashboard(firebaseUser, filters)
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Performance dashboard failed:", requestError);
        setError(requestError.message || "Unable to load performance dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [firebaseUser, can, filterKey(filters)]);

  const departments = useMemo(() => [...new Set((data?.rankings || []).map((row) => row.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [data]);

  const filteredRankings = useMemo(() => {
    const text = search.trim().toLowerCase();
    return (data?.rankings || []).filter((row) => {
      const matchesDepartment = department === "all" || row.department === department;
      const matchesSearch = !text || `${row.fullName} ${row.employeeId} ${row.department} ${row.designation}`.toLowerCase().includes(text);
      return matchesDepartment && matchesSearch;
    });
  }, [data, search, department]);

  const currentLeader = data?.leaders?.month || null;
  const quarterLeader = data?.leaders?.quarter || null;
  const yearLeader = data?.leaders?.year || null;
  const averageScore = data?.summary?.averageScore;
  const eligibleEmployees = data?.summary?.eligibleEmployees || 0;
  const totalEmployees = data?.summary?.totalEmployees || 0;
  const accessDenied = !can("performance.view");

  if (!loading && accessDenied) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">You do not have access to performance analytics.</div>;
  }

  const leaderCards = [
    { title: "Employee of the Month", leader: currentLeader, tone: "from-blue-600 to-indigo-600", accent: "Month" },
    { title: "Employee of the Quarter", leader: quarterLeader, tone: "from-violet-600 to-fuchsia-600", accent: "Quarter" },
    { title: "Employee of the Year", leader: yearLeader, tone: "from-amber-500 to-orange-500", accent: "Year" },
  ];

  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 lg:px-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-blue-600">
        <ArrowLeft size={17} />
        Back
      </button>

      <header className={`${neo} rounded-3xl bg-white p-5 sm:p-6`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Performance</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Employee Performance Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">Transparent recognition analytics based on attendance, punctuality, work execution and project participation.</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 p-2 text-xs font-semibold text-slate-600">
            <BarChart3 size={16} className="text-blue-600" />
            {formatPeriod(filters)}
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}
      {!can("performance.view") ? <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">You do not have access to performance analytics.</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {leaderCards.map(({ title, leader, tone, accent }) => (
          <article key={title} className={`${neo} overflow-hidden rounded-3xl bg-white`}>
            <div className={`h-2 bg-gradient-to-r ${tone}`} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{title}</p>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{leader?.fullName || "Insufficient data"}</h2>
                  <p className="mt-1 text-sm text-slate-500">{leader ? `${leader.employeeId || "—"} • ${leader.department || "No department"}` : "Based on SHARO performance metrics"}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{accent}</span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400">Score</p>
                  <p className="text-3xl font-black text-slate-900">{leader ? score(leader.overallScore) : "—"}</p>
                </div>
                {leader && <div className="min-w-0 text-right text-xs text-slate-500">{leader.designation || "—"}<br />{leader.trendChange !== null ? <span className={trendColor(leader.trendChange)}>{leader.trendChange > 0 ? "▲" : leader.trendChange < 0 ? "▼" : "■"} {leader.trendChange.toFixed(1)}</span> : "—"}</div>}
              </div>
              <p className="mt-3 text-xs font-semibold text-blue-600">Performance Leader · Current calendar {accent.toLowerCase()}</p><p className="mt-2 text-xs text-slate-500">{leaderSummary(leader)}</p>
            </div>
          </article>
        ))}

        <PerformanceMetric title="Average Team Score" value={averageScore} icon={Award} tone="blue" format="percent" hint={`${eligibleEmployees} eligible • ${totalEmployees} active`} />
      </section>

      <p className="text-sm text-slate-500">Informational recognition only; scores do not trigger HR or employment decisions. Weights: attendance 40, punctuality 20, completion rate 25, projects 15 (four-project cap). Ranking requires a known schedule, five eligible days and 80% attendance and structured work-log coverage.</p>
      <SectionCard title="Ranking filters" subtitle="Period, department and employee search">
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">
            Period
            <select
              value={filters.period}
              onChange={(event) => {
                const period = event.target.value;
                const now = new Date();
                setFilters({
                  period,
                  year: now.getFullYear(),
                  month: now.getMonth() + 1,
                  quarter: Math.floor(now.getMonth() / 3) + 1,
                });
              }}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </label>

          {filters.period === "month" && (
            <label className="text-xs font-bold text-slate-600">
              Month
              <input
                type="month"
                value={`${filters.year}-${String(filters.month).padStart(2, "0")}`}
                onChange={(event) => {
                  const [year, month] = event.target.value.split("-");
                  setFilters((current) => ({ ...current, year: Number(year), month: Number(month) }));
                }}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </label>
          )}

          {filters.period === "quarter" && (
            <>
              <label className="text-xs font-bold text-slate-600">
                Quarter
                <select
                  value={filters.quarter}
                  onChange={(event) => setFilters((current) => ({ ...current, quarter: Number(event.target.value) }))}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  {[1, 2, 3, 4].map((value) => <option key={value} value={value}>Q{value}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Year
                <input
                  type="number"
                  value={filters.year}
                  onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) || new Date().getFullYear() }))}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                />
              </label>
            </>
          )}

          {filters.period === "year" && (
            <label className="text-xs font-bold text-slate-600">
              Year
              <input
                type="number"
                value={filters.year}
                onChange={(event) => setFilters((current) => ({ ...current, year: Number(event.target.value) || new Date().getFullYear() }))}
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
              />
            </label>
          )}

          <label className="text-xs font-bold text-slate-600">
            Department
            <select value={department} onChange={(event) => setDepartment(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All departments</option>
              {departments.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600 lg:col-span-4">
            Search employee
            <div className="relative mt-2">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Employee name, ID, designation or department" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm" />
            </div>
          </label>
        </div>
      </SectionCard>

      <SectionCard title={`Employee ranking ${loading ? "· Loading..." : `· ${filters.period === "month" ? formatPeriod(filters) : formatPeriod(filters)}`}`} subtitle="Only active employees with sufficient data are ranked">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : filteredRankings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="p-4">Rank</th>
                  <th>Employee</th>
                  <th>Attendance</th>
                  <th>Punctuality</th>
                  <th>Work Execution</th>
                  <th>Projects</th>
                  <th>Overall Score</th>
                  <th>Data Quality</th>
                  <th>Trend</th>
                  <th className="pr-4 text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {filteredRankings.map((row, index) => {
                  const tone = row.rank === 1 ? "bg-amber-50" : row.rank === 2 ? "bg-slate-50" : row.rank === 3 ? "bg-orange-50" : "";
                  return (
                    <tr key={row.employeeFirestoreId || row.employeeId || index} className={`border-b last:border-0 ${tone}`}>
                      <td className="p-4 font-black text-slate-700">{row.rankingEligible ? row.rank : "—"}</td>
                      <td className="p-4">
                        <button onClick={() => router.push(`/manager/performance/${encodeURIComponent(row.employeeFirestoreId)}?${new URLSearchParams({period: filters.period, year: filters.year, month: filters.month, quarter: filters.quarter})}`)} className="text-left">
                          <strong className="block text-sm font-bold text-slate-900">{row.fullName}</strong>
                          <span className="block text-xs text-slate-400">{row.employeeId || "—"} • {row.department || "No department"}</span>
                        </button>
                      </td>
                      <td className="p-4">{Number.isFinite(row.attendancePercent) ? percent(row.attendancePercent) : "—"}</td>
                      <td className="p-4">{Number.isFinite(row.punctualityScore) ? percent(row.punctualityScore) : "—"}</td>
                      <td className="p-4">{Number.isFinite(row.workExecutionScore) ? percent(row.workExecutionScore) : "—"}</td>
                      <td className="p-4">{Number.isFinite(row.projectParticipationScore) ? percent(row.projectParticipationScore) : "—"}</td>
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                            <span>{row.rankingEligible ? score(row.overallScore) : "Insufficient data"}</span>
                            <span className="text-slate-400">{row.rankingEligible ? "Ranked" : "Unranked"}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, row.overallScore || 0))}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${coverageTone[row.dataCoverage] || coverageTone.partial}`}>{scoreLabel(row)}</span></td>
                      <td className="p-4">
                        {row.trendChange === null ? "—" : <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${row.trendChange > 0 ? "bg-emerald-50 text-emerald-700" : row.trendChange < 0 ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{row.trendChange > 0 ? <TrendingUp size={12} /> : row.trendChange < 0 ? <TrendingDown size={12} /> : null}{row.trendChange > 0 ? "+" : ""}{row.trendChange.toFixed(1)}</span>}
                      </td>
                      <td className="pr-4 text-right">
                        <button onClick={() => router.push(`/manager/performance/${encodeURIComponent(row.employeeFirestoreId)}?${new URLSearchParams({period: filters.period, year: filters.year, month: filters.month, quarter: filters.quarter})}`)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState label="No performance data found" />
        )}
      </SectionCard>
    </div>
  );
}
