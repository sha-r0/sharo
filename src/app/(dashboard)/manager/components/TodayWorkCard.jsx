"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import {ClipboardList} from "lucide-react"


export default function TodayWorkCard() {
  const [work, setWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();


  const isUserActive = (userData) => userData?.isActive !== false;

  useEffect(() => {
    const fetchTodayWork = async () => {
      try {
        const today = dayjs().format("YYYY-MM-DD");
        const allWork = [];

        // STEP 1 — get all employees
        const usersSnap = await getDocs(collection(db, "Usermanagement"));

        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();

          if (!isUserActive(userData)) continue;

          // STEP 2 — get today's work only
          const workRef = collection(
            db,
            "Usermanagement",
            userDoc.id,
            "WorkDetails"
          );

          const q = query(
            workRef,
            where("date", "==", today)
          );

          const workSnap = await getDocs(q);

          // If employee has work today → push records
          workSnap.forEach((d) => {
            allWork.push({
              id: d.id,
              userId: userDoc.id,
              employeeName: userData.name || "—",
              ...d.data(),
            });
          });
        }

        // Sort by start time (optional but nice)
        allWork.sort((a, b) =>
          (a.startTime || "").localeCompare(b.startTime || "")
        );

        setWork(allWork);
      } catch (err) {
        console.error("Error fetching today work:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayWork();
  }, []);

  const formatMoney = (amt) =>
    "₹" + Number(amt || 0).toLocaleString("en-IN");

  return (
    <div className="
          bg-[#F8F9FD] 
          border border-white 
          rounded-2xl 
          p-4 
          text-black 
          max-h-[375px] 
          flex flex-col
        ">

      {/* HEADER (not scrollable) */}
      <div className="flex justify-between items-center mb-3">

        {/* LEFT SIDE ICON + TITLE */}
        <div className="flex items-center gap-2">

          <div className="
    w-6 h-6 rounded-lg
    flex items-center justify-center
    bg-gradient-to-br from-sky-400 to-cyan-600
    shadow-[0_8px_20px_rgba(6,182,212,0.35)]
  ">
            <ClipboardList size={15} className="text-white" />
          </div>

          <h3 className="text-lg font-semibold text-black">
            Recent Daily Work
          </h3>

        </div>

        {/* RIGHT SIDE BUTTON */}
        <button
          onClick={() => router.push("/dashboard/manager/daily-work")}
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium"
        >
          View All
        </button>

      </div>


      {/* SCROLLABLE AREA ONLY FOR ITEMS */}
      <div className="overflow-y-auto pr-2 manager-scroll flex-1">

        {loading ? (
          <p className="text-center text-black/50 text-sm py-6">
            Loading…
          </p>
        ) : work.length === 0 ? (
          <p className="text-center text-black/50 text-sm py-6">
            No work logged today 🚀
          </p>
        ) : (
          <div className="space-y-3">
            {work.map((w) => (
              <div
                key={w.id}
                className="
                      flex justify-between items-center 
                      p-3 rounded-xl 
                      bg-white 
                      border border-white 
                      shadow-md
                      transition
                    "
              >
                <div>
                  <p className="text-sm font-medium">
                    {w.employeeName}
                  </p>
                  <p className="text-xs text-black/50 max-w-[270px]">
                    {w.description || "Work"} · {w.projectName || "—"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-green-400">
                    {formatMoney(w.amountEarned)}
                  </p>
                  <p className="text-xs text-black/40">
                    {w.startTime || "--:--"} – {w.endTime || "--:--"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

}
