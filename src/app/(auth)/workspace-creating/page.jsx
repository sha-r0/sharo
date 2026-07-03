"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import { collection, query, where, getDocs, doc } from "firebase/firestore";
import {
  CheckCircle2,
  Building2,
  CreditCard,
  Users,
  ArrowRight,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

export default function WorkspaceSuccess() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, async (user) => {

      // ------------------------
      // Not Logged In
      // ------------------------

      if (!user) {

        router.replace("/login");

        return;

      }

      // ------------------------
      // Find Owner
      // ------------------------

      const userSnap = await getDocs(
        query(
          collection(db, "Usermanagement"),
          where("uid", "==", user.uid)
        )
      );

      if (userSnap.empty) {

        router.replace("/login");

        return;

      }

      const owner = userSnap.docs[0].data();

      // ------------------------
      // Company
      // ------------------------

      const companyRef = doc(db, "Companies", owner.companyId);

      const companySnap = await getDoc(companyRef);
      
      if (!companySnap.exists()) {
      
        router.replace("/login");
      
        return;
      
      }
      
      const company = companySnap.data();

      // ------------------------
      // Already Completed
      // ------------------------

      if (company.workspaceCompleted) {

        router.replace("/dashboard");

        return;

      }

      setCheckingAuth(false);

    });

    return () => unsubscribe();

  }, [router]);

  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  if (checkingAuth) {

    return (
      <div className="min-h-screen flex items-center justify-center">

        Checking Workspace...

      </div>
    );

  }

  return (
    <div className="min-h-screen bg-[#eef2f7] flex items-center justify-center p-8">

      <div
        className={`w-full max-w-3xl rounded-[40px] bg-[#f5f5f5] p-12 ${neoShadow}`}
      >
        {/* Success Icon */}

        <div className="flex justify-center">

          <div className="relative">

            <div className="absolute inset-0 bg-green-400 blur-3xl opacity-20 rounded-full" />

            <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-xl">
              <CheckCircle2 className="text-white" size={58} />
            </div>

          </div>

        </div>

        {/* Heading */}

        <h1 className="text-center mt-10 text-5xl font-bold text-[#071330]">
          Welcome to SHARO 🎉
        </h1>

        <p className="text-center text-slate-500 text-lg mt-4 max-w-xl mx-auto">
          Your workspace has been created successfully.
          Everything is ready and you can start managing your business.
        </p>

        {/* Summary */}

        <div className="grid md:grid-cols-3 gap-6 mt-12">

          <div className={`rounded-3xl bg-[#f5f5f5] p-6 ${neoShadow}`}>
            <Building2 className="text-[#3D5AFE]" size={28} />

            <p className="mt-5 text-sm text-slate-500">
              Company
            </p>

            <h3 className="font-semibold text-lg mt-2">
              Troynoy A Pvt Ltd
            </h3>
          </div>

          <div className={`rounded-3xl bg-[#f5f5f5] p-6 ${neoShadow}`}>
            <CreditCard className="text-[#3D5AFE]" size={28} />

            <p className="mt-5 text-sm text-slate-500">
              Plan
            </p>

            <h3 className="font-semibold text-lg mt-2">
              Business
            </h3>
          </div>

          <div className={`rounded-3xl bg-[#f5f5f5] p-6 ${neoShadow}`}>
            <Users className="text-[#3D5AFE]" size={28} />

            <p className="mt-5 text-sm text-slate-500">
              Trial
            </p>

            <h3 className="font-semibold text-lg mt-2">
              3 Months
            </h3>
          </div>

        </div>

        {/* Status */}

        <div
          className={`mt-12 rounded-[30px] bg-[#f5f5f5] p-8 ${neoShadow}`}
        >
          <h2 className="text-2xl font-bold text-[#071330]">
            Workspace Ready
          </h2>

          <div className="space-y-5 mt-8">

            {[
              "Company workspace created",
              "Administrator account configured",
              "Business plan activated",
              "3-Month free trial enabled",
              "Workspace secured with SSL",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-4"
              >
                <CheckCircle2
                  className="text-green-500"
                  size={22}
                />

                <span className="text-slate-700">
                  {item}
                </span>
              </div>
            ))}

          </div>

        </div>

        {/* Trial */}

        <div
          className={`mt-8 rounded-[26px] p-6 bg-gradient-to-r from-[#eef3ff] to-[#f8fbff] border border-blue-100`}
        >
          <div className="flex gap-4">

            <Sparkles className="text-[#3D5AFE]" />

            <div>

              <h3 className="font-semibold text-[#071330]">
                Your trial starts today
              </h3>

              <p className="text-slate-500 mt-2">
                Enjoy every SHARO feature free for the next
                <strong> 3 months</strong>.
              </p>

            </div>

          </div>
        </div>

        {/* Security */}

        <div className="flex justify-center gap-10 mt-10 text-slate-500">

          <div className="flex items-center gap-2">
            <ShieldCheck
              className="text-green-500"
              size={18}
            />
            SSL Secure
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck
              className="text-green-500"
              size={18}
            />
            Auto Backup
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck
              className="text-green-500"
              size={18}
            />
            Enterprise Ready
          </div>

        </div>

        {/* Button */}

        <div className="flex justify-center mt-12">

          <button
            onClick={() => router.push("/dashboard")}
            className="h-16 px-12 rounded-2xl bg-gradient-to-r from-[#5F72FF] to-[#3D5AFE] text-white font-semibold text-lg flex items-center gap-4 shadow-[0_25px_50px_rgba(61,90,254,.35)] hover:scale-[1.02] transition"
          >
            Go To Dashboard

            <ArrowRight size={20} />
          </button>

        </div>

      </div>

    </div>
  );
}