"use client";
import { useState } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { Camera, MapPin, X } from "lucide-react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import ReviewPanel from "../components/approvals/ReviewPanel";
import useReviews from "../components/approvals/useReviews";
import { dateText, gpsDetails } from "../components/approvals/reviewHelpers";
import PunchAddress from "./components/PunchAddress";
import styles from "./gpsApproval.module.css";

function PunchManagement({ companyId, canDecide }) {
  const data = useReviews(companyId, true, canDecide);
  const [photo, setPhoto] = useState(null), [month, setMonth] = useState("");
  const items = data.items.map((item) => ({ ...item, details: gpsDetails(item) })).filter((item) => !month || String(item.date || item.dateKey || item.details.time?.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) || "").startsWith(month));
  const columns = [
    { key: "type", label: "Punch", render: ({ details }) => <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${details.type === "IN" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}>{details.type}</span> },
    { key: "time", label: "Date / time", render: (item) => <div className="whitespace-nowrap"><p>{dateText(item.date || item.dateKey || item.details.time)}</p><p className="mt-1 text-xs text-slate-400">{item.details.time?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) || "—"} IST</p></div> },
    { key: "photo", label: "Selfie", render: (item) => item.details.photo ? <button type="button" aria-label={`Preview selfie of ${item.person.name}`} onClick={() => setPhoto({ url: item.details.photo, name: item.person.name })} className="block h-12 w-12 overflow-hidden rounded-xl bg-white border border-slate-200 focus-visible:outline-2 focus-visible:outline-blue-600"><img src={item.details.photo} alt={`${item.person.name} selfie`} className="h-full w-full object-cover" loading="lazy" /></button> : <span className="flex items-center gap-1.5 text-xs text-slate-400"><Camera size={15} />No selfie</span> },
    { key: "distance", label: "Office distance", render: ({ details }) => <span className="whitespace-nowrap tabular-nums">{details.distance}</span> },
    { key: "address", label: "Address", wide: true, render: ({ details }) => <PunchAddress details={details} /> },
  ];
  return <div className={`${styles.page} space-y-6`}><header className="flex items-start gap-3"><div className="rounded-2xl bg-blue-50 p-3 text-blue-600"><MapPin size={24} /></div><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">GPS Punches</h1><p className="mt-1 text-sm text-slate-500">Review employee locations and manage GPS punch approvals.</p></div></header><ReviewPanel data={{ ...data, items }} columns={columns} canDecide={canDecide} noun="GPS punches" extraFilters={<label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-500">Month<input type="month" aria-label="Filter GPS punches by month" value={month} onChange={(event) => setMonth(event.target.value)} className="min-w-0 bg-transparent py-2 text-slate-700" /></label>} />
    <Dialog open={Boolean(photo)} onClose={() => setPhoto(null)} className={`${styles.page} relative z-50`}><div className="fixed inset-0 bg-slate-500/30 backdrop-blur-sm" aria-hidden="true" /><div className="fixed inset-0 flex items-center justify-center p-4"><DialogPanel className="max-h-[90dvh] w-full max-w-xl overflow-auto rounded-2xl bg-white p-4 shadow-2xl"><div className="mb-4 flex items-center justify-between gap-3"><DialogTitle className="font-semibold text-slate-900">{photo?.name} · GPS selfie</DialogTitle><button type="button" autoFocus aria-label="Close photo preview" onClick={() => setPhoto(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>{photo && <img src={photo.url} alt={`GPS selfie of ${photo.name}`} className="max-h-[70dvh] w-full rounded-xl object-contain" />}</DialogPanel></div></Dialog>
  </div>;
}
export default function GPSReportPage() {
  const { company, isOwner, hasAnyPermission } = useAuth();
  return <PunchManagement key={company?.id || "no-company"} companyId={company?.id} canDecide={isOwner || hasAnyPermission(["gps.approve", "gps.manage"])} />;
}
