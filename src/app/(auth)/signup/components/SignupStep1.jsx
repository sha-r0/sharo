"use client";
import { useState } from "react";

export default function SignupStep1({ next }) {
  const [data, setData] = useState({
    companyName: "",
    companyAddress: "",
    companyEmail: "",
    phone: "",
    hasGST: false,
    gstNumber: "",
  });

  const handleNext = () => {
    if (
      !data.companyName ||
      !data.companyAddress ||
      !data.companyEmail ||
      !data.phone
    ) {
      alert("Please fill all required fields");
      return;
    }

    if (!data.companyEmail.includes("@")) {
      alert("Enter valid email");
      return;
    }

    if (data.phone.length !== 10) {
      alert("Enter valid 10 digit phone number");
      return;
    }

    // GST validation (only if checked)
    if (data.hasGST && data.gstNumber.length < 10) {
      alert("Enter valid GST number");
      return;
    }

    next(data);
  };

  return (
    <div className="space-y-6">

      {/* HEADING */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Company Basic Details
        </h2>
        <p className="text-sm text-gray-500">
          Enter your company information to get started
        </p>
      </div>

      {/* FORM */}
      <div className="space-y-4">

        <input
          type="text"
          placeholder="Company Name"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.companyName}
          onChange={(e) =>
            setData({ ...data, companyName: e.target.value })
          }
        />

        <input
          type="text"
          placeholder="Company Address"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.companyAddress}
          onChange={(e) =>
            setData({ ...data, companyAddress: e.target.value })
          }
        />

        <input
          type="email"
          placeholder="Company Email ID"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.companyEmail}
          onChange={(e) =>
            setData({ ...data, companyEmail: e.target.value })
          }
        />

        <input
          type="tel"
          placeholder="Contact Number"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.phone}
          onChange={(e) =>
            setData({ ...data, phone: e.target.value })
          }
        />

        {/* GST CHECKBOX */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.hasGST}
            onChange={(e) =>
              setData({ ...data, hasGST: e.target.checked })
            }
          />
          <label className="text-sm text-gray-700">
            I have GST Number
          </label>
        </div>

        {/* GST INPUT (Conditional) */}
        {data.hasGST && (
          <input
            type="text"
            placeholder="Enter GST Number"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={data.gstNumber}
            onChange={(e) =>
              setData({ ...data, gstNumber: e.target.value.toUpperCase() })
            }
          />
        )}

      </div>

      {/* BUTTON */}
      <button
        onClick={handleNext}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
      >
        Continue
      </button>
    </div>
  );
}