"use client";

import LiveAttendanceCard from "./LiveAttendanceCard";
import GpsPunchCard from "./GpsPunchCard";
import LeaveRequestCard from "./LeaveRequestCard";

export default function LiveCards() {
  return (
    <div className="grid grid-cols-3 gap-6">
      <LiveAttendanceCard />
      <GpsPunchCard />
      <LeaveRequestCard />
    </div>
  );
}