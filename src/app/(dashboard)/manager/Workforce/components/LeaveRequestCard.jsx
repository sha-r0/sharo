"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import EmployeeMiniCard from "./EmployeeMiniCard";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function LeaveRequestCard() {
  const router = useRouter();
  const { company } = useAuth();

  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;

    loadLeaves(company.id);
  }, [company?.id]);

  async function loadLeaves(companyId) {
    try {
      setLoading(true);

      const leaveQuery = query(
        collection(db, "Companies", companyId, "Leaves"),
        orderBy("appliedAt", "desc"),
        limit(5)
      );

      const userQuery = query(
        collection(db, "Companies", companyId, "Usermanagement")
      );

      const [leaveSnap, userSnap] = await Promise.all([
        getDocs(leaveQuery),
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

      const rows = leaveSnap.docs.map((doc) => {
        const d = doc.data();

        const emp = userMap[d.employeeId] || {};

        return {
          id: doc.id,

          image:
            emp.photo ||
            `https://i.pravatar.cc/100?u=${d.employeeId}`,

          name: d.employeeName,

          subtitle: `${d.leaveType} • ${d.duration}`,

          rightText:
            d.fromDate === d.toDate
              ? d.fromDate
              : `${d.fromDate} → ${d.toDate}`,

          status:
            d.status.charAt(0).toUpperCase() +
            d.status.slice(1),

          showLocation: false,
        };
      });

      setLeaves(rows);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`${neo} rounded-3xl bg-[#F9FAFC] p-6`}>

      <div className="mb-5 flex items-center justify-between">

        <div>

          <h2 className="text-2xl font-bold text-slate-800">
            Leave Requests
          </h2>

          <p className="text-sm text-slate-500">
            Latest Leave Applications
          </p>

        </div>

        <button
          onClick={() => router.push("/dashboard/workforce/leaves")}
          className="font-semibold text-pink-600 hover:text-pink-700"
        >
          View All
        </button>

      </div>

      <div className="space-y-3">

        {loading ? (
          <p className="text-sm text-slate-500">
            Loading...
          </p>
        ) : leaves.length === 0 ? (
          <p className="text-sm text-slate-500">
            No Leave Requests
          </p>
        ) : (
          leaves.map((leave) => (
            <EmployeeMiniCard
              key={leave.id}
              {...leave}
            />
          ))
        )}

      </div>

    </div>
  );
}