"use client";

import {
  Building2,
  Mail,
  Phone,
  Users,
  Globe,
  BriefcaseBusiness,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

export default function CompanyForm({
  formData,
  handleChange,
  handleContinue,
}) {
  const neoShadow =
    "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.07),0px_13.6468px_13.6468px_-3.33333px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";

  const Input = ({
    label,
    name,
    icon,
    placeholder,
    type = "text",
  }) => (
    <div>
      <label className="block text-[15px] font-semibold text-[#071330] mb-3">
        {label}
      </label>

      <div
        className={`h-16 rounded-[20px] bg-[#f5f5f5] flex items-center px-5 ${neoShadow}`}
      >
        <div className="text-[#5F72FF]">{icon}</div>

        <input
          type={type}
          name={name}
          value={formData[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className="flex-1 ml-4 bg-transparent outline-none text-[#071330] placeholder:text-slate-400"
        />
      </div>
    </div>
  );

  const Select = ({
    label,
    name,
    icon,
    options,
  }) => (
    <div>
      <label className="block text-[15px] font-semibold text-[#071330] mb-3">
        {label}
      </label>

      <div
        className={`h-16 rounded-[20px] bg-[#f5f5f5] flex items-center px-5 ${neoShadow}`}
      >
        <div className="text-[#5F72FF]">{icon}</div>

        <select
          name={name}
          value={formData[name]}
          onChange={handleChange}
          className="flex-1 ml-4 bg-transparent outline-none appearance-none text-[#071330]"
        >
          <option value="">Select</option>

          {options.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>

        <ChevronDown
          className="text-slate-400"
          size={18}
        />
      </div>
    </div>
  );

  return (
    <div className="">

      <h2 className="text-[35px] leading-none font-bold text-[#071330]">
        Create Your Company Workspace
      </h2>

      <p className="mt-2 text-s text-slate-500">
        Let's get started with your company information.
      </p>

      <div className="grid md:grid-cols-2 gap-8 mt-6">

        <Input
          label="Company Name"
          name="companyName"
          placeholder="Enter company name"
          icon={<Building2 size={20} />}
        />

        <Input
          label="Company Email"
          name="companyEmail"
          placeholder="Enter company email"
          icon={<Mail size={20} />}
          type="email"
        />

        <Input
          label="Phone Number"
          name="phone"
          placeholder="Enter phone number"
          icon={<Phone size={20} />}
        />

        <Select
          label="Industry"
          name="industry"
          icon={<BriefcaseBusiness size={20} />}
          options={[
            "Construction",
            "Engineering",
            "Consulting",
            "Manufacturing",
            "Retail",
            "Other",
          ]}
        />

        <Select
          label="Employee Count"
          name="employees"
          icon={<Users size={20} />}
          options={[
            "1-10",
            "11-25",
            "26-50",
            "51-100",
            "101-250",
            "250+",
          ]}
        />

        <Select
          label="Country"
          name="country"
          icon={<Globe size={20} />}
          options={[
            "India",
            "United States",
            "United Kingdom",
            "Australia",
            "Canada",
          ]}
        />

      </div>

      <div className="flex justify-center mt-14">

        <button
          onClick={handleContinue}
          className="
            h-16
            px-12
            rounded-[22px]
            bg-gradient-to-r
            from-[#5F72FF]
            to-[#3D5AFE]
            text-white
            text-lg
            font-semibold
            flex
            items-center
            gap-4
            shadow-[0_25px_50px_rgba(79,109,245,0.35)]
            hover:scale-[1.02]
            transition
          "
        >
          Continue

          <ArrowRight size={22} />
        </button>

      </div>

    </div>
  );
}