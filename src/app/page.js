"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function Home() {
  const [activeTab, setActiveTab] = useState("employee");
  const router = useRouter();

  const [form, setForm] = useState({
    corporateId: "",
    employeeId: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.corporateId || !form.employeeId || !form.password) {
      alert("Please fill all fields");
      return;
    }

    try {
      setLoading(true);

      // 🔥 Query Companies collection
      const q = query(
        collection(db, "Companies"),
        where("corporateId", "==", form.corporateId),
        where("employeeId", "==", form.employeeId)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        alert("Invalid Corporate ID or Employee ID");
        return;
      }

      const user = snapshot.docs[0].data();

      // 🔐 Password check
      if (user.password !== form.password) {
        alert("Wrong password");
        return;
      }

      // 🚫 Service check
      if (user.serviceStatus !== "active") {
        alert("Account is not active");
        return;
      }

      // 🚫 Payment check (IMPORTANT)
      if (user.paymentStatus !== "paid") {
        alert("Payment not completed");
        return;
      }

      const docSnap = snapshot.docs[0];

      // 💾 Save session
      localStorage.setItem(
        "adminUser",
        JSON.stringify({
          companyDocId: docSnap.id,
          corporateId: user.corporateId,
          employeeId: user.employeeId,
          companyName: user.companyName,
        })
      );

      // ensure storage completes
      setTimeout(() => {
        router.push("/manager");
      }, 50);

    } catch (err) {
      console.error(err);
      alert("Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">

      {/* HEADER */}
      <header className="flex justify-between items-center px-8 py-5 bg-white border-b">
        <h1 className="text-xl font-semibold text-gray-800">SHARO</h1>

        <a
          href="tel:+919811880794"
          className="text-sm border px-4 py-2 rounded-lg hover:bg-gray-100"
        >
          Talk to Team
        </a>
      </header>

      {/* MAIN */}
      <section className="flex flex-1 items-center justify-center px-6">

        <div className="grid md:grid-cols-2 gap-10 w-full max-w-6xl items-center">

          {/* LEFT */}
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold text-gray-800 leading-tight">
              Manage your company <br /> operations efficiently
            </h1>

            <p className="text-gray-500">
              SHARO helps you manage employees, attendance, and business operations.
            </p>

            <div className="flex gap-4">
              <Link
                href="/signup"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                Create Company
              </Link>
            </div>
          </div>

          {/* LOGIN CARD */}
          <div className="bg-white p-8 rounded-xl shadow-sm border w-full max-w-md">

            {/* TABS */}
            <div className="flex mb-6 border rounded-lg overflow-hidden">
              <button
                onClick={() => setActiveTab("employee")}
                className={`flex-1 py-2 ${activeTab === "employee"
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100"
                  }`}
              >
                Employee
              </button>

              <button
                onClick={() => setActiveTab("admin")}
                className={`flex-1 py-2 ${activeTab === "admin"
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-100"
                  }`}
              >
                Admin / Manager
              </button>
            </div>

            {/* FORM */}
            <div className="space-y-4">

              <input
                placeholder="Corporate ID"
                className="w-full p-3 border rounded-lg"
                onChange={(e) =>
                  setForm({ ...form, corporateId: e.target.value })
                }
              />

              <input
                placeholder="Employee ID"
                className="w-full p-3 border rounded-lg"
                onChange={(e) =>
                  setForm({ ...form, employeeId: e.target.value })
                }
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 border rounded-lg"
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />

              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-3 rounded-lg"
              >
                {loading ? "Checking..." : "Login"}
              </button>

            </div>
          </div>

        </div>
      </section>
    </main>
  );
}