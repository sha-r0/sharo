"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function ProtectedRoute({ children }) {

  const router = useRouter();

  const pathname = usePathname();

  const {

    firebaseUser,

    currentUser,

    company,

    loading,

  } = useAuth();

  // ===========================================
  // Development Mode
  // ===========================================

  const devMode =
    process.env.NEXT_PUBLIC_DEV_MODE === "true";

  if (

    devMode &&

    typeof window !== "undefined" &&

    window.location.hostname === "localhost"

  ) {

    return children;

  }

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

    // -----------------------------
    // User or Company Missing
    // -----------------------------

    if (!currentUser || !company) {

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

  ]);

  // ===========================================
  // Loading Screen
  // ===========================================

  if (

    loading ||

    (firebaseUser && (!currentUser || !company))

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