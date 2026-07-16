"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, BanknoteArrowDown, Cake, CalendarDays, Clock3, FolderKanban,
  LocateFixed, PartyPopper, ReceiptIndianRupee, RefreshCw, Search, UserCheck,
  Users, XCircle,
} from "lucide-react";
import useDashboardData from "./useDashboardData";
import { asDate, buildDashboardMetrics, getRange } from "./dashboardMetrics";
import DashboardSkeleton from "./DashboardSkeleton";
import { EmptyState, SectionCard, StatCard, neo } from "./DashboardWidgets";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const topCards = [
  ["Total Employees", "employees", Users, "blue", null, "employee.view"],
  ["Present Today", "present", UserCheck, "green", null, "attendance.view"],
  ["Absent Today", "absent", XCircle, "red", null, "attendance.view"],
  ["On Leave Today", "onLeave", CalendarDays, "amber", null, "leave.view"],
  ["Running Projects", "running", FolderKanban, "blue", null, "projects.view"],
  ["Delayed Projects", "delayed", Clock3, "red", null, "projects.view"],
  ["Current Month Expense", "monthlyExpense", ReceiptIndianRupee, "violet", "currency", "expense.view"],
  ["Advance Approvals", "pendingAdvances", BanknoteArrowDown, "amber", null, "advance.view"],
];

const currency = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const nameOf = (item) => item.employeeName || item.fullName || item.name || item.personalInfo?.fullName || "Employee";
const dateOf = (item) => asDate(item.updatedAt || item.createdAt || item.appliedAt || item.date || item.checkIn || item.startTime);
const shortDate = (item) => dateOf(item)?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) || "Recent";
const shortTime = (value) => asDate(value)?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) || "--";
const statusClass = (status) => {
  const value = String(status || "pending").toLowerCase();
  if (["approved", "present", "completed", "valid"].includes(value)) return "bg-emerald-50 text-emerald-700";
  if (["rejected", "absent", "delayed", "invalid"].includes(value)) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
};

function RecordList({ items, empty, render, href }) {
  if (!items.length) return <EmptyState compact label={empty} />;
  return <div className="space-y-2">{items.map((item, index) => {
    const content = render(item);
    const className = "flex min-w-0 items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-blue-100 hover:shadow-sm";
    return href ? <Link key={item.id || index} href={href(item)} className={className}>{content}</Link> : <div key={item.id || index} className={className}>{content}</div>;
  })}</div>;
}

function RecordIcon({ icon: Icon, tone = "blue" }) {
  const tones = { blue: "bg-blue-50 text-blue-600", violet: "bg-violet-50 text-violet-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", cyan: "bg-cyan-50 text-cyan-600" };
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={18} /></span>;
}

function MainText({ title, subtitle }) {
  return <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-700">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{subtitle}</span></span>;
}

