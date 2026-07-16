"use client";

import { Archive, MoreHorizontal, Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import NotificationIcon from "./NotificationIcon";
import { timeAgo } from "@/app/allservice/notification/notificationUtilities";

const priorities = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-blue-100 text-blue-700", low: "bg-slate-100 text-slate-600" };

export default function NotificationItem({ item, compact = false, onOpen, onPin, onArchive, onDelete }) {
  const [menu, setMenu] = useState(false);
  return <article className={`group relative flex gap-3 rounded-2xl border p-3 transition sm:gap-4 ${item.userState?.isRead ? "border-slate-100 bg-white/60" : "border-blue-100 bg-blue-50/40"}`}>
    <button onClick={() => onOpen(item)} className="flex min-w-0 flex-1 gap-3 text-left sm:gap-4">
      <NotificationIcon icon={item.icon} color={item.color} size={compact ? "sm" : "md"}/>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2"><strong className={`truncate text-sm text-slate-800 ${item.userState?.isRead ? "font-semibold" : "font-bold"}`}>{item.title}</strong>{!compact && <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorities[item.priority] || priorities.medium}`}>{item.priority}</span>}{item.userState?.isPinned && <Pin size={12} className="fill-blue-600 text-blue-600"/>}</span>
        <span className={`mt-1 block text-xs leading-5 text-slate-500 ${compact ? "line-clamp-1" : "line-clamp-2"}`}>{item.message}</span>
        <span className="mt-1.5 flex items-center gap-2 text-[10px] font-medium text-slate-400"><span className="capitalize">{item.module}</span><span>•</span><span>{timeAgo(item.createdAt)}</span></span>
      </span>
      {!item.userState?.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600"/>}
    </button>
    {!compact && <div className="relative"><button onClick={() => setMenu((value) => !value)} aria-label="Notification actions" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white hover:text-slate-700"><MoreHorizontal size={17}/></button>{menu && <div className="absolute right-0 top-9 z-20 w-36 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">{[[Pin, item.userState?.isPinned ? "Unpin" : "Pin", onPin],[Archive,"Archive",onArchive],[Trash2,"Delete",onDelete]].map(([Icon,label,action]) => <button key={label} onClick={() => { setMenu(false); action(item); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Icon size={14}/>{label}</button>)}</div>}</div>}
  </article>;
}
