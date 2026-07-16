"use client";

import { useAuth } from "@/app/(auth)/context/AuthContext";
import ManagerDashboard from "./dashboard/ManagerDashboard";
import DashboardSkeleton from "./dashboard/DashboardSkeleton";

export default function ManagerDashboardPage() {
  const { company, loading } = useAuth();

  if (loading || !company?.id) return <DashboardSkeleton />;

  return <ManagerDashboard companyId={company.id} companyName={company.companyName || company.name} />;
}
