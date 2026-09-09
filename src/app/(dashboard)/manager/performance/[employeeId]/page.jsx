"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, CalendarDays, TrendingDown, TrendingUp, Users } from "lucide-react";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import {
  EmptyState,
  LineChart,
  ProgressRow,
  SectionCard,
  neo,
} from "@/app/(dashboard)/manager/dashboard/DashboardWidgets";
import PerformanceMetric from "../PerformanceMetric";
import PerformanceService from "../services/PerformanceService";

function currentDefaults() {
  const now = new Date();
  return {
    period: "month",
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    quarter: Math.floor(now.getMonth() / 3) + 1,
  };
}

function formatPeriod(filters) {
  if (filters.period === "quarter") return `Q${filters.quarter} ${filters.year}`;
  if (filters.period === "year") return String(filters.year);
  return new Date(filters.year, (filters.month || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export default function PerformanceDetailPage() {
  const router = useRouter();
  const { employeeId } = useParams();
  const { firebaseUser, can } = useAuth();
  const [filters, setFilters] = useState(currentDefaults);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (["month", "quarter", "year"].includes(query.get("period"))) {
      setFilters(current => ({ ...current, period: query.get("period"), ...Object.fromEntries(["year", "month", "quarter"].filter(key => query.has(key)).map(key => [key, Number(query.get(key))])) }));
    }
  }, []);

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
    PerformanceService.getEmployee(firebaseUser, employeeId, filters)
      .then((payload) => {
        if (!active) return;
        setData(payload);
      })
      .catch((requestError) => {
        if (!active) return;
        console.error("Performance employee failed:", requestError);
        setError(requestError.message || "Unable to load employee performance.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [firebaseUser, can, employeeId, filters.period, filters.year, filters.month, filters.quarter]);

  const employee = data?.employee || null;
  const scoreBreakdown = useMemo(() => {
    const components = [
      { label: "Attendance", score: employee?.attendanceScore, max: 40, color: "bg-blue-600" },
      { label: "Punctuality", score: employee?.punctualityScore, max: 20, color: "bg-violet-600" },
      { label: "Work Execution", score: employee?.workExecutionScore, max: 25, color: "bg-emerald-600" },
      { label: "Project Participation", score: employee?.projectParticipationScore, max: 15, color: "bg-amber-600" },
    ];
    return components.map((metric) => {
      const weighted = Number.isFinite(metric.score) ? (metric.score / 100) * metric.max : null;
      return {
        ...metric,
        value: weighted,
        detail: weighted !== null ? `${weighted.toFixed(0)}/${metric.max}` : "—",
      };
    });
  }, [employee]);

  if (loading) {
    return (
      <div className="space-y-4 px-2 py-2 sm:px-4 lg:px-6">
        <div className="h-10 w-28 animate-pulse rounded-2xl bg-white/70" />
        <div className="h-44 animate-pulse rounded-3xl bg-white/70" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-3xl bg-white/70" />
          <div className="h-72 animate-pulse rounded-3xl bg-white/70" />
        </div>
      </div>
    );
  }

  if (!can("performance.view")) {
    return <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">You do not have access to performance analytics.</div>;
  }

  if (!employee) {
    return <div role="alert" className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">{error || "Employee performance data not found."}</div>;
  }

  return (
    <div className="space-y-6 px-2 py-2 sm:px-4 lg:px-6">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-blue-600">
        <ArrowLeft size={17} />
        Back
      </button>

      <header className={`${neo} rounded-3xl bg-white p-5 sm:p-6`}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Performance Detail</p>
            <h1 className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl">{employee.fullName}</h1>
            <p className="mt-1 text-sm text-slate-500">{employee.employeeId || "—"} • {employee.department || "No department"} • {employee.designation || "No designation"}</p>
            <p className="mt-2 text-sm text-slate-500">Based on SHARO performance metrics for {formatPeriod(filters)}.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <PerformanceMetric label="Overall Score" value={Number.isFinite(employee.overallScore) ? employee.overallScore : null} format="percent" tone="text-blue-600" />
            <PerformanceMetric label="Trend" value={Number.isFinite(employee.trendChange) ? employee.trendChange : null} format="number" tone={Number.isFinite(employee.trendChange) && employee.trendChange > 0 ? "text-emerald-600" : Number.isFinite(employee.trendChange) && employee.trendChange < 0 ? "text-rose-600" : "text-slate-700"} />
          </div>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

      <SectionCard title="Period" subtitle="Month, quarter or year">
        <div className="grid gap-3 md:grid-cols-4">
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

          <div className="flex items-end">
            <button type="button" onClick={() => setFilters(currentDefaults())} className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700">
              Reset period
            </button>
          </div>
        </div>
      </SectionCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PerformanceMetric title="Overall Score" value={Number.isFinite(employee.overallScore) ? employee.overallScore : null} icon={Award} tone="blue" format="percent" hint={employee.rankingEligible ? "Eligible for ranking" : "Insufficient performance data"} />
        <PerformanceMetric title="Present Days" value={employee.presentDays || 0} icon={CalendarDays} tone="green" hint={`${employee.eligibleWorkingDays || 0} eligible days`} />
        <PerformanceMetric title="Late Arrivals" value={employee.lateArrivals || 0} icon={TrendingDown} tone="amber" hint="Lower is better" />
        <PerformanceMetric title="Projects Participated" value={employee.projectCount || 0} icon={Users} tone="violet" hint={employee.dataCoverage === "insufficient" ? "Insufficient data" : "Distinct projects in period"} />
      </section>

      {!employee.rankingEligible && <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Insufficient performance data. {employee.coverageReason}</p>}
      <SectionCard title="Score breakdown" subtitle="Attendance 40 + on-time arrivals 20 + work completion rate 25 + distinct projects 15 (capped at four).">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            {scoreBreakdown.map((metric) => (
              <ProgressRow
                key={metric.label}
                label={metric.label}
                value={Number.isFinite(metric.value) ? metric.value : 0}
                max={metric.max}
                detail={metric.detail}
                color={metric.color}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <PerformanceMetric label="Eligible Working Days" value={employee.eligibleWorkingDays || 0} />
            <PerformanceMetric label="Approved Leave" value={employee.approvedLeave || 0} />
            <PerformanceMetric label="Completed Work" value={employee.completedWork || 0} />
            <PerformanceMetric label="Data Coverage" value={employee.dataCoverage} format="percent" tone={employee.dataCoverage === "good" ? "text-emerald-600" : employee.dataCoverage === "partial" ? "text-amber-600" : "text-slate-500"} />
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Attendance trend" subtitle={employee.currentPeriod || formatPeriod(filters)}>
          {employee.attendanceTrend?.length > 0 ? <LineChart data={employee.attendanceTrend} color="#2563eb" /> : <EmptyState label="No attendance trend data yet" compact />}
        </SectionCard>
        <SectionCard title="Performance trend" subtitle={employee.currentPeriod || formatPeriod(filters)}>
          {employee.performanceTrend?.length > 1 ? <LineChart data={employee.performanceTrend} color="#7c3aed" /> : <EmptyState label="Insufficient comparable performance data" compact />}
        </SectionCard>
      </div>

      <SectionCard title="Trend comparison" subtitle="Compared with the previous equivalent period">
        <div className="grid gap-3 md:grid-cols-4">
          <PerformanceMetric label="Current Score" value={Number.isFinite(employee.overallScore) ? employee.overallScore : null} format="percent" tone="text-blue-600" />
          <PerformanceMetric label="Previous Score" value={Number.isFinite(employee.previousScore) ? employee.previousScore : null} format="percent" />
          <PerformanceMetric label="Trend Change" value={Number.isFinite(employee.trendChange) ? employee.trendChange : null} tone={Number.isFinite(employee.trendChange) && employee.trendChange > 0 ? "text-emerald-600" : Number.isFinite(employee.trendChange) && employee.trendChange < 0 ? "text-rose-600" : "text-slate-700"} />
          <div className="rounded-2xl border border-slate-100 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">Trend</p>
            <p className="mt-2 text-xl font-bold text-slate-800">
              {Number.isFinite(employee.trendChange) ? (
                <span className={employee.trendChange > 0 ? "text-emerald-600" : employee.trendChange < 0 ? "text-rose-600" : "text-slate-700"}>
                  {employee.trendChange > 0 ? <TrendingUp size={15} className="mr-1 inline" /> : employee.trendChange < 0 ? <TrendingDown size={15} className="mr-1 inline" /> : null}
                  {employee.trendChange > 0 ? "+" : ""}{employee.trendChange.toFixed(1)}
                </span>
              ) : "—"}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
