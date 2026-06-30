"use client";

import {
  Building2,
  Users,
  CreditCard,
  Gift,
  Pencil,
} from "lucide-react";

export default function WorkspaceSummary({
  company = "",
  employees = "",
  plan = "",
  total = "₹0",
}) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const Item = ({ icon, title, value }) => (
    <div className="py-6 border-b border-slate-200 last:border-none">
      <div className="flex justify-between items-start">

        <div className="flex gap-4">

          <div
            className={`h-12 w-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center ${neoShadow}`}
          >
            {icon}
          </div>

          <div>
            <p className="text-sm text-slate-500">
              {title}
            </p>

            <h4 className="mt-1 font-semibold text-[#071330]">
              {value}
            </h4>
          </div>

        </div>

        <button className="text-slate-400 hover:text-[#3D5AFE] transition">
          <Pencil size={18} />
        </button>

      </div>
    </div>
  );

  return (
    <div
      className={`bg-[#f5f5f5] rounded-[32px] p-8 ${neoShadow}`}
    >
      <h3 className="text-[30px] font-bold text-[#071330]">
        Workspace Summary
      </h3>

      <div className="mt-4">

        <Item
          icon={<Building2 className="text-[#3D5AFE]" size={22} />}
          title="Company"
          value={
            company || "Not added yet"
          }
        />

        <Item
          icon={<Users className="text-[#3D5AFE]" size={22} />}
          title="Users"
          value={
            employees || "Not selected yet"
          }
        />

        <Item
          icon={<CreditCard className="text-[#3D5AFE]" size={22} />}
          title="Plan"
          value={
            plan || "Not selected yet"
          }
        />

      </div>

      {/* Total */}

      <div className="mt-8 flex justify-between items-end">

        <div>
          <p className="text-slate-500">
            Total
          </p>

          <div className="text-[44px] font-bold text-[#3D5AFE] leading-none mt-2">
            {total}
          </div>

          <p className="text-slate-500 mt-2">
            / Month
          </p>
        </div>

      </div>

      {/* Trial */}

      <div
        className={`mt-8 rounded-[22px] bg-[#f5f5f5] p-5 flex items-center gap-4 ${neoShadow}`}
      >
        <div
          className={`w-12 h-12 rounded-2xl bg-[#f5f5f5] flex items-center justify-center ${neoShadow}`}
        >
          <Gift className="text-[#3D5AFE]" />
        </div>

        <div>
          <p className="font-semibold text-[#071330]">
            You won't be charged today
          </p>

          <p className="text-sm text-slate-500 mt-1">
            Enjoy your 3-Month free trial.
          </p>
        </div>

      </div>
    </div>
  );
}