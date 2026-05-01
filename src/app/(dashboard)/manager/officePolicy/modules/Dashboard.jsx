"use client";

import { CheckSquare } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="min-h-screen space-y-6">

      {/* 🔥 GRID (2 COLUMN) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ================= LEFT - ATTENDANCE ================= */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">

              <div className="
                w-7 h-7 rounded-lg flex items-center justify-center
                bg-gradient-to-br from-amber-400 to-yellow-600
                shadow-[0_6px_15px_rgba(245,158,11,0.3)]
              ">
                <CheckSquare size={16} className="text-white" />
              </div>

              <h3 className="text-base font-semibold text-gray-800">
                Today Attendance
              </h3>

            </div>

            <span className="text-xs text-gray-400">
              3 employees
            </span>
          </div>

          {/* LIST */}
          <div className="space-y-3">

            {/* ROW */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800">Rohit</span>
              <span className="text-xs text-gray-500">09:30 → --:--</span>
              <span className="text-xs px-3 py-1 rounded-lg bg-yellow-100 text-yellow-600">
                Late
              </span>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800">Amit</span>
              <span className="text-xs text-gray-500">09:00 → --:--</span>
              <span className="text-xs px-3 py-1 rounded-lg bg-green-100 text-green-600">
                On Time
              </span>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
              <span className="text-sm font-medium text-gray-800">Suresh</span>
              <span className="text-xs text-gray-400">--:-- → --:--</span>
              <span className="text-xs px-3 py-1 rounded-lg bg-red-100 text-red-500">
                Absent
              </span>
            </div>

          </div>
        </div>

        {/* ================= RIGHT - LEAVE ================= */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* MONTH */}
          <p className="text-xs text-gray-400">
            {new Date().toLocaleString("default", { month: "long", year: "numeric" })}
          </p>

          {/* LIST */}
          <LeaveList />

        </div>

        {/* ================= BELOW - GPS Punch ================= */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

          {/* HEADER */}
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-800">
              GPS Punch Requests
            </h3>
            <span className="text-xs text-gray-400">Today</span>
          </div>

          {/* DATE */}
          <p className="text-xs text-gray-400">17 April 2026</p>

          {/* CARD 1 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-800">Rohit</p>
                <p className="text-xs text-gray-500">
                  📍 28.6139, 77.2090
                </p>
              </div>

              <span className="text-xs px-2 py-1 rounded-lg bg-yellow-100 text-yellow-600">
                Pending
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition">
                Approve
              </button>
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition">
                Reject
              </button>
            </div>

          </div>

          {/* CARD 2 */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">

            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-gray-800">Amit</p>
                <p className="text-xs text-gray-500">
                  📍 28.7041, 77.1025
                </p>
              </div>

              <span className="text-xs px-2 py-1 rounded-lg bg-yellow-100 text-yellow-600">
                Pending
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition">
                Approve
              </button>
              <button className="flex-1 text-xs py-1.5 rounded-lg bg-red-100 text-red-500 hover:bg-red-200 transition">
                Reject
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc
} from "firebase/firestore";

function LeaveList() {

  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaves();
    fetchLeaveTypes();
  }, []);

  ////////////////////////////////////////////////////

  const fetchLeaveTypes = async () => {
    const snap = await getDocs(collection(db, "LeaveTypes"));
    const data = snap.docs.map(d => d.data());
    setLeaveTypes(data);
  };

  ////////////////////////////////////////////////////

  const fetchLeaves = async () => {
    try {

      const userSnap = await getDocs(collection(db, "Usermanagement"));

      let allLeaves = [];

      for (let user of userSnap.docs) {

        const userData = user.data();
        if (!userData.isActive) continue;

        const leaveSnap = await getDocs(
          collection(db, "Usermanagement", user.id, "Leaves")
        );

        leaveSnap.forEach((doc) => {
          allLeaves.push({
            id: doc.id,
            userId: user.id,
            employeeName: userData.name,
            ...doc.data(),
          });
        });
      }

      allLeaves.sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));

      setLeaves(allLeaves);

    } catch (err) {
      console.error(err);
    }
  };

  ////////////////////////////////////////////////////

  const updateLeaveStatus = async (leave, status) => {
    try {
  
      const leaveRef = doc(db, "Usermanagement", leave.userId, "Leaves", leave.id);
      const userRef = doc(db, "Usermanagement", leave.userId);
  
      // 🔥 GET LEAVE DATA
      const leaveSnap = await getDoc(leaveRef);
      const leaveData = leaveSnap.data();
  
      // 🔥 GET USER
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
  
      // 🔥 IF APPROVE → DEDUCT LEAVE
      if (status === "approved") {
  
        const type = leaveData.leaveType; // CL / EL / ML
        const days = leaveData.days || 1;
  
        const current = userData.leaveBalance?.[type] || 0;
  
        if (current < days) {
          alert("Not enough leave balance ❌");
          return;
        }
  
        // deduct balance
        await updateDoc(userRef, {
          [`leaveBalance.${type}`]: current - days,
        });
      }
  
      // 🔥 UPDATE STATUS
      await updateDoc(leaveRef, {
        status,
        approvedAt: new Date(),
      });
  
      setSelectedLeave(null);
      fetchLeaves();
  
    } catch (err) {
      console.error(err);
      alert("Error updating");
    }
  };

  ////////////////////////////////////////////////////

  const getStatusStyle = (status) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-600";
      case "pending": return "bg-yellow-100 text-yellow-600";
      case "rejected": return "bg-red-100 text-red-500";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  const getColor = (type) => {
    switch (type) {
      case "CL": return "#facc15";
      case "EL": return "#6366f1";
      case "ML": return "#a855f7";
      default: return "#94a3b8";
    }
  };

  ////////////////////////////////////////////////////

  const filteredLeaves = leaves
    .filter(l => activeFilter === "All" || l.leaveType === activeFilter)
    .filter(l =>
      l.employeeName?.toLowerCase().includes(search.toLowerCase())
    );

  ////////////////////////////////////////////////////

  const counts = {
    all: leaves.length,
    pending: leaves.filter(l => l.status === "pending").length,
    approved: leaves.filter(l => l.status === "approved").length,
    rejected: leaves.filter(l => l.status === "rejected").length,
  };

  ////////////////////////////////////////////////////

  return (
    <>

      {/* 🔍 SEARCH */}
      <input
        placeholder="Search employee..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input mb-2"
      />

      {/* 📊 STATUS COUNTS */}
      <div className="flex gap-2 text-xs mb-2">
        <span className="bg-gray-100 px-2 py-1 rounded">All {counts.all}</span>
        <span className="bg-yellow-100 px-2 py-1 rounded text-yellow-600">Pending {counts.pending}</span>
        <span className="bg-green-100 px-2 py-1 rounded text-green-600">Approved {counts.approved}</span>
        <span className="bg-red-100 px-2 py-1 rounded text-red-500">Rejected {counts.rejected}</span>
      </div>

      {/* 🔥 FILTER */}
      <div className="flex bg-gray-100 rounded-xl p-1 w-fit mb-3">

        <button
          onClick={() => setActiveFilter("All")}
          className={`px-4 py-1 rounded-lg text-xs ${
            activeFilter === "All" ? "bg-white shadow" : "text-gray-500"
          }`}
        >
          All
        </button>

        {leaveTypes.map((t, i) => (
          <button
            key={i}
            onClick={() => setActiveFilter(t.code)}
            className={`px-4 py-1 text-xs flex items-center gap-1 ${
              activeFilter === t.code ? "bg-white shadow rounded-lg" : "text-gray-500"
            }`}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: getColor(t.code) }}
            />
            {t.code}
          </button>
        ))}

      </div>

      {/* LIST */}
      {filteredLeaves.map((l) => (

        <div
          key={l.id}
          onClick={() => setSelectedLeave(l)}
          className="bg-gray-50 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
        >

          <div>
            <p className="text-sm font-semibold">{l.employeeName}</p>

            <p className="text-xs text-gray-500">
              {l.fromDate === l.toDate
                ? l.fromDate
                : `${l.fromDate} → ${l.toDate}`}
            </p>

            <p className="text-xs" style={{ color: getColor(l.leaveType) }}>
              {l.leaveType}
            </p>
          </div>

          <span className={`text-xs px-2 py-1 rounded ${getStatusStyle(l.status)}`}>
            {l.status}
          </span>

        </div>

      ))}

      {/* 🔥 POPUP */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-xl w-[350px] space-y-3">

            <h3 className="font-semibold text-lg">Leave Details</h3>

            <p><b>Name:</b> {selectedLeave.employeeName}</p>
            <p><b>Type:</b> {selectedLeave.leaveType}</p>
            <p><b>Date:</b> {selectedLeave.fromDate} → {selectedLeave.toDate}</p>
            <p><b>Reason:</b> {selectedLeave.reason || "N/A"}</p>

            <div className="flex gap-2 pt-2">

              <button
                onClick={() => updateLeaveStatus(selectedLeave, "approved")}
                className="flex-1 bg-green-500 text-white py-1 rounded"
              >
                Approve
              </button>

              <button
                onClick={() => updateLeaveStatus(selectedLeave, "rejected")}
                className="flex-1 bg-red-500 text-white py-1 rounded"
              >
                Reject
              </button>

            </div>

            <button
              onClick={() => setSelectedLeave(null)}
              className="w-full text-xs text-gray-400 mt-2"
            >
              Close
            </button>

          </div>

        </div>
      )}

    </>
  );
}