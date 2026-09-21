"use client";
import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import GPSReportService from "../../gps-approval/gpsapprovalservice/GPSReportService";
import { reviewStatus } from "./reviewHelpers";

export default function useReviews(companyId, gps, canDecide) {
  const [items, setItems] = useState([]), [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [busy, setBusy] = useState({}), [decisions, setDecisions] = useState({});
  const [message, setMessage] = useState(""), [revision, setRevision] = useState(0);
  const locks = useRef(new Set()), completed = useRef(new Set()), alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (!companyId) { setLoading(false); return; }
    setLoading(true); setError("");
    let loaded = 0, firstItems = true;
    const ready = () => { loaded += 1; if (loaded === 2) setLoading(false); };
    const fail = () => { setError("Unable to load records. Check your connection or access and retry."); setLoading(false); };
    const stopItems = onSnapshot(collection(db, "Companies", companyId, gps ? "GPSPunches" : "LeaveRequests"), (snapshot) => {
      setItems(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))); if (firstItems) { firstItems = false; ready(); }
    }, fail);
    let firstEmployees = true;
    const stopEmployees = onSnapshot(collection(db, "Companies", companyId, "Usermanagement"), (snapshot) => {
      setEmployees(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }))); if (firstEmployees) { firstEmployees = false; ready(); }
    }, fail);
    return () => { alive.current = false; stopItems(); stopEmployees(); };
  }, [companyId, gps, revision]);
  async function decide(item, decision) {
    if (!canDecide || locks.current.has(item.id) || completed.current.has(item.id) || reviewStatus(item, gps) !== "Pending") return;
    locks.current.add(item.id); setBusy((current) => ({ ...current, [item.id]: true })); setError(""); setMessage("");
    try {
      if (gps) await GPSReportService.decide(item.id, decision);
      else await httpsCallable(functions, "decideLeaveRequest")({ leaveRequestId: item.id, decision });
      if (!alive.current) return;
      completed.current.add(item.id);
      setDecisions((current) => ({ ...current, [item.id]: decision === "approved" ? "Approved" : "Rejected" }));
      setMessage(`${gps ? "GPS punch" : "Leave request"} ${decision}.`);
    } catch (failure) {
      if (alive.current) setError(String(failure?.message).includes("ALREADY_DECIDED") ? "This record has already been reviewed. Refresh to see its current status." : "Unable to save this decision. Please try again.");
    } finally {
      locks.current.delete(item.id);
      if (alive.current) setBusy((current) => ({ ...current, [item.id]: false }));
    }
  }
  return { items: items.map((item) => ({ ...item, displayStatus: decisions[item.id] || reviewStatus(item, gps) })), employees, loading, error, busy, message, decide, refresh: () => setRevision((value) => value + 1) };
}
