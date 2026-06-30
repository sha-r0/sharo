"use client";

import {
  Building2,
  FileText,
  MapPin,
  Landmark,
  Globe,
  Hash,
} from "lucide-react";

export default function BillingDetails({
  formData,
  setFormData,
}) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const Input = ({
    icon,
    label,
    name,
    placeholder,
  }) => (
    <div>
      <label className="block text-sm font-semibold text-[#071330] mb-2">
        {label}
      </label>

      <div
        className={`h-14 rounded-2xl bg-[#f5f5f5] flex items-center px-5 ${neoShadow}`}
      >
        <div className="text-[#3D5AFE]">
          {icon}
        </div>

        <input
          value={formData[name] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              [name]: e.target.value,
            }))
          }
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none ml-4 text-[#071330] placeholder:text-slate-400"
        />
      </div>
    </div>
  );

  return (
    <div
      className={`bg-[#f5f5f5] rounded-[30px] p-8 ${neoShadow}`}
    >
      <h3 className="text-2xl font-bold text-[#071330]">
        Billing Details
      </h3>

      <p className="mt-2 text-slate-500">
        This information will appear on your invoices.
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-8">

        <Input
          icon={<Building2 size={18} />}
          label="Company Name"
          name="billingCompany"
          placeholder="SHARO Pvt. Ltd."
        />

        <Input
          icon={<FileText size={18} />}
          label="GST Number (Optional)"
          name="gst"
          placeholder="22AAAAA0000A1Z5"
        />

        <div className="md:col-span-2">
          <Input
            icon={<MapPin size={18} />}
            label="Billing Address"
            name="address"
            placeholder="Enter company address"
          />
        </div>

        <Input
          icon={<Landmark size={18} />}
          label="State"
          name="state"
          placeholder="Delhi"
        />

        <Input
          icon={<Globe size={18} />}
          label="Country"
          name="billingCountry"
          placeholder="India"
        />

        <Input
          icon={<Hash size={18} />}
          label="Pincode"
          name="pincode"
          placeholder="110001"
        />

        <Input
          icon={<MapPin size={18} />}
          label="City"
          name="city"
          placeholder="New Delhi"
        />

      </div>
    </div>
  );
}