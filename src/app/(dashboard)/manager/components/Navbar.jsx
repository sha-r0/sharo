"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import {
  Bell,
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

// import AddExpenseForm from "@/components/AddExpenseForm";

export default function Navbar({ onExpenseAdded }) {

  const router = useRouter();

  const {
    company,
    currentUser,
  } = useAuth();

  const [showExpenseForm, setShowExpenseForm] =
    useState(false);

  const [openMenu, setOpenMenu] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  // =====================================
  // Live Clock
  // =====================================

  useEffect(() => {

    const timer = setInterval(() => {

      setCurrentTime(new Date());

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  // =====================================
  // Date & Time
  // =====================================

  const formattedTime = useMemo(() => {

    return currentTime.toLocaleTimeString([], {

      hour: "2-digit",

      minute: "2-digit",

    });

  }, [currentTime]);

  const formattedDate = useMemo(() => {

    return currentTime.toLocaleDateString("en-IN", {

      weekday: "long",

      day: "numeric",

      month: "long",

      year: "numeric",

    });

  }, [currentTime]);

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

  const userInitial =
    (
      currentUser?.name ||
      currentUser?.displayName ||
      "A"
    )
      .charAt(0)
      .toUpperCase();

  const companyName =
    company?.shortName ||
    company?.companyName ||
    "SHARO";

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

        <div className="flex items-center gap-6">

          {/* Company */}

          <div className="flex items-center gap-3">

            {/* <div className="w-11 h-11 rounded-xl bg-[#EEF3FB] overflow-hidden flex items-center justify-center">

              {companyLogo ? (

                <img
                  src={companyLogo}
                  alt="Company"
                  className="w-full h-full object-cover"
                />

              ) : (

                <Building2
                  size={22}
                  className="text-blue-600"
                />

              )}

            </div> */}

            <div>

              <h2 className="text-xl font-bold text-slate-800">

                Hi, {companyName}

              </h2>

              <p className="text-xs text-slate-500">

                Welcome back 👋

              </p>

            </div>

          </div>

        </div>

        {/* =====================================
                  RIGHT
          ===================================== */}

        <div className="flex items-center gap-4">

          {/* Time */}

          <div className="hidden lg:flex items-center gap-3 rounded-xl px-4 py-2">

            <Clock3
              size={18}
              className="text-blue-600"
            />

            <div>

              <h4 className="text-sm font-semibold">

                {formattedTime}

              </h4>

              <p className="text-[11px] text-slate-500">

                {formattedDate}

              </p>

            </div>

          </div>

          {/* Add Expense */}

          <button
            onClick={() => setShowExpenseForm(true)}
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

          </button>

          {/* Notification */}

          <button
            className="
                relative
                w-11
                h-11
                rounded-xl
                bg-[#F8FAFD]
                border
                border-slate-200
                flex
                items-center
                justify-center
              "
          >

            <Bell size={19} />

            <span
              className="
                  absolute
                  top-2
                  right-2
                  w-2
                  h-2
                  rounded-full
                  bg-red-500
                "
            />

          </button>

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

              <div
                className="
                    w-10
                    h-10
                    rounded-full
                    bg-gradient-to-r
                    from-blue-600
                    to-blue-700
                    text-white
                    flex
                    items-center
                    justify-center
                    font-bold
                  "
              >

                {userInitial}

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

      {/* =====================================
ADD EXPENSE MODAL
===================================== */}

      {showExpenseForm && (
        <AddExpenseForm
          onClose={() => setShowExpenseForm(false)}
          onAdded={onExpenseAdded}
        />
      )}

    </>
  );

}