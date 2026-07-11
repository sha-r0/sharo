"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import EmployeeMiniCard from "./EmployeeMiniCard";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function GpsPunchCard() {
  const router = useRouter();
  const { company } = useAuth();

  const [gpsData, setGpsData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;

    loadGps(company.id);
  }, [company?.id]);

  async function loadGps(companyId) {
    try {
      setLoading(true);

      const today = new Date().toISOString().split("T")[0];

      const attendanceQuery = query(
        collection(db, "Companies", companyId, "Attendance"),
        where("date", "==", today),
        orderBy("checkIn", "desc"),
        limit(5)
      );

      const userQuery = query(
        collection(db, "Companies", companyId, "Usermanagement")
      );

      const [attendanceSnap, userSnap] = await Promise.all([
        getDocs(attendanceQuery),
        getDocs(userQuery),
      ]);

      const userMap = {};

      userSnap.forEach((doc) => {
        const d = doc.data();

        userMap[doc.id] = {
          designation:
            d.designation ||
            d.role ||
            "Employee",

          photo:
            d.photoUrl ||
            d.profileImage ||
            "",
        };
      });

      const rows = attendanceSnap.docs.map((doc) => {
        const d = doc.data();

        const emp = userMap[d.employeeFirestoreId] || {};

        return {
          id: doc.id,

          image:
            emp.photo ||
            `https://i.pravatar.cc/100?u=${d.employeeFirestoreId}`,

          name: d.employeeName,

          subtitle: d.gpsValid
            ? "GPS Verified"
            : "GPS Invalid",

          rightText: d.checkIn
            ? d.checkIn.toDate().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "--:--",

          status:
            d.approvalStatus
              ? d.approvalStatus.charAt(0).toUpperCase() +
                d.approvalStatus.slice(1)
              : "Pending",

          showLocation: true,
        };
      });

      setGpsData(rows);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-6`}>
      <div className="mb-5 flex items-center justify-between">

        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            GPS Report
          </h2>

          <p className="text-sm text-slate-500">
            Today's GPS Punches
          </p>
        </div>

        <button
          onClick={() =>
            router.push("/dashboard/workforce/gps")
          }
          className="font-semibold text-cyan-600"
        >
          View All
        </button>

      </div>

      <div className="space-y-3">

        {loading ? (
          <p className="text-sm text-slate-500">
            Loading...
          </p>
        ) : gpsData.length === 0 ? (
          <p className="text-sm text-slate-500">
            No GPS punches found.
          </p>
        ) : (
          gpsData.map((item) => (
            <EmployeeMiniCard
              key={item.id}
              {...item}
            />
          ))
        )}

      </div>
    </div>
  );
}