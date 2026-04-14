"use client";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("employee");

  return (
    <main className="bg-black text-white min-h-screen px-6 md:px-16 py-10">

      {/* HEADER */}
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SHARO</h1>

        <a
          href="tel:+919811880794"
          className="border border-white/30 px-5 py-2 rounded-xl hover:bg-white/10 transition"
        >
          📞 Talk to the Team
        </a>
      </header>

      {/* HERO */}
      <section className="flex flex-col lg:flex-row justify-between items-center mt-16 gap-10">

        {/* LEFT */}
        <div className="max-w-xl space-y-6">

          <div className="px-4 py-2 rounded-full bg-gradient-to-r from-black via-gray-900 to-purple-900 w-fit">
            🚀 Empowering Global Startup Growth
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
            FUTURE - DRIVEN SOFTWARE
            <br />
            <span className="text-purple-500">{`{DEVELOPMENT}`}</span>
          </h1>

          <p className="text-gray-400">
            We craft high-quality digital solutions that help businesses grow,
            scale, and innovate.
          </p>

          <div className="flex gap-4">
            <button className="bg-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-purple-700">
              Signup (New Company)
            </button>

            <button className="border border-white/30 px-6 py-3 rounded-lg hover:bg-white/10">
              View Features
            </button>
          </div>
        </div>

        {/* RIGHT - LOGIN CARD */}
        <div className="w-full max-w-md bg-gradient-to-b from-[#231540] to-black p-6 rounded-xl border border-white/20 shadow-2xl">

          {/* TABS */}
          <div className="flex mb-6 bg-white/10 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab("employee")}
              className={`flex-1 py-2 text-sm ${
                activeTab === "employee"
                  ? "bg-purple-600"
                  : "hover:bg-white/10"
              }`}
            >
              Employee Login
            </button>

            <button
              onClick={() => setActiveTab("admin")}
              className={`flex-1 py-2 text-sm ${
                activeTab === "admin"
                  ? "bg-purple-600"
                  : "hover:bg-white/10"
              }`}
            >
              Admin / Manager
            </button>
          </div>

          {/* FORM */}
          <div className="space-y-4">

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 rounded-lg bg-black border border-white/20 focus:outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 rounded-lg bg-black border border-white/20 focus:outline-none"
            />

            <button className="w-full bg-purple-600 py-3 rounded-lg font-semibold hover:bg-purple-700">
              {activeTab === "employee"
                ? "Login as Employee"
                : "Login as Admin"}
            </button>

            <p className="text-xs text-gray-400 text-center">
              {activeTab === "employee"
                ? "Access your tasks & work logs"
                : "Manage company, employees & finance"}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}