"use client";

import { Plus, Clock3 } from "lucide-react";

const neo =
  "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

export default function ShiftHeader({
  onAdd,
}) {
  return (
    <div className="flex items-center justify-between">

      <div className="flex items-center gap-5">

        <div
          className={`${neo} flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white`}
        >
          <Clock3 size={24} />
        </div>

        <div>

          <h1 className="text-3xl font-bold text-slate-800">
            Shift Policy
          </h1>


        </div>

      </div>

      <button
        onClick={onAdd}
        className={`${neo} flex items-center gap-3 rounded-2xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition`}
      >
        <Plus size={20} />
        Add Shift
      </button>

    </div>
  );
}