"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { LoaderCircle, MoreVertical, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import GPSReportService from "../Workforce/gps-approval/gpsapprovalservice/GPSReportService";
import { dateKey } from "./dashboardMetrics";
import { gpsReviewDetails, isPendingOutsidePunch } from "./gpsReview";
import { EmptyState, SectionCard } from "./DashboardWidgets";

function PhotoPreview({ photo, onClose }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} onClose={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }} className="m-auto max-h-[90vh] w-[min(90vw,40rem)] rounded-2xl bg-white p-4 shadow-2xl backdrop:bg-black/60" aria-label={`${photo.name} punch photo`}>
    <div className="mb-3 flex items-center justify-between gap-3"><p className="font-semibold text-slate-800">{photo.name} · {photo.type}</p><button type="button" onClick={onClose} aria-label="Close photo preview" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
    <img src={photo.photo} alt={`${photo.name} attendance photo`} className="max-h-[70vh] w-full rounded-xl object-contain" />
  </dialog>;
}

export default function GpsPunchesCard({ companyId, normalItems, renderNormal }) {
  const { can, isOwner, hasAnyPermission } = useAuth();
  const canView = can("gps.view");
  const canDecide = isOwner || hasAnyPermission(["gps.approve", "gps.manage"]);
  const [punches, setPunches] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [actions, setActions] = useState({});
  const [errors, setErrors] = useState({});
  const [completed, setCompleted] = useState(() => new Set());
  const [menu, setMenu] = useState(null);
  const [photo, setPhoto] = useState(null);
  const inFlight = useRef(new Set());
  const today = dateKey(new Date());

  useEffect(() => {
    if (!companyId || !canView) return;
    return onSnapshot(query(collection(db, "Companies", companyId, "GPSPunches"), where("date", "==", today)), (snapshot) => {
      setPunches(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
      setLoadError("");
    }, () => setLoadError("Unable to load GPS review requests. Please try again later."));
  }, [companyId, canView, today]);

  async function decide(item, decision) {
    setMenu(null);
    if (!canDecide || inFlight.current.has(item.id) || completed.has(item.id)) return;
    inFlight.current.add(item.id);
    setActions((current) => ({ ...current, [item.id]: decision }));
    setErrors((current) => ({ ...current, [item.id]: "" }));
    try {
      await GPSReportService.decide(item.id, decision);
      setCompleted((current) => new Set([...current, item.id]));
    } catch (error) {
      console.warn("[Dashboard GPS Punch] review failed", {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        punchId: item.id,
        employeeFirestoreId: item.employeeFirestoreId,
        decision,
      });
      setErrors((current) => ({ ...current, [item.id]: error?.message === "GPS_ALREADY_DECIDED" ? "This GPS punch has already been reviewed." : "Unable to review this GPS punch. Please try again." }));
    } finally {
      inFlight.current.delete(item.id);
      setActions((current) => ({ ...current, [item.id]: null }));
    }
  }

  const pending = punches.filter((item) => isPendingOutsidePunch(item) && !completed.has(item.id));
  return <SectionCard title="Today's GPS Punches" subtitle="Latest employee locations">
    {loadError && <p role="alert" className="mb-3 text-xs text-red-700">{loadError}</p>}
    {pending.length > 0 && <div className={`space-y-2 ${normalItems.length ? "mb-2" : ""}`}>
      {pending.map((item) => {
        const details = gpsReviewDetails(item);
        const busy = Boolean(actions[item.id]);
        return <div key={item.id} className="min-w-0 rounded-2xl border border-slate-100 bg-white p-3 transition hover:border-blue-100 hover:shadow-sm">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{details.name}</p>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700">Pending</span>
            {canDecide && <div className="relative shrink-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setMenu(null); }} onKeyDown={(event) => { if (event.key === "Escape") { setMenu(null); event.currentTarget.querySelector("button")?.focus(); } }}>
              <button type="button" disabled={busy} aria-expanded={menu === item.id} aria-label={busy ? (actions[item.id] === "approved" ? "Approving GPS punch" : "Rejecting GPS punch") : "GPS punch actions"} onClick={() => setMenu((current) => current === item.id ? null : item.id)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50">
                {busy ? <LoaderCircle size={16} className="animate-spin" /> : <MoreVertical size={16} />}
              </button>
              {menu === item.id && <div className="absolute right-0 top-full z-30 mt-1 w-32 rounded-xl border border-slate-100 bg-white p-1 shadow-lg">
                <button type="button" disabled={busy} onClick={() => decide(item, "approved")} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-green-700 hover:bg-green-50">Approve</button>
                <button type="button" disabled={busy} onClick={() => decide(item, "rejected")} className="block w-full rounded-lg px-3 py-2 text-left text-xs font-bold text-red-700 hover:bg-red-50">Reject</button>
              </div>}
            </div>}
          </div>
          <div className="mt-2 flex items-start gap-3">
            {details.photo ? <button type="button" onClick={() => setPhoto(details)} aria-label={`Preview ${details.name} punch photo`} className="shrink-0 rounded-xl focus-visible:outline-2 focus-visible:outline-blue-600"><img src={details.photo} alt={`${details.name} punch thumbnail`} className="h-14 w-14 rounded-xl object-cover" /></button> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-slate-50 text-center text-[10px] text-slate-400">No photo</span>}
            <div className="min-w-0 text-xs text-slate-500"><p className="font-semibold text-slate-700">{details.type} · {details.time}</p><p className="mt-1 text-amber-700">{details.distance}</p><p className="mt-1 break-words">{details.address}</p></div>
          </div>
          {errors[item.id] && <p role="alert" className="mt-2 text-xs text-red-700">{errors[item.id]}</p>}
        </div>;
      })}
    </div>}
    {normalItems.length > 0 ? renderNormal(normalItems) : !pending.length && <EmptyState compact label="No GPS punches today" />}
    {photo && <PhotoPreview photo={photo} onClose={() => setPhoto(null)} />}
  </SectionCard>;
}
