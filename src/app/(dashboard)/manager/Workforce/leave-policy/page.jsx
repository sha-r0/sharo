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

export default function LeavePolicyPage() {

  const { company } = useAuth();

  const [loading, setLoading] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState([]);

  const [holidays, setHolidays] = useState([]);

  const [employees, setEmployees] = useState([]);

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

    <div className="space-y-8">

      {/* Create Leave Type */}

      <CreateLeaveType

        companyId={company.id}

        onSaved={loadData}

      />

      {/* Holidays */}

      <HolidayManager

        companyId={company.id}

        holidays={holidays}

        onSaved={loadData}

      />

      {/* Leave Types */}

      <LeaveTypeTable

        companyId={company.id}

        leaveTypes={leaveTypes}

        onSaved={loadData}

      />

      {/* Assign Policy */}

      <AssignLeavePolicy

        companyId={company.id}

        employees={employees}

        leaveTypes={leaveTypes}

        onSaved={loadData}

      />

      {/* Opening Balance */}

      <LeaveBalanceManager

        companyId={company.id}

        employees={employees}

        leaveTypes={leaveTypes}

        onSaved={loadData}

      />

    </div>

  );

}