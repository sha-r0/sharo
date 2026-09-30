"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function SignupStep2({ next, back, data: prevData }) {
  const generateCorporateId = (name) => {
    if (!name) return "";

    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 10);

    const random = Math.floor(1000 + Math.random() * 9000);

    return `${base}${random}`;
  };

  const [showPassword, setShowPassword] = useState(false);

  const [data, setData] = useState({
    corporateId: "",
    fullName: "",
    adminEmail: "",
    adminPhone: "",
    password: "",
    confirmPassword: "",
    role: "owner",
  });

  useEffect(() => {
    if (prevData?.companyName) {
      setData((prev) => ({
        ...prev,
        corporateId: generateCorporateId(prevData.companyName),
      }));
    }
  }, [prevData]);

  const handleNext = () => {
    if (
      !data.corporateId ||
      !data.fullName ||
      !data.adminEmail ||
      !data.adminPhone ||
      !data.password ||
      !data.confirmPassword
    ) {
      alert("Please fill all fields");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(data.adminEmail)) {
      alert("Enter a valid email address");
      return;
    }

    if (data.adminPhone.length !== 10) {
      alert("Enter a valid 10 digit mobile number");
      return;
    }

    if (data.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    if (data.password !== data.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    next(data);
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Administrator Details
        </h2>

        <p className="text-sm text-gray-500">
          Create the owner account for your company.
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Corporate ID */}
        <input
          type="text"
          value={data.corporateId}
          readOnly
          className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
        />

        {/* Full Name */}
        <input
          type="text"
          placeholder="Full Name"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.fullName}
          onChange={(e) =>
            setData({
              ...data,
              fullName: e.target.value,
            })
          }
        />

        {/* Work Email */}
        <input
          type="email"
          placeholder="Work Email"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.adminEmail}
          onChange={(e) =>
            setData({
              ...data,
              adminEmail: e.target.value.toLowerCase(),
            })
          }
        />

        {/* Mobile */}
        <input
          type="tel"
          maxLength={10}
          placeholder="Mobile Number"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.adminPhone}
          onChange={(e) =>
            setData({
              ...data,
              adminPhone: e.target.value.replace(/\D/g, ""),
            })
          }
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={data.password}
            onChange={(e) =>
              setData({
                ...data,
                password: e.target.value,
              })
            }
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-500 hover:text-blue-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={data.confirmPassword}
            onChange={(e) =>
              setData({
                ...data,
                confirmPassword: e.target.value,
              })
            }
          />

          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-0 flex items-center justify-center px-4 text-gray-500 hover:text-blue-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={back}
          className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-100"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}