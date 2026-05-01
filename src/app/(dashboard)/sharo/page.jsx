"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";

export default function AdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState({
    totalCompanies: 0,
    totalUsers: 0,
    totalIncome: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const snapshot = await getDocs(collection(db, "Companies"));

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    setCompanies(data);

    let totalUsers = 0;
    let totalIncome = 0;

    data.forEach((c) => {
      totalUsers += c.employeeCount || 0;
      if (c.paymentStatus === "paid") {
        totalIncome += c.amount || 0;
      }
    });

    setSummary({
      totalCompanies: data.length,
      totalUsers,
      totalIncome,
    });
  };

  // 🔥 SMART UPDATE (MAIN LOGIC)
  const updateCompany = async (company, field, value) => {
    try {
      const ref = doc(db, "Companies", company.id);

      let updateData = {
        [field]: value,
      };

      const newPayment =
        field === "paymentStatus" ? value : company.paymentStatus;

      const newStatus =
        field === "serviceStatus" ? value : company.serviceStatus;

      // ✅ ACTIVATE PLAN
      if (newPayment === "paid" && newStatus === "active") {
        const now = new Date();

        const months = Number(company.billingMonths || 0);

        const end = new Date();
        end.setMonth(end.getMonth() + months);

        updateData.planStart = Timestamp.fromDate(now);
        updateData.planEnd = Timestamp.fromDate(end);
      }

      await updateDoc(ref, updateData);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // 📅 FORMAT DATE
  const formatDate = (ts) => {
    if (!ts) return "-";
    return ts.toDate().toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <h1 className="text-2xl font-semibold text-gray-800 mb-6">
        Company Dashboard
      </h1>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-6 mb-6">

        <Card title="Total Companies" value={summary.totalCompanies} />
        <Card title="Total Users" value={summary.totalUsers} />
        <Card title="Total Income" value={`₹${summary.totalIncome}`} />

      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">

        <table className="w-full text-sm">

          {/* ✅ FIXED ALIGNMENT */}
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-4 text-left">Company</th>
              <th className="p-4 text-left">Billing</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">UTR</th>
              <th className="p-4 text-left">Payment</th>
              <th className="p-4 text-left">Plan</th>
              <th className="p-4 text-left">Start</th>
              <th className="p-4 text-left">End</th>
              <th className="p-4 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {companies.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">

                <td className="p-4">{c.companyName}</td>
                <td className="p-4">{c.billingLabel}</td>
                <td className="p-4">{c.companyEmail || "-"}</td>
                <td className="p-4 font-medium">₹{c.amount}</td>
                <td className="p-4 text-xs">{c.paymentUTR}</td>

                {/* PAYMENT */}
                <td className="p-4">
                  <select
                    value={c.paymentStatus}
                    onChange={(e) =>
                      updateCompany(c, "paymentStatus", e.target.value)
                    }
                    className={`px-3 py-1 rounded-lg border ${
                      c.paymentStatus === "paid"
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                  </select>
                </td>

                {/* PLAN */}
                <td className="p-4 text-xs">
                  B:{c.planDistribution?.basic || 0} |
                  P:{c.planDistribution?.pro || 0} |
                  E:{c.planDistribution?.enterprise || 0}
                </td>

                {/* START DATE */}
                <td className="p-4 text-xs text-green-600">
                  {formatDate(c.planStart)}
                </td>

                {/* END DATE */}
                <td className="p-4 text-xs text-red-600">
                  {formatDate(c.planEnd)}
                </td>

                {/* STATUS */}
                <td className="p-4">
                  <select
                    value={c.serviceStatus}
                    onChange={(e) =>
                      updateCompany(c, "serviceStatus", e.target.value)
                    }
                    className={`px-3 py-1 rounded-lg border ${
                      c.serviceStatus === "active"
                        ? "bg-blue-50 text-blue-700"
                        : c.serviceStatus === "inactive"
                        ? "bg-gray-100"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <h2 className="text-2xl font-semibold mt-1">{value}</h2>
    </div>
  );
}