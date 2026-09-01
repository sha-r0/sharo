"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import toast from "react-hot-toast";
import { db, functions } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const nameOf = (employee) => employee?.personalInfo?.fullName || employee?.name || "Employee";
const dateText = (value) => value?.toDate?.().toLocaleDateString("en-IN") || String(value || "—");

export default function LeaveApprovalPage() {
  const { company, isOwner, hasAnyPermission } = useAuth();
  const [requests, setRequests] = useState([]), [employees, setEmployees] = useState([]), [error, setError] = useState("");
  const canDecide = isOwner || hasAnyPermission(["leave.approve", "leave.manage"]);
  useEffect(() => {
    if (!company?.id) return undefined;
    const base = ["Companies", company.id];
    const stopRequests = onSnapshot(collection(db, ...base, "LeaveRequests"), (snapshot) => setRequests(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setError("Unable to load leave requests."));
    const stopEmployees = onSnapshot(collection(db, ...base, "Usermanagement"), (snapshot) => setEmployees(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))), () => setError("Unable to load employees."));
    return () => { stopRequests(); stopEmployees(); };
  }, [company?.id]);
  const employeeMap = useMemo(() => new Map(employees.map((employee) => [employee.id, employee])), [employees]);
  const pending = requests.filter((item) => String(item.status || "Pending").toLowerCase() === "pending");
  async function decide(item, decision) {
    try {
      await httpsCallable(functions, "decideLeaveRequest")({ leaveRequestId: item.id, decision });
      toast.success(`Leave ${decision}.`);
    } catch (decisionError) {
      console.error("[LeaveApproval] decision failed", { code: decisionError?.code, name: decisionError?.name });
      toast.error(decisionError?.message === "LEAVE_ALREADY_DECIDED" ? "This request has already been reviewed." : "Unable to review leave request.");
    }
  }
  return <div className="space-y-6 px-2 sm:px-5"><header><h1 className="text-2xl font-bold text-slate-900">Leave Approval</h1><p className="text-sm text-slate-500">Pending employee leave requests</p></header>{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}<section className="overflow-hidden rounded-3xl border bg-white">{!pending.length ? <div className="p-12 text-center text-slate-500">No pending leave requests.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr><th className="p-4">Employee</th><th>Leave</th><th>Dates</th><th>Reason</th><th className="pr-4 text-right">Actions</th></tr></thead><tbody>{pending.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-semibold">{item.employeeName || nameOf(employeeMap.get(item.employeeFirestoreId || item.userId))}</td><td>{item.leaveType || item.leaveCode || "Leave"}</td><td>{dateText(item.fromDate || item.startDate)} – {dateText(item.toDate || item.endDate)}</td><td>{item.reason || "—"}</td><td className="pr-4 text-right">{canDecide ? <div className="flex justify-end gap-2"><button onClick={() => decide(item, "approved")} className="rounded-lg bg-green-50 px-3 py-2 font-bold text-green-700">Approve</button><button onClick={() => decide(item, "rejected")} className="rounded-lg bg-red-50 px-3 py-2 font-bold text-red-700">Reject</button></div> : <span className="text-slate-400">View only</span>}</td></tr>)}</tbody></table></div>}</section></div>;
}
