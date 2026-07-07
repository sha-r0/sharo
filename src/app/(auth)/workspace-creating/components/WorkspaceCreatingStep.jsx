"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Rocket,
  Loader2,
  CheckCircle2,
  Building2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { createWorkspace } from "../services/workspaceSetupService";
import { useAuth } from "../../context/AuthContext";

export default function WorkspaceCreatingStep({

  company,

  workspaceData,

}) {

  const router = useRouter();

  const {
    refreshUser,
    currentUser,
  } = useAuth();

  const steps = useMemo(
    () => [

      "Uploading Company Logo",

      "Saving Company Profile",

      "Finalizing Workspace",

    ],
    []
  );

  const [currentStep, setCurrentStep] =
    useState(0);

  const [progress, setProgress] =
    useState(0);

  const [currentMessage, setCurrentMessage] =
    useState("Preparing workspace...");

  const [completed, setCompleted] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {

    if (!company?.id) return;

    let mounted = true;

    async function startWorkspace() {

      const result = await createWorkspace(

        company.id,

        workspaceData,

        ({ progress, title }) => {

          if (!mounted) return;

          setProgress(progress);

          setCurrentMessage(title);

          if (progress <= 20) {

            setCurrentStep(0);

          } else if (progress <= 60) {

            setCurrentStep(1);

          } else {

            setCurrentStep(2);

          }

        }

      );

      if (!mounted) return;

      if (!result.success) {

        setError(result.message);

        return;

      }

      await refreshUser();

      setCompleted(true);
      
      setTimeout(() => {
      
        router.replace("/manager");

      }, 2000);

    }

    startWorkspace();

    return () => {

      mounted = false;

    };

  }, [
    company,
    workspaceData,
    router,
    refreshUser,
  ]);

  return (

    <div className="min-h-screen bg-[#EEF3FB] flex items-center justify-center p-10">

      <div className="w-full max-w-6xl rounded-[32px] bg-white shadow-2xl overflow-hidden">

        {/* HEADER */}

        <div className="bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] p-10 text-white">

          <div className="flex items-center gap-6">

            <div className="w-24 h-24 rounded-3xl bg-white/10 flex items-center justify-center">

              {completed ?

                <CheckCircle2 size={50} />

                :

                <Rocket
                  size={48}
                  className="animate-bounce"
                />

              }

            </div>

            <div>

              <h1 className="text-4xl font-bold">

                {completed
                  ? "Workspace Ready"
                  : "Creating Workspace"}

              </h1>

              <p className="text-white/80 mt-3 text-lg">

                {completed
                  ? "Everything has been configured successfully."
                  : "Please wait while SHARO prepares your workspace."}

              </p>

            </div>

          </div>

        </div>

        {/* BODY */}

        <div className="p-10">

          <div className="flex justify-between mb-3">

            <span className="font-semibold">

              Deployment Progress

            </span>

            <span className="font-bold">

              {progress}%

            </span>

          </div>

          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">

            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-700"
              style={{
                width: `${progress}%`,
              }}
            />

          </div>

          <div className="grid lg:grid-cols-3 gap-8 mt-10">

            {/* LEFT */}

            <div className="lg:col-span-2 rounded-3xl bg-[#071330] text-white p-8">

              <h2 className="text-xl font-bold mb-8">

                Deployment Console

              </h2>

              <div className="space-y-6">

                {steps.map((item, index) => {

                  const done =
                    index < currentStep || completed;

                  const running =
                    index === currentStep &&
                    !completed;

                  return (

                    <div
                      key={item}
                      className="flex gap-4 items-start"
                    >

                      {done ? (

                        <CheckCircle2
                          className="text-green-400"
                          size={22}
                        />

                      ) : running ? (

                        <Loader2
                          size={22}
                          className="animate-spin text-cyan-400"
                        />

                      ) : (

                        <div className="w-5 h-5 rounded-full border border-slate-500 mt-1" />

                      )}

                      <div className="flex-1">

                        <h3 className="font-semibold">

                          {item}

                        </h3>

                        <p className="text-slate-400 text-sm mt-1">

                          {running
                            ? currentMessage
                            : done
                              ? "Completed"
                              : "Waiting..."}

                        </p>

                      </div>

                    </div>

                  );

                })}

              </div>

              {error && (

                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5">

                  <h3 className="font-semibold text-red-600">

                    Workspace Creation Failed

                  </h3>

                  <p className="mt-2 text-red-500">

                    {error}

                  </p>

                </div>

              )}

            </div>

            {/* RIGHT */}

            <div className="space-y-5">

              <div className="rounded-3xl bg-slate-50 p-6">

                <Building2
                  className="text-indigo-600"
                  size={32}
                />

                <p className="mt-5 text-slate-500">

                  Company

                </p>

                <h3 className="font-bold text-xl mt-2">

                  {workspaceData?.companyProfile?.companyName ||

                    "SHARO Workspace"}

                </h3>

              </div>

              <div className="rounded-3xl bg-slate-50 p-6">

                <ShieldCheck
                  className="text-green-600"
                  size={32}
                />

                <p className="mt-5 text-slate-500">

                  Security

                </p>

                <h3 className="font-bold text-xl mt-2">

                  Enterprise Ready

                </h3>

              </div>

              <div className="rounded-3xl bg-slate-50 p-6">

                <Sparkles
                  className="text-amber-500"
                  size={32}
                />

                <p className="mt-5 text-slate-500">

                  Status

                </p>

                <h3 className="font-bold text-xl mt-2">

                  {completed

                    ? "Ready"

                    : error

                      ? "Failed"

                      : "Deploying"}

                </h3>

              </div>

            </div>

          </div>

          {completed && (

            <div className="mt-10 rounded-3xl bg-green-50 border border-green-200 p-8">

              <div className="flex items-center gap-5">

                <CheckCircle2
                  className="text-green-600"
                  size={50}
                />

                <div>

                  <h2 className="text-3xl font-bold text-[#071330]">

                    Workspace Created Successfully 🎉

                  </h2>

                  <p className="text-slate-500 mt-2">

                    Redirecting to Dashboard...

                  </p>

                </div>

              </div>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}