"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/app/allservice/notification/NotificationContext";
import NotificationItem from "./NotificationItem";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const router = useRouter();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    const close = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const openItem = async (item) => {
    if (!item.userState?.isRead) await markRead(item);
    setOpen(false);
    router.push(item.actionRoute || "/manager/notifications");
  };

  return <div ref={root} className="relative">
    <button onClick={() => setOpen((value) => !value)} aria-label={`${unreadCount} unread notifications`} aria-expanded={open} className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-[#F8FAFD] text-slate-700 transition hover:border-blue-200 hover:text-blue-600">
      <Bell size={19}/>{unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <div className="absolute right-0 top-14 z-50 w-[min(92vw,390px)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-100 p-4"><div><h2 className="font-bold text-slate-800">Notifications</h2><p className="text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p></div>{unreadCount > 0 && <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs font-bold text-blue-600"><CheckCheck size={15}/>Mark all read</button>}</div>
      <div className="max-h-[420px] space-y-2 overflow-y-auto p-3">{loading ? Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-100"/>) : error ? <p className="p-8 text-center text-sm text-red-600">{error}</p> : notifications.length ? notifications.slice(0, 6).map((item) => <NotificationItem key={item.id} item={item} compact onOpen={openItem}/>) : <div className="p-10 text-center"><Bell className="mx-auto text-slate-300"/><p className="mt-3 text-sm font-semibold text-slate-500">No notifications yet</p></div>}</div>
      <button onClick={() => { setOpen(false); router.push("/manager/notifications"); }} className="w-full border-t border-slate-100 p-3 text-sm font-bold text-blue-600 transition hover:bg-blue-50">View all notifications</button>
    </div>}
  </div>;
}
