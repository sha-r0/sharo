"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle, MoreVertical } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { EmptyState, SectionCard } from "./DashboardWidgets";

export default function PendingLeaveCard({ items, renderRecord }) {
  const { isOwner, hasAnyPermission } = useAuth();
  const canDecide = isOwner || hasAnyPermission(["leave.approve", "leave.manage"]);
  const inFlight = useRef(new Set());
  const [actions, setActions] = useState({});
  const [errors, setErrors] = useState({});
  const [completed, setCompleted] = useState(() => new Set());
  const [openMenu, setOpenMenu] = useState(null);
  const pending = items.filter((item) => !completed.has(item.id));

  async function decide(item, decision) {
    setOpenMenu(null);
    if (!canDecide || inFlight.current.has(item.id) || completed.has(item.id)) return;
    inFlight.current.add(item.id);
    setActions((current) => ({ ...current, [item.id]: decision }));
    setErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      const result = await httpsCallable(functions, "decideLeaveRequest")({ leaveRequestId: item.id, decision });
      console.log("[Dashboard Pending Leave] callable result", result);
      setCompleted((current) => new Set([...current, item.id]));
    } catch (error) {
      console.warn("[Dashboard Pending Leave] review failed", {
        error,
        string: String(error),
        name: error?.name,
        code: error?.code,
        message: error?.message,
        details: error?.details,
        stack: error?.stack,
        ownPropertyNames: Object.getOwnPropertyNames(error ?? {}),
        leaveRequestId: item.id,
        decision,
      });
      setErrors((current) => ({ ...current, [item.id]: error?.message === "LEAVE_ALREADY_DECIDED"
        ? "This request has already been reviewed."
        : "Unable to review this leave request. Please try again." }));
    } finally {
      inFlight.current.delete(item.id);
      setActions((current) => ({ ...current, [item.id]: null }));
    }
  }

  return <SectionCard title="Pending Leave" subtitle="Requests awaiting approval">
    {!pending.length ? <EmptyState compact label="No pending leave requests" /> : <div className="space-y-2">
      {pending.map((item) => <div key={item.id} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-blue-100 hover:shadow-sm">
        <div className="flex min-w-0 items-center gap-1">
          <Link href="/manager/Workforce" className="flex min-w-0 flex-1 items-center gap-3">{renderRecord(item)}</Link>
          {canDecide && <div className="relative shrink-0" aria-busy={Boolean(actions[item.id])}
            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null); }}
            onKeyDown={(event) => { if (event.key === "Escape") { setOpenMenu(null); event.currentTarget.querySelector("button")?.focus(); } }}>
            <button type="button" disabled={Boolean(actions[item.id])} aria-label={actions[item.id] === "approved" ? "Approving…" : actions[item.id] === "rejected" ? "Rejecting…" : "Leave request actions"}
              aria-expanded={openMenu === item.id} onClick={() => setOpenMenu((current) => current === item.id ? null : item.id)}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-50">
              {actions[item.id] ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <MoreVertical size={16} aria-hidden="true" />}
            </button>
            {openMenu === item.id && <div className="absolute right-0 top-full z-30 mt-1 w-32 rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
              <button type="button" disabled={Boolean(actions[item.id])} onClick={() => decide(item, "approved")} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-green-700 hover:bg-green-50 focus-visible:bg-green-50">Approve</button>
              <button type="button" disabled={Boolean(actions[item.id])} onClick={() => decide(item, "rejected")} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50 focus-visible:bg-red-50">Reject</button>
            </div>}
          </div>}
        </div>
        {errors[item.id] && <p role="alert" className="mt-2 text-xs text-red-700">{errors[item.id]}</p>}
      </div>)}
    </div>}
  </SectionCard>;
}
