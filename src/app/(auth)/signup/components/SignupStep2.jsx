"use client";
import { useState, useEffect } from "react";

export default function SignupStep2({ next, back, data: prevData }) {

  const generateCorporateId = (name) => {
    if (!name) return "";

    const base = name.toLowerCase().replace(/\s+/g, "");
    const random = Math.floor(10 + Math.random() * 90); // 2 digit

    return base + random;
  };

  const [data, setData] = useState({
    corporateId: "",
    employeeId: "",
    password: "",
    role: "manager",
  });

  // Auto generate corporate ID on load
  useEffect(() => {
    if (prevData?.companyName) {
      setData((prev) => ({
        ...prev,
        corporateId: generateCorporateId(prevData.companyName),
      }));
    }
  }, [prevData]);

  const handleNext = () => {
    if (!data.corporateId || !data.employeeId || !data.password) {
      alert("Please fill all fields");
      return;
    }

    if (data.password.length < 4) {
      alert("Password must be at least 4 characters");
      return;
    }

    next(data);
  };

  return (
    <div className="space-y-6">

      {/* HEADING */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">
          Admin Login Setup
        </h2>
        <p className="text-sm text-gray-500">
          Create your admin credentials to manage your company
        </p>
      </div>

      {/* FORM */}
      <div className="space-y-4">

        {/* CORPORATE ID */}
        <input
          type="text"
          placeholder="Corporate ID"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.corporateId}
          onChange={(e) =>
            setData({ ...data, corporateId: e.target.value.toLowerCase() })
          }
        />

        {/* EMPLOYEE ID */}
        <input
          type="text"
          placeholder="Employee ID (e.g. admin01)"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.employeeId}
          onChange={(e) =>
            setData({ ...data, employeeId: e.target.value })
          }
        />

        {/* PASSWORD */}
        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={data.password}
          onChange={(e) =>
            setData({ ...data, password: e.target.value })
          }
        />

        {/* ROLE */}
        <select
          className="w-full p-3 border border-gray-300 rounded-lg"
          value={data.role}
          onChange={(e) =>
            setData({ ...data, role: e.target.value })
          }
        >
          <option value="manager">Manager (Default)</option>
          {/* <option value="admin">Admin</option> */}
        </select>

      </div>

      {/* BUTTONS */}
      <div className="flex gap-3">
        <button
          onClick={back}
          className="w-full border border-gray-300 py-3 rounded-lg hover:bg-gray-100"
        >
          Back
        </button>

        <button
          onClick={handleNext}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}