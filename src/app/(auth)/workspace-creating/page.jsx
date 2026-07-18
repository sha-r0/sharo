"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WelcomeStep from "./components/WelcomeStep";
import CompanyProfileStep from "./components/CompanyProfileStep";
import WorkspaceCreatingStep from "./components/WorkspaceCreatingStep";

import { useAuth } from "../context/AuthContext";

export default function WorkspaceCreatingPage() {

  const router = useRouter();

  const {
    firebaseUser,
    currentUser,
    company,
    loading,
  } = useAuth();

  const [step, setStep] = useState(1);

  const [workspaceData, setWorkspaceData] = useState({

    companyProfile: {},

    workingHours: {},

  });

  // =====================================
  // Route Protection
  // =====================================

  useEffect(() => {

    if (loading) return;

    // Not logged in
    if (!firebaseUser) {

      router.replace("/login");
      return;

    }

    // Wait until company loads
    if (!company) return;

    // Workspace already completed
    if (company.workspaceCompleted) {

      router.replace("/manager");
      return;

    }

  }, [
    firebaseUser,
    company,
    loading,
    router,
  ]);

  // =====================================
  // Navigation
  // =====================================

  const nextStep = () => {

    setStep((prev) => prev + 1);

  };

  const previousStep = () => {

    setStep((prev) => Math.max(prev - 1, 1));

  };

  // =====================================
  // Company Profile
  // =====================================

  const saveCompanyStep = (data) => {

    setWorkspaceData((prev) => ({

      ...prev,

      companyProfile: data,

    }));

    nextStep();

  };

  // =====================================
  // Working Hours
  // =====================================

  const saveWorkingHours = (data) => {

    setWorkspaceData((prev) => ({

      ...prev,

      workingHours: data,

    }));

    nextStep();

  };

  // =====================================
  // Loading / Route Checking
  // =====================================

  if (

    loading ||

    !firebaseUser ||

    !company

  ) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-[#EEF3FB]">

        <div className="text-center">

          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />

          <p className="mt-4 text-slate-600">

            Preparing your workspace...

          </p>

        </div>

      </div>

    );

  }

  // Already completed
  if (company.workspaceCompleted) {

    return null;

  }

  // =====================================
  // UI
  // =====================================

  return (

    <div className="min-h-screen bg-[#EEF3FB]">

      {step === 1 && (

        <WelcomeStep

          currentUser={currentUser}

          company={company}

          onNext={nextStep}

        />

      )}

      {step === 2 && (

        <CompanyProfileStep

          currentUser={currentUser}

          company={company}

          onBack={previousStep}

          onNext={saveCompanyStep}

        />

      )}

      {step === 3 && (

        <WorkspaceCreatingStep

          company={company}

          workspaceData={workspaceData}

        />

      )}

    </div>

  );

}