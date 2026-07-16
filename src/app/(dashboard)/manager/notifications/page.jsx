"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Bell, CheckCheck, Eye, Megaphone, Search } from "lucide-react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { useNotifications } from "@/app/allservice/notification/NotificationContext";
import useNotificationFilters from "@/app/allservice/notification/useNotificationFilters";
import { groupNotifications } from "@/app/allservice/notification/notificationUtilities";
import NotificationItem from "./components/NotificationItem";
import AnnouncementDialog from "./components/AnnouncementDialog";

const filters = [["all","All"],["unread","Unread"],["attendance","Attendance"],["leave","Leave"],["advance","Advance"],["expense","Expense"],["project","Projects"],["gps","GPS"],["quotation","Quotation"],["inventory","Inventory"],["announcement","Announcements"]];
const neo = "border border-white/80 bg-[#F9FAFC] shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function NotificationsPage() {
  const router = useRouter();
  const { currentUser } = useAuth();
  const { notifications, unreadCount, loading, loadingMore, hasMore, error, loadMore, markRead, markAllRead, togglePinned, archive, remove } = useNotifications();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [announcement, setAnnouncement] = useState(false);
  const filtered = useNotificationFilters(notifications, { search, filter });
  const groups = useMemo(() => groupNotifications(filtered), [filtered]);
  const role = String(currentUser?.role || currentUser?.employment?.role || "").toLowerCase();
  const canManage = ["manager", "admin", "owner"].includes(role);
  const analytics = useMemo(() => {
    const modules = notifications.reduce((result, item) => { result[item.module] = (result[item.module] || 0) + 1; return result; }, {});
    const senders = notifications.reduce((result, item) => { const name = item.sender?.name || item.metadata?.employeeName; if (name) result[name] = (result[name] || 0) + 1; return result; }, {});
    const topModules = Object.entries(modules).sort((a,b) => b[1] - a[1]).slice(0,5);
    const topSenders = Object.entries(senders).sort((a,b) => b[1] - a[1]).slice(0,5);
    return { read: notifications.length - unreadCount, unread: unreadCount, rate: notifications.length ? (notifications.length - unreadCount) / notifications.length * 100 : 0, topModules, topSenders };
  }, [notifications, unreadCount]);
  const openItem = async (item) => { if (!item.userState?.isRead) await markRead(item); router.push(item.actionRoute || "/manager/notifications"); };

  return <div className="space-y-6 px-2 py-2 sm:px-4 lg:px-6">
    <header className={`${neo} rounded-3xl bg-white p-5 sm:p-6`}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-4"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><Bell size={23}/></span><div><h1 className="text-2xl font-bold text-slate-800 sm:text-3xl">Notifications</h1><p className="mt-1 text-sm text-slate-500">Your company activity and approvals in one place</p></div></div><div className="flex flex-wrap gap-2">{unreadCount > 0 && <button onClick={markAllRead} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><CheckCheck size={17}/>Mark all read</button>}{canManage && <button onClick={() => setAnnouncement(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-200"><Megaphone size={17}/>Create announcement</button>}</div></div>
      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row"><div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search employee, project, notification text or module..." className="h-11 w-full rounded-xl border border-slate-200 bg-[#F9FAFC] pl-11 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"/></div><div className="flex max-w-full gap-2 overflow-x-auto pb-1">{filters.map(([value,label]) => <button key={value} onClick={() => setFilter(value)} className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-bold transition ${filter === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div></div>
    </header>

    {canManage && <section className="grid gap-4 sm:grid-cols-3"><div className={`${neo} rounded-3xl p-5`}><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unread</p><p className="mt-2 text-3xl font-bold text-blue-600">{analytics.unread}</p></div><div className={`${neo} rounded-3xl p-5`}><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Read</p><p className="mt-2 text-3xl font-bold text-emerald-600">{analytics.read}</p></div><div className={`${neo} rounded-3xl p-5`}><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Read rate</p><p className="mt-2 text-3xl font-bold text-violet-600">{analytics.rate.toFixed(0)}%</p></div></section>}

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <main className={`${neo} min-w-0 rounded-3xl p-4 sm:p-6`}>{loading ? <div className="space-y-3">{Array.from({length:7},(_,index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100"/>)}</div> : error && !notifications.length ? <div className="grid min-h-72 place-items-center text-center"><div><Bell className="mx-auto text-red-300" size={34}/><p className="mt-3 font-bold text-red-600">{error}</p><p className="mt-1 text-sm text-slate-500">Check Firestore access and try again.</p></div></div> : filtered.length ? <div className="space-y-7">{Object.entries(groups).map(([label,items]) => items.length ? <section key={label}><h2 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</h2><div className="space-y-2">{items.map((item) => <NotificationItem key={item.id} item={item} onOpen={openItem} onPin={togglePinned} onArchive={archive} onDelete={remove}/>)}</div></section> : null)}{hasMore && <button onClick={loadMore} disabled={loadingMore} className="mx-auto block rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-blue-600 disabled:opacity-50">{loadingMore ? "Loading..." : "Load older notifications"}</button>}</div> : <div className="grid min-h-72 place-items-center text-center"><div><Bell className="mx-auto text-slate-300" size={36}/><p className="mt-3 font-bold text-slate-600">No notifications found</p><p className="mt-1 text-sm text-slate-400">Try another filter or search term.</p></div></div>}</main>
      <aside className="space-y-6">{canManage && <><section className={`${neo} rounded-3xl p-5`}><div className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-600"/><h2 className="font-bold text-slate-800">Active modules</h2></div><div className="mt-5 space-y-4">{analytics.topModules.length ? analytics.topModules.map(([module,count]) => <div key={module}><div className="mb-1.5 flex justify-between text-xs"><span className="font-semibold capitalize text-slate-600">{module}</span><strong>{count}</strong></div><div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{width:`${count / analytics.topModules[0][1] * 100}%`}}/></div></div>) : <p className="text-sm text-slate-500">No module activity yet.</p>}</div></section><section className={`${neo} rounded-3xl p-5`}><h2 className="font-bold text-slate-800">Most active people</h2><div className="mt-4 space-y-3">{analytics.topSenders.length ? analytics.topSenders.map(([name,count],index) => <div key={name} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-xs font-bold text-blue-600">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-600">{name}</span><strong className="text-sm">{count}</strong></div>) : <p className="text-sm text-slate-500">No employee activity yet.</p>}</div></section></>}<section className={`${neo} rounded-3xl p-5`}><div className="flex items-center gap-2"><Eye size={18} className="text-violet-600"/><h2 className="font-bold text-slate-800">Delivery status</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">Notifications are delivered in realtime to your role, department, projects and direct user audience.</p><div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">Realtime listener active</div></section></aside>
    </div>
    <AnnouncementDialog open={announcement} onClose={() => setAnnouncement(false)}/>
  </div>;
}
