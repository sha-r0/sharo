"use client";

import { useState, useEffect } from "react";
import { Bell, ChevronDown } from "lucide-react";
// import AddExpenseForm from "@/component/AddExpenseForm";
import { useRouter } from "next/navigation";

export default function Navbar({ onExpenseAdded }) {
  const [user, setUser] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const router = useRouter();

  // ✅ FIX: use localStorage instead of cookie
  useEffect(() => {
    const stored = localStorage.getItem("adminUser");

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch (err) {
        console.error("User parse error:", err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    router.replace("/");
  };

  return (
    <>
      <div className="flex justify-between items-center            
            bg-[#F8F9FD]
            rounded-xl
            p-5
            border border-white px-6 h-16">

        {/* LEFT */}
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold text-gray-800">
            Hi, {user?.companyName || "User"}
          </h1>
          <span className="text-xs text-gray-400">
            Welcome back 👋
          </span>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-4">

          {/* ADD BUTTON */}
          <button
            onClick={() => setShowExpenseForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            + Add Expense
          </button>

          {/* NOTIFICATION */}
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <Bell size={18} />
          </button>

          {/* USER MENU */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100"
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-semibold">
                {user?.employeeId?.charAt(0) || "U"}
              </div>
              <ChevronDown size={16} />
            </button>

            {/* DROPDOWN */}
            {openMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-md py-2">

                <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                  Profile
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                >
                  Logout
                </button>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* MODAL */}
      {showExpenseForm && (
        <AddExpenseForm
          onClose={() => setShowExpenseForm(false)}
          onAdded={onExpenseAdded}
        />
      )}
    </>
  );
}