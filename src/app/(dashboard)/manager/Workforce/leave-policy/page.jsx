// "use client";

// import { useState } from "react";

// import LeaveHeader from "./components/LeaveHeader";
// import LeaveTabs from "./components/LeaveTabs";
// import LeaveRequests from "./module/Leaverequest";
// import HolidayCalendar from "./module/Defineholiday";
// import LeaveTypes from "./module/Leavetype";
// import LeaveBalance from "./module/LeaveBalance";


// export default function LeaveManagementPage() {

//   const [activeTab, setActiveTab] = useState("dashboard");

//   /////////////////////////////////////////////////////////

//   function handleAdd() {

//     switch (activeTab) {

//       case "types":
//         // Open Leave Type Dialog
//         break;

//       case "holidays":
//         // Open Holiday Dialog
//         break;

//       case "requests":
//         // Open Apply Leave Dialog
//         break;

//       case "policies":
//         // Open Policy Dialog
//         break;

//       default:
//         break;

//     }

//   }

//   /////////////////////////////////////////////////////////

//   return (

//     <div className="space-y-8">

//       <LeaveHeader
//         activeTab={activeTab}
//         onAdd={handleAdd}
//       />

//       <LeaveTabs
//         activeTab={activeTab}
//         onChange={setActiveTab}
//       />

//       {/* {activeTab === "dashboard" && (
//         <Dashboard />
//       )} */}

//       {activeTab === "types" && (
//         <LeaveTypes />
//       )}

//       {activeTab === "holidays" && (
//         <HolidayCalendar />
//       )}

//       {activeTab === "requests" && (
//         <LeaveRequests/>
//       )}

//       {activeTab === "balance" && (
//         <LeaveBalance />
//       )}

//       {/* {activeTab === "policies" && (
//         <LeavePolicies />
//       )} */}

//     </div>

//   );

// }

"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import LeavePolicyService from "./services/LeaveTypeService";

import CreateLeaveType from "./components/CreateLeaveType";
import HolidayManager from "./components/HolidayManager";
import LeaveTypeTable from "./components/LeaveTypeTable";
import AssignLeavePolicy from "./components/AssignLeavePolicy";
import LeaveBalanceManager from "./components/LeaveBalanceManager";

const LEAVE_POLICY_TABS = [
  { id: "create-leave-type", label: "Create Leave Type" },
  { id: "holiday-calendar", label: "Holiday Calendar" },
  { id: "leave-types", label: "Leave Types" },
  { id: "assign-leave-policy", label: "Assign Leave Policy" },
  { id: "employee-leave-balance", label: "Employee Leave Balance" },
];

export default function LeavePolicyPage() {

  const { company } = useAuth();

  const [loading, setLoading] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState([]);

  const [holidays, setHolidays] = useState([]);

  const [employees, setEmployees] = useState([]);

  const [activeTab, setActiveTab] = useState("create-leave-type");

  ///////////////////////////////////////////////////////

  useEffect(() => {

    if (company?.id) {

      loadData();

    }

  }, [company?.id]);

  ///////////////////////////////////////////////////////

  async function loadData() {

    try {

      setLoading(true);

      const data =
        await LeavePolicyService.getAll(
          company.id
        );

      setLeaveTypes(
        data.leaveTypes
      );

      setHolidays(
        data.holidays
      );

      setEmployees(
        data.employees
      );

      console.log("Employees:", data.employees);
      console.log("Leave Types:", data.leaveTypes);

      await LeavePolicyService.runMonthlyLeaveUpdate(

        company.id,

        data.employees,

        data.leaveTypes

      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }

  }

  ///////////////////////////////////////////////////////

  if (loading) {

    return (

      <div className="py-24 text-center text-slate-500">

        Loading Leave Policy...

      </div>

    );

  }

  ///////////////////////////////////////////////////////

  return (

    <div className="space-y-6">

      <div>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">

          Leave Policy

        </h1>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">

          Manage leave types, holidays and employee leave policies

        </p>

      </div>

      <div className="overflow-x-auto">

        <div
          role="tablist"
          aria-label="Leave policy sections"
          className="flex min-w-max border-b border-slate-200 dark:border-slate-700"
        >

          {LEAVE_POLICY_TABS.map((tab) => {

            const isActive = activeTab === tab.id;

            return (

              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`${tab.id}-tab`}
                aria-selected={isActive}
                aria-controls={`${tab.id}-panel`}
                onClick={() => setActiveTab(tab.id)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset ${
                  isActive
                    ? "text-blue-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-blue-600 dark:text-blue-400 dark:after:bg-blue-400"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >

                {tab.label}

              </button>

            );

          })}

        </div>

      </div>

      {/* Create Leave Type */}

      <section
        role="tabpanel"
        id="create-leave-type-panel"
        aria-labelledby="create-leave-type-tab"
        hidden={activeTab !== "create-leave-type"}
      >

        <CreateLeaveType

          companyId={company.id}

          onSaved={loadData}

        />

      </section>

      {/* Holidays */}

      <section
        role="tabpanel"
        id="holiday-calendar-panel"
        aria-labelledby="holiday-calendar-tab"
        hidden={activeTab !== "holiday-calendar"}
      >

        <HolidayManager

          companyId={company.id}

          holidays={holidays}

          onSaved={loadData}

        />

      </section>

      {/* Leave Types */}

      <section
        role="tabpanel"
        id="leave-types-panel"
        aria-labelledby="leave-types-tab"
        hidden={activeTab !== "leave-types"}
      >

        <LeaveTypeTable

          companyId={company.id}

          leaveTypes={leaveTypes}

          onSaved={loadData}

        />

      </section>

      {/* Assign Policy */}

      <section
        role="tabpanel"
        id="assign-leave-policy-panel"
        aria-labelledby="assign-leave-policy-tab"
        hidden={activeTab !== "assign-leave-policy"}
      >

        <AssignLeavePolicy

          companyId={company.id}

          employees={employees}

          leaveTypes={leaveTypes}

          onSaved={loadData}

        />

      </section>

      {/* Opening Balance */}

      <section
        role="tabpanel"
        id="employee-leave-balance-panel"
        aria-labelledby="employee-leave-balance-tab"
        hidden={activeTab !== "employee-leave-balance"}
      >

        <LeaveBalanceManager

          companyId={company.id}

          employees={employees}

          leaveTypes={leaveTypes}

          onSaved={loadData}

        />

      </section>

    </div>

  );

}
