"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import EmployeeForm from "../components/ EmployeeForm";

export default function AddEmployeePage() {

  const router = useRouter();

  return (

    <div className="space-y-6">

      {/* ======================================
          Header
      ====================================== */}

      <div className="flex items-center gap-4">

        <button
          onClick={() => router.back()}
          className="
            w-11
            h-11
            rounded-xl
            bg-white
            border
            border-slate-200
            flex
            items-center
            justify-center
            hover:bg-slate-50
            transition
          "
        >
          <ArrowLeft size={20} />
        </button>

        <div>

          <h1 className="text-3xl font-bold text-slate-900">

            Add Employee

          </h1>

          <p className="text-slate-500 mt-1">

            Create a new employee profile for your organization.

          </p>

        </div>

      </div>

      {/* ======================================
            Form
      ====================================== */}

      <EmployeeForm />

    </div>

  );

}