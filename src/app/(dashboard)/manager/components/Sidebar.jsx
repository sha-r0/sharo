"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  FolderKanban,
  ReceiptIndianRupee,
  BarChart3,
  BanknoteArrowDown,
  FileText,
  UserPlus,
  Calculator,
  ClipboardList,
  FileCheck,
  LogOut,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (route) => pathname.startsWith(route);

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    router.replace("/");
  };

  return (
    <aside className="w-[72px] h-screen              
         bg-[#F8F9FD]
          border border-white
            rounded-xl  flex flex-col items-center py-5">

      {/* LOGO */}
      <div className="w-10 h-10 mb-6 rounded-xl flex items-center justify-center overflow-hidden">
        <Image
          src="/logo.png"
          alt="Logo"
          width={40}
          height={40}
        />
      </div>

      {/* DASHBOARD */}
      <SidebarItem
        icon={LayoutGrid}
        label="Dashboard"
        active={isActive("/manager")}
        onClick={() => router.push("/manager")}
      />

      {/* MAIN */}
      <div className="flex flex-col mt-6 gap-2">
        <SidebarItem icon={Users} label="Users" onClick={() => router.push("/manager/userManagement")} />
        <SidebarItem icon={FolderKanban} label="Projects" onClick={() => router.push("/manager/projects")} />
        <SidebarItem icon={BarChart3} label="Expenses" onClick={() => router.push("/manager/expenses")} />
        <SidebarItem icon={BanknoteArrowDown} label="Advance" onClick={() => router.push("/manager/advance")} />
      </div>

      <div className="w-8 h-px bg-gray-300 my-4" />

      {/* BILLING */}
      <div className="flex flex-col gap-2">
        <SidebarItem icon={ReceiptIndianRupee} label="Billing" onClick={() => router.push("/manager/billing")} />
        {/* <SidebarItem icon={FileText} label="Quotation" onClick={() => router.push("/manager/quotation")} /> */}
        <SidebarItem icon={Calculator} label="Salary" onClick={() => router.push("/manager/salary")} />
        <SidebarItem icon={ClipboardList} label="Notice" onClick={() => router.push("/manager/notice")} />
        <SidebarItem icon={FileCheck} label="Shift Policy" onClick={() => router.push("/manager/officePolicy")} />
      </div>

      {/* PUSH DOWN */}
      <div className="flex-1" />

      <div className="w-8 h-px bg-gray-300 my-4" />

      {/* LOGOUT */}
      <SidebarItem
        icon={LogOut}
        label="Logout"
        danger
        onClick={handleLogout}
      />
    </aside>
  );
}

function SidebarItem({ icon: Icon, label, active, danger, onClick }) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          transition
          ${active
            ? "bg-white text-blue-600 shadow"
            : danger
              ? "text-red-500 hover:bg-red-100"
              : "text-gray-500 hover:bg-white hover:text-blue-600"
          }
        `}
      >
        <Icon size={20} />
      </button>

      {/* TOOLTIP */}
      <span className="absolute left-14 top-1/2 -translate-y-1/2 bg-white text-blue-600 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
        {label}
      </span>
    </div>
  );
}