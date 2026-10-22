"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, BanknoteArrowDown, Cake, CalendarDays, Clock3, FolderKanban,
  LocateFixed, PartyPopper, ReceiptIndianRupee, RefreshCw, Search, UserCheck,
  XCircle, Sun, TrendingUp, IndianRupee, CircleDollarSign, HandCoins
} from "lucide-react";
import useDashboardData from "./useDashboardData";
import { canReadEmployeeDirectory } from "@/app/allservice/employee/employeeDirectory";
import { asDate, buildDashboardMetrics, getRange } from "./dashboardMetrics";
import DashboardSkeleton from "./DashboardSkeleton";
import PendingLeaveCard from "./PendingLeaveCard";
import GpsPunchesCard from "./GpsPunchesCard";
import { EmptyState, SectionCard, StatCard, neo } from "./DashboardWidgets";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import NeedsAttentionCard from "./NeedsAttentionCard";
import SiteWorkforceCard from "./SiteWorkforceCard";
import QuickActionsCard from "./QuickActionsCard";
import ProjectHealthCard from "./ProjectHealthCard";
import ReceivablesPayablesCard from "./ReceivablesPayablesCard";

const topCards = [
  [
    "Total Employees",
    "totalEmployees",
    UserCheck,
    "blue",
    null,
    "employee.view",
  ],

  [
    "Expenses",
    "expense",
    ReceiptIndianRupee,
    "green",
    "currency",
    "expense.view",
  ],

  [
    "Active Projects",
    "activeProjects",
    FolderKanban,
    "violet",
    null,
    "projects.view",
  ],

  [
    "Profit / Loss",
    "yearProfitLoss",
    TrendingUp,
    "amber",
    "currency",
    null,
  ],

  [
    "Total Billing",
    "yearBilling",
    IndianRupee,
    "blue",
    "currency",
    null,
  ],
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
  const { access, can, companyEmployee, currentUser, company } = useAuth();
  const [preset, setPreset] = useState("today");
  const [range, setRange] = useState(getRange("today"));
  const [search, setSearch] = useState("");
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef(null);
  const { data, loading, refreshing, error, refresh } = useDashboardData(companyId, access, companyEmployee);
  const metrics = useMemo(() => buildDashboardMetrics(data, range), [data, range]);
  const visibleTopCards = topCards.filter((item) => can(item[5]));
  const [showCustomRange, setShowCustomRange] = useState(false)

  const searchResults = useMemo(() => {
    const text = search.trim().toLowerCase();
    if (!text) return [];
    return [
      ...(canReadEmployeeDirectory(access) ? data.employees.map((item) => ({ id: `employee-${item.id}`, label: nameOf(item), detail: item.department || item.employment?.department || "Employee", href: `/manager/userManagement/${item.id}` })) : []),
      ...(can("projects.view") ? data.projects.map((item) => ({ id: `project-${item.id}`, label: item.projectName || "Project", detail: item.clientName || "Project", href: `/manager/projects/${item.id}` })) : []),
      ...(can("clients.view") ? data.clients.map((item) => ({ id: `client-${item.id}`, label: item.clientName || item.name || "Client", detail: "Client", href: "/manager/clients" })) : []),
    ].filter((item) => `${item.label} ${item.detail}`.toLowerCase().includes(text)).slice(0, 8);
  }, [access, data, search]);

  const hour = new Date().getHours();

  const greeting =
    hour < 12
      ? "Good Morning"
      : hour < 17
        ? "Good Afternoon"
        : "Good Evening";

  const ownerName =
    currentUser?.name ||
    currentUser?.displayName ||
    "Owner";

  const firstName =
    ownerName.split(" ")[0];

  const workspaceActive =
    String(company?.serviceStatus || "active")
      .toLowerCase() === "active";

  const selectPreset = (value) => { setPreset(value); setRange(getRange(value)); };
  if (loading) return <DashboardSkeleton />;

  return <div className="space-y-6 px-2 py-2  lg:px-3" onTouchStart={(event) => { if ((event.currentTarget.parentElement?.scrollTop || 0) <= 0) touchStart.current = event.touches[0].clientY; }} onTouchMove={(event) => { if (touchStart.current !== null) setPullDistance(Math.min(90, Math.max(0, (event.touches[0].clientY - touchStart.current) * 0.45))); }} onTouchEnd={() => { if (pullDistance >= 55) refresh(); touchStart.current = null; setPullDistance(0); }}>
    <div className="overflow-hidden text-center text-xs font-semibold text-blue-600 transition-all duration-200 sm:hidden" style={{ height: pullDistance }} aria-hidden={!pullDistance}><RefreshCw size={16} className={`mx-auto mb-1 ${pullDistance >= 55 ? "rotate-180" : ""}`} />{pullDistance >= 55 ? "Release to refresh" : "Pull to refresh"}</div>

    <header
      className={`${neo} relative z-20 rounded-3xl bg-white px-5 py-4 sm:px-6`}
    >
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

        {/* LEFT */}
        <div className="flex items-start gap-3">
          <div
            className="
          mt-0.5
          grid
          h-10
          w-10
          shrink-0
          place-items-center
          rounded-xl
          bg-amber-50
          text-amber-500
        "
          >
            <Sun size={24} />
          </div>

          <div>
            <h1
              className="
            text-xl
            font-bold
            tracking-tight
            text-slate-800
            sm:text-2xl
          "
            >
              {greeting}, {firstName}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Here&apos;s what&apos;s happening at{" "}
              <span className="font-medium">
                {companyName || "your company"}
              </span>{" "}
              today.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div
          className="
        flex
        flex-col
        gap-3
        sm:flex-row
        sm:items-center
      "
        >

          {/* STATUS */}
          <div
            className="
          hidden
          items-center
          gap-2
          px-3
          text-sm
          font-medium
          lg:flex
        "
          >
            <span
              className={`
            h-2
            w-2
            rounded-full
            ${workspaceActive
                  ? "bg-emerald-500"
                  : "bg-red-500"
                }
          `}
            />

            <span
              className={
                workspaceActive
                  ? "text-emerald-600"
                  : "text-red-600"
              }
            >
              {workspaceActive
                ? "Workspace active"
                : "Workspace unavailable"}
            </span>
          </div>

          {/* PERIOD SELECTOR */}
          <div
            className="
          flex
          items-center
          rounded-xl
          border
          border-slate-200
          bg-slate-50
          p-1
        "
          >
            {[
              ["today", "Today"],
              ["week", "This Week"],
              ["month", "This Month"],
              ["year", "This Year"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => {
                  selectPreset(value);
                  setShowCustomRange(false);
                }}
                className={`
              rounded-lg
              px-4
              py-2
              text-sm
              font-semibold
              transition
              ${preset === value
                    ? `
                    bg-white
                    text-slate-800
                    shadow-sm
                    ring-1
                    ring-slate-200
                  `
                    : `
                    text-slate-500
                    hover:text-slate-800
                  `
                  }
            `}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CUSTOM DATE */}
          <div className="relative">
            <button
              onClick={() =>
                setShowCustomRange((current) => !current)
              }
              aria-label="Choose custom date range"
              className={`
            grid
            h-11
            w-11
            place-items-center
            rounded-xl
            border
            transition
            ${preset === "custom"
                  ? `
                  border-blue-200
                  bg-blue-50
                  text-blue-600
                `
                  : `
                  border-slate-200
                  bg-white
                  text-slate-500
                  hover:bg-slate-50
                `
                }
          `}
            >
              <CalendarDays size={18} />
            </button>

            {showCustomRange && (
              <div
                className="
              absolute
              right-0
              top-14
              z-50
              w-72
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-xl
            "
              >
                <p
                  className="
                mb-3
                text-sm
                font-bold
                text-slate-800
              "
                >
                  Custom date range
                </p>

                <div className="space-y-3">
                  <label
                    className="
                  block
                  text-xs
                  font-semibold
                  text-slate-500
                "
                  >
                    From

                    <input
                      type="date"
                      value={range.start}
                      onChange={(event) => {
                        setPreset("custom");

                        setRange((current) => ({
                          ...current,
                          start: event.target.value,
                        }));
                      }}
                      className="
                    mt-1
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    text-sm
                    text-slate-700
                    outline-none
                    focus:border-blue-400
                    focus:ring-4
                    focus:ring-blue-50
                  "
                    />
                  </label>

                  <label
                    className="
                  block
                  text-xs
                  font-semibold
                  text-slate-500
                "
                  >
                    To

                    <input
                      type="date"
                      value={range.end}
                      min={range.start}
                      onChange={(event) => {
                        setPreset("custom");

                        setRange((current) => ({
                          ...current,
                          end: event.target.value,
                        }));
                      }}
                      className="
                    mt-1
                    h-10
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    text-sm
                    text-slate-700
                    outline-none
                    focus:border-blue-400
                    focus:ring-4
                    focus:ring-blue-50
                  "
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {error && <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button onClick={refresh} className="font-bold">Retry</button></div>}

    <section
      className="
    grid
    grid-cols-1
    gap-3
    sm:grid-cols-2
    lg:grid-cols-3
    xl:grid-cols-6
  "
    >
      {/* TOTAL EMPLOYEES */}
      {can("employee.view") && (
        <StatCard
          title="Total Employees"
          value={metrics.summary.totalEmployees}
          icon={UserCheck}
          tone="blue"
          statusText="Active"
          footerItems={[
            {
              value: metrics.summary.present,
              label: "Present",
            },
            {
              value: metrics.summary.absent,
              label: "Absent",
            },
            {
              value: metrics.summary.onLeave,
              label: "Leave",
            },
          ]}
        />
      )}

      {/* EXPENSES */}
      {can("expense.view") && (
        <StatCard
          title="Expenses"
          value={metrics.summary.expense}
          icon={ReceiptIndianRupee}
          tone="green"
          format="currency"
          footerItems={[
            {
              value:
                metrics.summary.pendingExpenses,
              label: "Pending",
            },
          ]}
        />
      )}

      <StatCard
        title="Received"
        value={metrics.summary.receivedAmount}
        icon={CircleDollarSign}
        tone="blue"
        format="currency"
        footerItems={[
          {
            value: "MTD",
            label: "Received",
          },
        ]}
      />

      <StatCard
        title="Vendor Payments"
        value={metrics.summary.vendorPayments}
        icon={HandCoins}
        tone="amber"
        format="currency"
        footerItems={[
          {
            value: "MTD",
            label: "Paid",
          },
        ]}
      />

      {/* PROFIT / LOSS */}
      <StatCard
        title="Profit / Loss"
        value={metrics.summary.yearProfitLoss}
        icon={TrendingUp}
        tone="amber"
        format="currency"
        footerItems={[
          {
            value: "FY",
            label: "Current Year",
          },
        ]}
      />

      {/* TOTAL BILLING */}
      {(can("billing.view") ||
        access?.isOwner) && (
          <StatCard
            title="Total Billing"
            value={metrics.summary.yearBilling}
            icon={IndianRupee}
            tone="blue"
            format="currency"
            footerItems={[
              {
                value: "FY",
                label: "Current Year",
              },
            ]}
          />
        )}
    </section>



    {/* {canReadEmployeeDirectory(access) && <SectionCard title="Company Employees" subtitle="Active employees — read only">
      <div className="max-h-80 overflow-y-auto"><RecordList items={data.employees.filter((item) => `${nameOf(item)} ${item.employeeId}`.toLowerCase().includes(search.toLowerCase()))} empty="No active employees found" render={(item) => <><RecordIcon icon={UserCheck} tone="blue" /><MainText title={nameOf(item)} subtitle={`${item.employeeId} • ${item.department || "Employee"}`} /></>} /></div>
    </SectionCard>} */}

    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <NeedsAttentionCard metrics={metrics} />
      <SiteWorkforceCard
        assigned={11}
        checkedIn={7}
        notReached={3}
        late={1}
        notReachedEmployees={[
          {
            employeeName: "Noor Alam",
            siteName: "Demo Site",
          },
          {
            employeeName: "Rahul Kumar",
            siteName: "Tower Foundation",
          },
          {
            employeeName: "Amit Singh",
            siteName: "Delhi Signage",
          },
        ]}
      />
      <QuickActionsCard />
      <ProjectHealthCard
        projects={data.projects}
      />
      <ReceivablesPayablesCard
        receivables={[
          {
            id: "r1",
            clientName: "ABC Infra",
            invoiceNumber: "INV-001",
            amount: 120000,
          },
          {
            id: "r2",
            clientName: "XYZ Media",
            invoiceNumber: "INV-002",
            amount: 85000,
          },
          {
            id: "r3",
            clientName: "DEF Limited",
            invoiceNumber: "INV-004",
            amount: 50000,
          },
        ]}
        payables={[
          {
            id: "p1",
            vendorName: "Steel Vendor",
            billNumber: "BILL-101",
            amount: 70000,
          },
          {
            id: "p2",
            vendorName: "Fabricator",
            billNumber: "BILL-104",
            amount: 45000,
          },
          {
            id: "p3",
            vendorName: "Transport Vendor",
            billNumber: "BILL-108",
            amount: 25000,
          },
        ]}
      />
      <SectionCard title="Recent Activity" subtitle="Latest activity across ERP"><RecordList items={metrics.activities.slice(0, 5)} empty="No recent activity" render={(item) => <><span className="h-3 w-3 shrink-0 rounded-full bg-blue-600 ring-4 ring-blue-50" /><MainText title={item.title} subtitle={item.subtitle} /><span className="shrink-0 text-xs text-slate-400">{item.date?.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) || "Recent"}</span></>} /></SectionCard>
      {/* <GpsPunchesCard companyId={companyId} normalItems={metrics.todayGpsPunches} renderNormal={(items) => <RecordList items={items} empty="No GPS punches today" href={() => "/manager/Workforce/gps-approval"} render={(item) => <><RecordIcon icon={LocateFixed} tone="cyan" /><MainText title={nameOf(item)} subtitle={`In ${shortTime(item.checkIn)} • Out ${shortTime(item.checkOut)}`} /><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.gpsValid ? "valid" : "invalid")}`}>{item.gpsValid ? "Valid" : "Review"}</span></>} />} />
      <PendingLeaveCard items={metrics.pendingLeaves} renderRecord={(item) => <><RecordIcon icon={CalendarDays} tone="amber" /><MainText title={nameOf(item)} subtitle={item.leaveType || item.reason || `${shortDate(item)} leave`} /><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Pending</span></>} />
      <SectionCard title="Recent Work Logs" subtitle="Latest employee work updates"><RecordList items={metrics.recentWorkLogs} empty="No recent work logs" render={(item) => <><RecordIcon icon={Clock3} tone="blue" /><MainText title={item.projectName || item.taskName || "Work log"} subtitle={`${nameOf(item)} • ${Number(item.totalHours || item.hours || 0).toFixed(1)}h`} /><span className="text-xs text-slate-400">{shortDate(item)}</span></>} /></SectionCard>
      <SectionCard title="Recent Expenses" subtitle="Latest submitted expenses"><RecordList items={metrics.recentExpenses} empty="No recent expenses" render={(item) => <><RecordIcon icon={ReceiptIndianRupee} tone="violet" /><MainText title={item.category || item.description || "Expense"} subtitle={`${nameOf(item)} • ${shortDate(item)}`} /><strong className="shrink-0 text-sm text-slate-800">{currency(item.amount)}</strong></>} /></SectionCard>
      <SectionCard title="Daily Attendance" subtitle="Today's latest attendance"><RecordList items={metrics.dailyAttendance} empty="No attendance recorded today" render={(item) => <><RecordIcon icon={UserCheck} tone="green" /><MainText title={nameOf(item)} subtitle={`Check in ${shortTime(item.checkIn)}`} /><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status || (item.checkIn ? "present" : "absent"))}`}>{item.status || (item.checkIn ? "Present" : "Absent")}</span></>} /></SectionCard>

      <SectionCard title="Pending Advances" subtitle="Requests awaiting approval"><RecordList items={metrics.pendingAdvances} empty="No pending advance requests" href={() => "/manager/advance"} render={(item) => <><RecordIcon icon={BanknoteArrowDown} tone="amber" /><MainText title={nameOf(item)} subtitle={item.category || item.reason || shortDate(item)} /><strong className="shrink-0 text-sm text-slate-800">{currency(item.amount)}</strong></>} /></SectionCard>

      <SectionCard title="Recent Projects" subtitle="Latest project updates"><RecordList items={metrics.project.recent} empty="No recent projects" href={(item) => `/manager/projects/${item.id}`} render={(item) => <><RecordIcon icon={FolderKanban} tone="blue" /><MainText title={item.projectName || "Unnamed project"} subtitle={item.clientName || `${Number(item.progress || 0)}% complete`} /><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status)}`}>{item.status || "Pending"}</span></>} /></SectionCard> */}
      <SectionCard title="Employee Occasions" subtitle="Birthdays and work anniversaries"><RecordList items={metrics.employeeOccasions} empty="No upcoming employee occasions" href={(item) => `/manager/userManagement/${String(item.id).replace(/^(birthday|anniversary)-/, "")}`} render={(item) => <><RecordIcon icon={item.type === "birthday" ? Cake : PartyPopper} tone={item.type === "birthday" ? "violet" : "green"} /><MainText title={item.title} subtitle={item.subtitle} /><span className="shrink-0 text-xs font-bold text-slate-500">{item.date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span></>} /></SectionCard>
    </div>
  </div>;
}
