"use client";

import LiveCards from "./components/LiveCards";
import SummaryCards from "./components/SummaryCards";
import WorkforceHeader from "./components/WorkforceHeader";

export default function WorkforceDashboardPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <WorkforceHeader />

      {/* Summary Cards */}
      <SummaryCards />

      <LiveCards />

    </div>
  );
}