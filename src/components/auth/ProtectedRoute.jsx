"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { canAccessPath } from "@/app/allservice/rbac/AuthorizationService";
import AccessDenied from "./AccessDenied";

export default function ProtectedRoute({ children }) {

  const router = useRouter();

  const pathname = usePathname();

  const {

    firebaseUser,

    currentUser,

    company,

    loading,

    access,

    logout,

    authError,

    refreshUser,


  } = useAuth();

  // ===========================================
  // Authentication & Routing
  // ===========================================

  useEffect(() => {

    if (loading) return;

    // -----------------------------
    // Not Logged In
    // -----------------------------

    if (!firebaseUser) {

      router.replace("/login");

      return;

    }

    if (access?.isEmployee && (!access.loginEnabled || access.status !== "active")) {
      logout().finally(() => router.replace("/login"));
      return;
    }

    // -----------------------------
    // User or Company Missing
    // -----------------------------

    if (!currentUser || !company) {
      // A failed initial network check has no cached identity to render yet.
      // Retry without treating an infrastructure failure as a revoked session.
      if (authError) return;
      logout().finally(() => router.replace("/login"));
      return;
    }

    // -----------------------------
    // Workspace Not Completed
    // -----------------------------

    if (

      !company.workspaceCompleted &&

      pathname !== "/workspace-creating"

    ) {

      router.replace("/workspace-creating");

      return;

    }

    // -----------------------------
    // Workspace Completed
    // -----------------------------

    if (

      company.workspaceCompleted &&

      pathname === "/workspace-creating"

    ) {

      router.replace("/manager");

    }

  }, [

    firebaseUser,

    currentUser,

    company,

    loading,

    pathname,

    router,
    access,
    authError,
    logout,

  ]);

  // ===========================================
  // Loading Screen
  // ===========================================

  if (

    loading ||

    (firebaseUser && loading)

  ) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-[#EEF3FB]">

        <div className="text-center">

          <div className="h-14 w-14 mx-auto rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />

          <p className="mt-5 text-slate-600">

            Checking workspace...

          </p>

        </div>

      </div>

    );

  }

  // ===========================================
  // Not Logged In
  // ===========================================

  if (!firebaseUser) {

    return null;

  }

  if (authError && (!currentUser || !company)) {
    return <div role="alert" className="grid min-h-screen place-items-center bg-[#EEF3FB] p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-800">Unable to check your workspace</h1>
        <p className="mt-2 text-sm text-slate-500">Session validation is temporarily unavailable. Please check your connection and retry.</p>
        <button type="button" onClick={refreshUser} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white">Retry</button>
      </div>
    </div>;
  }

  if (access && (!access.loginEnabled || ["inactive", "suspended", "locked", "pending"].includes(String(access.status).toLowerCase()))) return <AccessDenied />;

  if (access && !canAccessPath(access, pathname)) return <AccessDenied />;

  // ===========================================
  // Workspace Incomplete
  // ===========================================

  if (

    !company?.workspaceCompleted &&

    pathname !== "/workspace-creating"

  ) {

    return null;

  }

  // ===========================================
  // Workspace Completed
  // ===========================================

  return children;

}
