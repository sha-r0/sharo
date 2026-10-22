"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  ChevronDown,
  Search,
  Plus,
  LogOut,
  User,
  Settings,
  Clock3,
  Building2,
} from "lucide-react";

import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import NotificationBell from "../notifications/components/NotificationBell";
import GlobalSearch from "./GlobalSearch";

export default function Navbar() {

  const router = useRouter();

  const {
    company,
    currentUser,
    can,
  } = useAuth();

  const [openMenu, setOpenMenu] =
    useState(false);

  // const [currentTime, setCurrentTime] =
  //   useState(new Date());

  // =====================================
  // Live Clock
  // =====================================

  // useEffect(() => {

  //   const timer = setInterval(() => {

  //     setCurrentTime(new Date());

  //   }, 1000);

  //   return () => clearInterval(timer);

  // }, []);

  // =====================================
  // Date & Time
  // =====================================

  // const formattedTime = useMemo(() => {

  //   return currentTime.toLocaleTimeString([], {

  //     hour: "2-digit",

  //     minute: "2-digit",

  //   });

  // }, [currentTime]);

  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }, []);

  // =====================================
  // Logout
  // =====================================

  async function handleLogout() {

    await signOut(auth);

    router.replace("/login");

  }

  // =====================================
  // Helpers
  // =====================================

  // const userInitial =
  //   (
  //     currentUser?.name ||
  //     currentUser?.displayName ||
  //     "A"
  //   )
  //     .charAt(0)
  //     .toUpperCase();

  const companyName =
    company?.shortName ||
    company?.companyName ||
    "SHARO";

  const companyPlan =
    company?.plan?.name ||
    company?.plan ||
    company?.subscription?.plan ||
    "Professional";

  const employeeCount =
    company?.employeeCount ?? 0;

  const companyLogo =
    company?.logoUrl || null;

  return (
    <>
      <div
        className="
            h-16
            bg-white
            rounded-2xl
            border
            border-slate-200
            shadow-sm
            px-6
            flex
            items-center
            justify-between
          "
      >

        {/* =====================================
                  LEFT
          ===================================== */}

        <div className="flex min-w-[260px] items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            {companyLogo ? (
              <Image
                src={companyLogo}
                alt={companyName}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <Building2
                size={20}
                className="text-slate-700"
              />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="truncate text-sm font-bold text-slate-900">
                {companyName}
              </h2>
            </div>

            <p className="mt-0.5 text-xs text-slate-500">
              {companyPlan} Plan • {employeeCount} Employees
            </p>
          </div>
        </div>

        <div className="hidden flex-1 justify-center px-8 lg:flex">
          <div className="hidden flex-1 justify-center px-8 lg:flex">
            <GlobalSearch />
          </div>
        </div>

        {/* =====================================
                  RIGHT
          ===================================== */}

        <div className="flex items-center gap-4">

          {/* Time */}

          <div className="hidden items-center gap-2 text-sm text-slate-600 lg:flex">
            <Clock3
              size={16}
              className="text-slate-500"
            />

            <span>
              {formattedDate}
            </span>
          </div>

          {/* Add Expense */}

          {can("expense.create") && <button
            onClick={() => router.push("/manager/expenses/add")}
            className="
                h-11
                px-5
                rounded-xl
                bg-gradient-to-r
                from-blue-600
                to-blue-700
                text-white
                flex
                items-center
                gap-2
                text-sm
                font-semibold
                hover:shadow-lg
                transition
              "
          >

            <Plus size={18} />

            Add Expense

          </button>}

          {/* Notification */}

          <NotificationBell />

          {/* User */}

          <div className="relative">

            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="
                  flex
                  items-center
                  gap-3
                  rounded-xl

                  px-3
                  py-2
                "
            >

              <div className="
  w-10
  h-10
  rounded-full
  bg-slate-100
  text-slate-600
  flex
  items-center
  justify-center
  border
  border-slate-200
">
                <User size={20} />
              </div>

              <div className="hidden md:block text-left">

                <h4 className="text-sm font-semibold text-slate-800">

                  {currentUser?.name ||
                    currentUser?.displayName}

                </h4>

                <p className="text-xs text-slate-500 capitalize">

                  {currentUser?.role || "Manager"}

                </p>

              </div>

              <ChevronDown
                size={18}
                className={`
                    transition-transform
                    ${openMenu ? "rotate-180" : ""}
                  `}
              />

            </button>

            {/* =====================================
                    DROPDOWN
            ===================================== */}

            {openMenu && (

              <div
                className="
    absolute
    right-0
    top-16
    w-72
    rounded-2xl
    bg-white
    border
    border-slate-200
    shadow-2xl
    overflow-hidden
    z-50
  "
              >

                {/* Header */}

                <div className="p-5 border-b border-slate-100">

                  <div className="flex items-center gap-4">

                    <div
                      className="
          w-14
          h-14
          rounded-full
          bg-gradient-to-r
          from-blue-600
          to-blue-700
          text-white
          flex
          items-center
          justify-center
          text-lg
          font-bold
        "
                    >
                      {userInitial}
                    </div>

                    <div className="min-w-0">

                      <h3 className="font-semibold truncate">

                        {currentUser?.name ||
                          currentUser?.displayName}

                      </h3>

                      <p className="text-sm text-slate-500 truncate">

                        {currentUser?.email}

                      </p>

                      <span
                        className="
            inline-flex
            mt-2
            rounded-full
            bg-blue-100
            px-3
            py-1
            text-xs
            font-semibold
            text-blue-700
            capitalize
          "
                      >
                        {currentUser?.role || "Manager"}
                      </span>

                    </div>

                  </div>

                </div>

                {/* Menu */}

                <div className="py-2">

                  <button
                    onClick={() => {

                      setOpenMenu(false);

                      router.push("/manager/profile");

                    }}
                    className="
        w-full
        flex
        items-center
        gap-3
        px-5
        py-3
        hover:bg-slate-50
        transition
      "
                  >

                    <User size={18} />

                    <span className="text-sm">

                      My Profile

                    </span>

                  </button>

                  <button
                    onClick={() => {

                      setOpenMenu(false);

                      router.push("/manager/settings");

                    }}
                    className="
        w-full
        flex
        items-center
        gap-3
        px-5
        py-3
        hover:bg-slate-50
        transition
      "
                  >

                    <Settings size={18} />

                    <span className="text-sm">

                      Settings

                    </span>

                  </button>

                </div>

                <div className="border-t border-slate-100" />

                {/* Logout */}

                <div className="p-3">

                  <button
                    onClick={handleLogout}
                    className="
        w-full
        h-11
        rounded-xl
        bg-red-50
        text-red-600
        hover:bg-red-100
        flex
        items-center
        justify-center
        gap-2
        font-semibold
        transition
      "
                  >

                    <LogOut size={18} />

                    Logout

                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </>
  );

}
