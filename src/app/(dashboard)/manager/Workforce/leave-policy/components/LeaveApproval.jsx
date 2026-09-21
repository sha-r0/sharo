"use client";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import ReviewPanel from "../../components/approvals/ReviewPanel";
import useReviews from "../../components/approvals/useReviews";
import { dateText, leaveDuration } from "../../components/approvals/reviewHelpers";

function Requests({ companyId, canDecide }) {
  const data = useReviews(companyId, false, canDecide);
  const columns = [
    { key: "type", label: "Leave type", render: (item) => item.leaveTypeName || item.leaveType || item.leaveCode || "Leave" },
    { key: "dates", label: "From / to", render: (item) => <div className="whitespace-nowrap"><p>{dateText(item.fromDate || item.startDate)}</p><p className="mt-1 text-xs text-slate-400">to {dateText(item.toDate || item.endDate || item.fromDate || item.startDate)}</p></div> },
    { key: "duration", label: "Duration", render: leaveDuration },
    { key: "reason", label: "Reason", wide: true, render: (item) => <p className="min-w-36 max-w-md whitespace-pre-wrap break-words leading-relaxed">{item.reason || "No reason provided"}</p> },
  ];
  return <ReviewPanel data={data} columns={columns} canDecide={canDecide} noun="leave requests" />;
}
export default function LeaveApproval() {
  const { company, isOwner, hasAnyPermission } = useAuth();
  return <Requests key={company?.id || "no-company"} companyId={company?.id} canDecide={isOwner || hasAnyPermission(["leave.approve", "leave.manage"])} />;
}
