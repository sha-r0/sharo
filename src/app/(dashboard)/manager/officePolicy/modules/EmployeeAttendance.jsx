"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function EmployeeAttendance() {

  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [fromDate, setFromDate] = useState("2026-04-01");
  const [toDate, setToDate] = useState("2026-04-30");
  const [report, setReport] = useState([]);
  const [reportType, setReportType] = useState("summary");
  const [holidays, setHolidays] = useState([]);

  useEffect(() => {
    fetchEmployees();
    fetchHolidays();
  }, []);

  ////////////////////////////////////////////

  const fetchEmployees = async () => {
    const snap = await getDocs(collection(db, "Usermanagement"));
    const users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.isActive);
    setEmployees(users);
  };

  ////////////////////////////////////////////

  const fetchHolidays = async () => {
    const snap = await getDocs(collection(db, "Holidays"));
    const data = snap.docs.map(d => d.data().date);
    setHolidays(data);
  };

  ////////////////////////////////////////////

  const generateReport = async () => {

    let result = [];
    const days = getDaysArray(fromDate, toDate);

    for (let emp of (selectedEmployees.length
      ? employees.filter(e => selectedEmployees.includes(e.id))
      : employees)) {

      let row = {
        name: emp.name,
        days: {},
        details: {}
      };

      const attSnap = await getDocs(
        collection(db, "Usermanagement", emp.id, "Attendance")
      );

      attSnap.forEach(doc => {
        const data = doc.data();

        if (data.date >= fromDate && data.date <= toDate) {
          row.days[data.date] = getShortStatus(data);

          row.details[data.date] = {
            in: formatTime(data.checkIn),
            out: formatTime(data.checkOut),
            hrs: data.totalHours?.toFixed(2) || "0"
          };
        }
      });

      // ✅ FIXED LOGIC
      days.forEach(d => {

        if (row.days[d]) return;

        // Holiday
        if (holidays.includes(d)) {
          row.days[d] = "HLD";
          return;
        }

        // Weekly Off
        if (isWeeklyOff(d, emp.shiftPolicy?.weeklyOff)) {
          row.days[d] = "WO";
          return;
        }

        // Default
        row.days[d] = "A";
      });

      result.push(row);
    }

    setReport(result);
  };

  ////////////////////////////////////////////

  const isWeeklyOff = (dateStr, policy) => {

    const date = new Date(dateStr);
    const day = date.toLocaleDateString("en-US", { weekday: "long" });
    const week = Math.ceil(date.getDate() / 7);
  
    // ✅ DEFAULT (if no policy)
    if (!policy) {
      return day === "Sunday";
    }
  
    // Primary
    if (day === policy.primary) return true;
  
    // Secondary
    if (
      day === policy.secondary &&
      policy.weeks?.includes(String(week))
    ) return true;
  
    return false;
  };

  ////////////////////////////////////////////

  const getShortStatus = (data) => {
    switch (data.status) {
      case "present": return "P";
      case "late": return "LT";
      case "halfday": return "HLD";
      default: return "A";
    }
  };

  ////////////////////////////////////////////

  const getDaysArray = (start, end) => {
    let arr = [];
    let dt = new Date(start);

    while (dt <= new Date(end)) {
      arr.push(dt.toISOString().split("T")[0]);
      dt.setDate(dt.getDate() + 1);
    }

    return arr;
  };

  ////////////////////////////////////////////

  const formatTime = (t) => {
    if (!t) return "--:--";
    return t.toDate().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  ////////////////////////////////////////////

  const toggleEmployee = (id) => {
    setSelectedEmployees(prev =>
      prev.includes(id)
        ? prev.filter(e => e !== id)
        : [...prev, id]
    );
  };

  const selectAllEmployees = (checked) => {
    if (checked) {
      setSelectedEmployees(employees.map(e => e.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  ////////////////////////////////////////////

  const days = getDaysArray(fromDate, toDate);

  const getColor = (val) => {
    switch (val) {
      case "P": return "bg-green-100 text-green-700";
      case "WO": return "bg-blue-100 text-blue-700";
      case "HLD": return "bg-yellow-100 text-yellow-700";
      case "LT": return "bg-orange-100 text-orange-700";
      default: return "bg-red-100 text-red-600";
    }
  };

  ////////////////////////////////////////////

  return (
    <div className="p-6 space-y-6 bg-gray-100 min-h-screen">

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl shadow flex flex-wrap gap-4 items-end">

        <div>
          <label className="text-xs">From</label>
          <input type="date" value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs">To</label>
          <input type="date" value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="input"
          />
        </div>

        <div className="flex gap-4">
          <label className="flex gap-2 text-sm">
            <input type="radio" value="summary"
              checked={reportType === "summary"}
              onChange={e => setReportType(e.target.value)} />
            Summary
          </label>

          <label className="flex gap-2 text-sm">
            <input type="radio" value="detailed"
              checked={reportType === "detailed"}
              onChange={e => setReportType(e.target.value)} />
            Detailed
          </label>
        </div>

        <button
          onClick={generateReport}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Apply
        </button>

      </div>

      {/* EMPLOYEE SELECT */}
      <div className="bg-white p-4 rounded-xl shadow">

        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={selectedEmployees.length === employees.length}
            onChange={(e) => selectAllEmployees(e.target.checked)}
          />
          <span className="text-sm">Select All</span>
        </div>

        <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          {employees.map(emp => (
            <label key={emp.id} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedEmployees.includes(emp.id)}
                onChange={() => toggleEmployee(emp.id)}
              />
              {emp.name}
            </label>
          ))}
        </div>

      </div>

      {/* REPORT */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="text-xs min-w-[1200px]">

          <thead className="bg-gray-200">
            <tr>
              <th className="px-3 py-2">Employee</th>

              {days.map((d, i) => (
                <th key={i} className="px-2">
                  D{String(i + 1).padStart(2, "0")}
                </th>
              ))}

            </tr>
          </thead>

          <tbody>

            {report.map((r, i) => (
              <tr key={i} className="border-b">

                <td className="px-3 py-2 font-semibold">
                  {r.name}
                </td>

                {days.map((d, j) => (
                  <td key={j} className="text-center">

                    {reportType === "summary" ? (

                      <span className={`px-2 py-1 rounded text-[10px] ${getColor(r.days[d])}`}>
                        {r.days[d]}
                      </span>

                    ) : (

                      <div className="text-[10px]">
                        <div>{r.details[d]?.in}</div>
                        <div>{r.details[d]?.out}</div>
                        <div className="text-gray-400">
                          {r.details[d]?.hrs}
                        </div>
                      </div>

                    )}

                  </td>
                ))}

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}