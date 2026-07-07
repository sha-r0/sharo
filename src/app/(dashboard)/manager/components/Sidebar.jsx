"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutGrid,
  Users,
  FolderKanban,
  ReceiptIndianRupee,
  BarChart3,
  BanknoteArrowDown,
  Calculator,
  ClipboardList,
  FileCheck,
  LogOut,
} from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function Sidebar() {

  const pathname = usePathname();

  const router = useRouter();

  const {
    company,
  } = useAuth();

  const isActive = (route) => {

    if (route === "/manager") {

      return pathname === "/manager";

    }

    return pathname.startsWith(route);

  };

  const handleLogout = async () => {

    try {

      await signOut(auth);

      router.replace("/login");

    } catch (error) {

      console.error(error);

    }

  };

  return (

    <aside
      className="
        w-[72px]
        h-screen
        bg-[#F8F9FD]
        border
        border-white
        rounded-xl
        flex
        flex-col
        items-center
        py-5
      "
    >

      {/* LOGO */}

      <div className="w-10 h-10  rounded-xl overflow-hidden flex items-center justify-center">

        {company?.logoUrl ? (

          <img
            src={company.logoUrl}
            alt="Company Logo"
            className="w-10 h-10 object-cover rounded-xl"
          />

        ) : (

          <Image
            src="/logo.png"
            alt="Logo"
            width={40}
            height={40}
          />
          

        )}

      </div>

      <div className="w-8 h-px bg-gray-300 mb-6 mt-2" />

      {/* DASHBOARD */}

      <SidebarItem
        icon={LayoutGrid}
        label="Dashboard"
        active={isActive("/manager")}
        onClick={() => router.push("/manager")}
      />

      {/* MAIN */}

      <div className="flex flex-col mt-6 gap-2">

        <SidebarItem
          icon={Users}
          label="Users"
          active={isActive("/manager/userManagement")}
          onClick={() => router.push("/manager/userManagement")}
        />

        <SidebarItem
          icon={FolderKanban}
          label="Projects"
          active={isActive("/manager/projects")}
          onClick={() => router.push("/manager/projects")}
        />

        <SidebarItem
          icon={BarChart3}
          label="Expenses"
          active={isActive("/manager/expenses")}
          onClick={() => router.push("/manager/expenses")}
        />

        <SidebarItem
          icon={BanknoteArrowDown}
          label="Advance"
          active={isActive("/manager/advance")}
          onClick={() => router.push("/manager/advance")}
        />

      </div>

      <div className="w-8 h-px bg-gray-300 my-4" />

      {/* BILLING */}

      <div className="flex flex-col gap-2">

        <SidebarItem
          icon={ReceiptIndianRupee}
          label="Billing"
          active={isActive("/manager/billing")}
          onClick={() => router.push("/manager/billing")}
        />

        <SidebarItem
          icon={Calculator}
          label="Salary"
          active={isActive("/manager/salary")}
          onClick={() => router.push("/manager/salary")}
        />

        <SidebarItem
          icon={ClipboardList}
          label="Notice"
          active={isActive("/manager/notice")}
          onClick={() => router.push("/manager/notice")}
        />

        <SidebarItem
          icon={FileCheck}
          label="Shift Policy"
          active={isActive("/manager/officePolicy")}
          onClick={() => router.push("/manager/officePolicy")}
        />

      </div>

      <div className="flex-1" />

      <div className="w-8 h-px bg-gray-300 my-4" />

      <SidebarItem
        icon={LogOut}
        label="Logout"
        danger
        onClick={handleLogout}
      />

    </aside>

  );

  function SidebarItem({

    icon: Icon,
  
    label,
  
    active,
  
    danger = false,
  
    onClick,
  
  }) {
  
    return (
  
      <div className="relative group">
  
        <button
          onClick={onClick}
          className={`
            w-11
            h-11
            rounded-xl
            flex
            items-center
            justify-center
            transition-all
            duration-200
  
            ${
              active
                ? "bg-white text-blue-600 shadow-md scale-105"
                : danger
                ? "text-red-500 hover:bg-red-100 hover:scale-105"
                : "text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow hover:scale-105"
            }
          `}
        >
  
          <Icon size={20} />
  
        </button>
  
        {/* Active Indicator */}
  
        {active && (
  
          <div
            className="
              absolute
              -left-3
              top-1/2
              -translate-y-1/2
              w-1
              h-8
              rounded-r-full
              bg-blue-600
            "
          />
  
        )}
  
        {/* Tooltip */}
  
        <div
          className="
            absolute
            left-16
            top-1/2
            -translate-y-1/2
            opacity-0
            invisible
            group-hover:opacity-100
            group-hover:visible
            transition-all
            duration-200
            pointer-events-none
            z-50
          "
        >
  
          <div
            className="
              bg-white
              border
              border-slate-200
              shadow-xl
              rounded-xl
              px-3
              py-2
              whitespace-nowrap
            "
          >
  
            <span
              className={`
                text-sm
                font-medium
  
                ${
                  danger
                    ? "text-red-600"
                    : "text-slate-700"
                }
              `}
            >
  
              {label}
  
            </span>
  
          </div>
  
        </div>
  
      </div>
  
    );
  
  }

}