export default function ManagerDashboard({ companyId, companyName }) {
  const { access, can } = useAuth();
  const [preset, setPreset] = useState("month");
  const [range, setRange] = useState(getRange("month"));
  const [search, setSearch] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(null);
  const { data, loading, refreshing, error, refresh } = useDashboardData(companyId, access);
  const metrics = useMemo(() => buildDashboardMetrics(data, range), [data, range]);
  const visibleTopCards = topCards.filter((item) => can(item[5]));

  const searchResults = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return [];
    return [
      ...(can("employee.view") ? data.employees.map((item) => ({ id: `employee-${item.id}`, label: nameOf(item), detail: item.department || item.employment?.department || "Employee", href: `/manager/userManagement/${item.id}` })) : []),
      ...(can("projects.view") ? data.projects.map((item) => ({ id: `project-${item.id}`, label: item.projectName || "Project", detail: item.clientName || "Project", href: `/manager/projects/${item.id}` })) : []),
      ...(can("clients.view") ? data.clients.map((item) => ({ id: `client-${item.id}`, label: item.clientName || item.name || "Client", detail: "Client", href: "/manager/clients" })) : []),
    ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(text)).slice(0, 8);
  }, [access, data, search]);

  const selectPreset = (value) => { setPreset(value); setRange(getRange(value)); };
  if (loading) return <DashboardSkeleton />;

  return <div className="space-y-6 px-2 py-2 sm:px-4 lg:px-6" onTouchStart={(event) => { if ((event.currentTarget.parentElement?.scrollTop || 0) <= 0) touchStart.current = event.touches[0].clientY; }} onTouchMove={(event) => { if (touchStart.current !== null) setPullDistance(Math.min(90, Math.max(0, (event.touches[0].clientY - touchStart.current) * 0.45))); }} onTouchEnd={() => { if (pullDistance >= 55) refresh(); touchStart.current = null; setPullDistance(0); }}>
    <div className="overflow-hidden text-center text-xs font-semibold text-blue-600 transition-all duration-200 sm:hidden" style={{ height: pullDistance }} aria-hidden={!pullDistance}><RefreshCw size={16} className={`mx-auto mb-1 ${pullDistance >= 55 ? "rotate-180" : ""}`}/>{pullDistance >= 55 ? "Release to refresh" : "Pull to refresh"}</div>

    <header className={`${neo} relative z-20 rounded-3xl bg-white p-5 sm:p-6`}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-semibold capitalize text-blue-600">{String(access?.roleId || "manager").replaceAll("_", " ")} workspace</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">Good day{companyName ? `, ${companyName}` : ""}</h1><p className="mt-1 text-sm text-slate-500">Your authorized view of company operations.</p></div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 lg:w-80"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employees, projects, clients..." className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F9FAFC] pl-11 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50" />{search && <div className="absolute left-0 right-0 top-13 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-2xl">{searchResults.length ? searchResults.map((item) => <Link key={item.id} href={item.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-700">{item.label}</span><span className="block truncate text-xs text-slate-400">{item.detail}</span></span><span className="text-xs font-semibold text-blue-600">Open</span></Link>) : <p className="px-3 py-5 text-center text-sm text-slate-500">No matching records</p>}</div>}</div>
          <button onClick={refresh} disabled={refreshing} aria-label="Refresh dashboard" className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:text-blue-600 disabled:opacity-50"><RefreshCw size={18} className={refreshing ? "animate-spin" : ""}/></button>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1">{[["today","Today"],["week","This Week"],["month","This Month"],["year","This Year"]].map(([value,label]) => <button key={value} onClick={() => selectPreset(value)} className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${preset === value ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center"><label className="flex items-center gap-2 text-xs font-semibold text-slate-500">From<input type="date" value={range.start} onChange={(event) => { setPreset("custom"); setRange((current) => ({ ...current, start: event.target.value })); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"/></label><label className="flex items-center gap-2 text-xs font-semibold text-slate-500">To<input type="date" value={range.end} min={range.start} onChange={(event) => { setPreset("custom"); setRange((current) => ({ ...current, end: event.target.value })); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"/></label></div>
      </div>
    </header>

    {error && <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button onClick={refresh} className="font-bold">Retry</button></div>}

    <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{visibleTopCards.map(([title,key,Icon,tone,format]) => <StatCard key={key} title={title} value={metrics.summary[key]} icon={Icon} tone={tone} format={format}/>)}</section>

    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <SectionCard title="Recent Expenses" subtitle="Latest submitted expenses"><RecordList items={metrics.recentExpenses} empty="No recent expenses" render={(item) => <><RecordIcon icon={ReceiptIndianRupee} tone="violet"/><MainText title={item.category || item.description || "Expense"} subtitle={`${nameOf(item)} • ${shortDate(item)}`}/><strong className="shrink-0 text-sm text-slate-800">{currency(item.amount)}</strong></>}/></SectionCard>
      <SectionCard title="Recent Work Logs" subtitle="Latest employee work updates"><RecordList items={metrics.recentWorkLogs} empty="No recent work logs" render={(item) => <><RecordIcon icon={Clock3} tone="blue"/><MainText title={item.projectName || item.taskName || "Work log"} subtitle={`${nameOf(item)} • ${Number(item.totalHours || item.hours || 0).toFixed(1)}h`}/><span className="text-xs text-slate-400">{shortDate(item)}</span></>}/></SectionCard>
      <SectionCard title="Daily Attendance" subtitle="Today's latest attendance"><RecordList items={metrics.dailyAttendance} empty="No attendance recorded today" render={(item) => <><RecordIcon icon={UserCheck} tone="green"/><MainText title={nameOf(item)} subtitle={`Check in ${shortTime(item.checkIn)}`}/><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status || (item.checkIn ? "present" : "absent"))}`}>{item.status || (item.checkIn ? "Present" : "Absent")}</span></>}/></SectionCard>
      <SectionCard title="Pending Leave" subtitle="Requests awaiting approval"><RecordList items={metrics.pendingLeaves} empty="No pending leave requests" href={() => "/manager/Workforce"} render={(item) => <><RecordIcon icon={CalendarDays} tone="amber"/><MainText title={nameOf(item)} subtitle={item.leaveType || item.reason || `${shortDate(item)} leave`}/><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Pending</span></>}/></SectionCard>
      <SectionCard title="Pending Advances" subtitle="Requests awaiting approval"><RecordList items={metrics.pendingAdvances} empty="No pending advance requests" href={() => "/manager/advance"} render={(item) => <><RecordIcon icon={BanknoteArrowDown} tone="amber"/><MainText title={nameOf(item)} subtitle={item.category || item.reason || shortDate(item)}/><strong className="shrink-0 text-sm text-slate-800">{currency(item.amount)}</strong></>}/></SectionCard>
      <SectionCard title="Today's GPS Punches" subtitle="Latest employee locations"><RecordList items={metrics.todayGpsPunches} empty="No GPS punches today" href={() => "/manager/Workforce/gps-approval"} render={(item) => <><RecordIcon icon={LocateFixed} tone="cyan"/><MainText title={nameOf(item)} subtitle={`In ${shortTime(item.checkIn)} • Out ${shortTime(item.checkOut)}`}/><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.gpsValid ? "valid" : "invalid")}`}>{item.gpsValid ? "Valid" : "Review"}</span></>}/></SectionCard>
      <SectionCard title="Recent Projects" subtitle="Latest project updates"><RecordList items={metrics.project.recent} empty="No recent projects" href={(item) => `/manager/projects/${item.id}`} render={(item) => <><RecordIcon icon={FolderKanban} tone="blue"/><MainText title={item.projectName || "Unnamed project"} subtitle={item.clientName || `${Number(item.progress || 0)}% complete`}/><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status)}`}>{item.status || "Pending"}</span></>}/></SectionCard>
      <SectionCard title="Employee Occasions" subtitle="Birthdays and work anniversaries"><RecordList items={metrics.employeeOccasions} empty="No upcoming employee occasions" href={(item) => `/manager/userManagement/${String(item.id).replace(/^(birthday|anniversary)-/, "")}`} render={(item) => <><RecordIcon icon={item.type === "birthday" ? Cake : PartyPopper} tone={item.type === "birthday" ? "violet" : "green"}/><MainText title={item.title} subtitle={item.subtitle}/><span className="shrink-0 text-xs font-bold text-slate-500">{item.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span></>}/></SectionCard>
      <SectionCard title="Recent Activity" subtitle="Latest activity across ERP"><RecordList items={metrics.activities.slice(0, 5)} empty="No recent activity" render={(item) => <><span className="h-3 w-3 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-50"/><MainText title={item.title} subtitle={item.subtitle}/><span className="shrink-0 text-xs text-slate-400">{item.date?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) || "Recent"}</span></>}/></SectionCard>
    </div>
  </div>;
}
