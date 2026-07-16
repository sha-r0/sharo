"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Navbar from "./components/Navbar";
import { NotificationProvider } from "@/app/allservice/notification/NotificationContext";
import FirstLoginGate from "@/components/auth/FirstLoginGate";

export default function ManagerLayout({ children }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  return (
    <ProtectedRoute>
      <NotificationProvider>
      <FirstLoginGate>
      <div className="bg-[#ECF1FD]">

        {/* FIXED SIDEBAR */}
        <div className={`fixed bottom-2 left-2 top-2 z-50 transition-[width] duration-300 ease-out ${sidebarExpanded ? "w-[264px]" : "w-[72px]"}`}>
          <Sidebar expanded={sidebarExpanded} onExpandedChange={setSidebarExpanded} />
        </div>

        {/* RIGHT SIDE */}
        <div className={`flex h-screen flex-col transition-[margin] duration-300 ease-out ${sidebarExpanded ? "ml-[280px]" : "ml-[88px]"}`}>

          {/* FIXED NAVBAR */}
          <div className={`fixed right-2 top-2 z-40 transition-[left] duration-300 ease-out ${sidebarExpanded ? "left-[287px]" : "left-[95px]"}`}>
            <Navbar />
          </div>

          {/* PAGE CONTENT */}
          <main
            className="
              mt-[72px]
              h-[calc(100vh-80px)]
              overflow-y-auto
              no-scrollbar
              px-2
              pb-2
              pt-5
            "
          >
            {children}
          </main>

        </div>

      </div>
      </FirstLoginGate>
      </NotificationProvider>
    </ProtectedRoute>
  );
}
