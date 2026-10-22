"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import EmployeeForm from "../components/ EmployeeForm";

export default function AddEmployeePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-xl
            border
            border-slate-200
            bg-white
            transition
            hover:bg-slate-50
          "
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Add Employee
          </h1>

          <p className="mt-1 text-slate-500">
            Create a new employee profile for your organization.
          </p>
        </div>
      </div>

      <EmployeeForm mode="create" />
    </div>
  );
}