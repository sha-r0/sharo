"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banknote as BanknoteIndianRupee, CalendarCheck, Clock3, LogIn, LogOut, LocateFixed, Timer, Umbrella, UserCheck, Users, UserX } from "lucide-react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { EmptyState, SectionCard, StatCard, neo } from "../dashboard/DashboardWidgets";
import WorkforceHeader from "./components/WorkforceHeader";
import { employeeName, subscribeWorkforce, workforceMetrics } from "./services/WorkforceRealtimeService";
import { attendanceSource, formatAttendanceTime } from "./services/attendanceDateTime";
import { can as hasAccess } from "@/app/allservice/rbac/AuthorizationService";

const time = (value) => formatAttendanceTime(value).replace("--:--", "—");
const statusTone = (value) => String(value).toLowerCase() === "approved" || String(value).toLowerCase() === "present" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
export default function WorkforceDashboardPage() {
  const { company, access, isOwner } = useAuth();
  const [data, setData] = useState({}), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const allowedNames = useMemo(() => new Set([
    hasAccess(access, "employee.view") && "Usermanagement",
    hasAccess(access, "attendance.view") && "Attendance",
    hasAccess(access, "gps.view") && "GPSPunches",
    hasAccess(access, "leave.view") && "LeaveRequests",
    hasAccess(access, "projects.view") && "WorkLogs",
    "ShiftPolicies",
    "Holidays",
    (isOwner || hasAccess(access, "advance.approve") || hasAccess(access, "advance.manage")) && "advance_requests",
    hasAccess(access, "payroll.view") && "Payroll",
  ].filter(Boolean)), [access, isOwner]);
  const allowedSignature = [...allowedNames].sort().join("|");
  useEffect(() => { if (!company?.id) return; return subscribeWorkforce(company.id, allowedNames, (next) => { setData(next); setLoading(false); }, (name) => setError(`Realtime ${name} data is unavailable.`)); }, [company?.id, allowedSignature]);
  const metrics = useMemo(() => workforceMetrics(data), [data]);
  if (loading) return <div className="space-y-4 p-5">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-white/70"/>)}</div>;
  const cards = [["Total Employees",metrics.summary.total,Users,"blue"],["Present",metrics.summary.present,UserCheck,"green"],["Absent",metrics.summary.absent,UserX,"red"],["Half Day",metrics.summary.halfDay,Timer,"amber"],["Late",metrics.summary.late,Clock3,"amber"],["On Leave",metrics.summary.leave,Umbrella,"violet"],["Checked In",metrics.summary.checkedIn,LogIn,"cyan"],["Checked Out",metrics.summary.checkedOut,LogOut,"blue"],["Working Now",metrics.summary.working,CalendarCheck,"green"],["GPS Review",metrics.summary.gpsReview,LocateFixed,"red"]];
  const attendance = metrics.todayAttendance.slice(0, 6), leaves = (data.LeaveRequests || []).filter((item) => String(item.status || "pending").toLowerCase() === "pending").slice(0, 6), logs = metrics.todayLogs.slice(0, 6);
  return <div className="space-y-6 px-2 sm:px-5"><WorkforceHeader/>{error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-700">{error}</div>}<section className="grid grid-cols-2 gap-3 md:grid-cols-5">{cards.map(([title,value,Icon,tone]) => <StatCard key={title} title={title} value={value} icon={Icon} tone={tone}/>)}</section><div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3"><SectionCard title="Today's Attendance" subtitle="Finalized daily attendance" action={<Link href="/manager/Workforce/attendance" className="text-xs font-bold text-blue-600">View all</Link>}>{attendance.length ? <List items={attendance} title={employeeName} detail={(item) => `In ${time(item.checkIn)} • Out ${time(item.checkOut)} • ${attendanceSource(item)}`} status={(item) => item.status || "—"}/> : <EmptyState compact label="No attendance today"/>}</SectionCard><SectionCard title="Pending Leave Requests" subtitle="Manager approval queue" action={<Link href="/manager/Workforce/leave-policy" className="text-xs font-bold text-blue-600">View all</Link>}>{leaves.length ? <List items={leaves} title={employeeName} detail={(item) => item.leaveType || item.reason || "Leave request"} status={() => "Pending"}/> : <EmptyState compact label="No pending leave requests"/>}</SectionCard><SectionCard title="Live Work Logs" subtitle="Employees working today" action={<Link href="/manager/projects" className="text-xs font-bold text-blue-600">View all</Link>}>{logs.length ? <List items={logs} title={employeeName} detail={(item) => item.projectName || item.taskName || "Work log"} status={(item) => item.endTime ? "Completed" : "Working"}/> : <EmptyState compact label="No work logs today"/>}</SectionCard><SectionCard title="Workforce Tools" subtitle="Policies, tracking and payroll" className="lg:col-span-2 xl:col-span-3"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{[["Attendance","/manager/Workforce/attendance",CalendarCheck],["GPS Tracking","/manager/Workforce/gps-approval",LocateFixed],["Leave Policy","/manager/Workforce/leave-policy",Umbrella],["Shift Policy","/manager/Workforce/shift-policy",Clock3],["Generate Payroll","/manager/Workforce/payroll",BanknoteIndianRupee]].map(([label,href,Icon]) => <Link key={label} href={href} className={`${neo} flex items-center gap-3 rounded-2xl p-4 font-bold text-slate-700 hover:text-blue-600`}><Icon size={19}/>{label}</Link>)}</div></SectionCard></div></div>;
}
function List({ items, title, detail, status }) { return <div className="space-y-2">{items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 font-bold text-blue-600">{title(item).charAt(0)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{title(item)}</strong><span className="block truncate text-xs text-slate-400">{detail(item)}</span></span><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${statusTone(status(item))}`}>{status(item)}</span></div>)}</div>; }
