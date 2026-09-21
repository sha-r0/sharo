"use client";

import { useEffect, useState } from "react";
import LeaveApproval from "./components/LeaveApproval";
import styles from "./leaveManagement.module.css";

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

function ExistingLeavePolicy() {

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

        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">

          Leave Policy

        </h1>

        <p className="mt-1 text-sm text-slate-500">

          Manage leave types, holidays and employee leave policies

        </p>

      </div>

      <div className="overflow-x-auto">

        <div
          role="tablist"
          aria-label="Leave policy sections"
          className="flex min-w-max border-b border-slate-200"
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
                    ? "text-blue-600 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-blue-600"
                    : "text-slate-500 hover:text-slate-800"
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


export default function LeavePolicyPage() {
  const [section, setSection] = useState("approval");
  const [policyOpened, setPolicyOpened] = useState(false);
  return <div className={`${styles.page} space-y-6`}>
    <header><h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leave Management</h1><p className="mt-1 text-sm text-slate-500">Review employee requests and manage your leave policies.</p></header>
    <div role="tablist" aria-label="Leave management sections" className="flex gap-6 border-b border-slate-200">
      {[["approval", "Leave Approval"], ["policy", "Leave Policy"]].map(([id, label]) => <button key={id} type="button" role="tab" id={`leave-${id}-tab`} aria-controls={`leave-${id}-panel`} aria-selected={section === id} onClick={() => { setSection(id); if (id === "policy") setPolicyOpened(true); }} className={`border-b-2 px-1 pb-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 ${section === id ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
    </div>
    <section role="tabpanel" id="leave-approval-panel" aria-labelledby="leave-approval-tab" hidden={section !== "approval"}><LeaveApproval /></section>
    <section role="tabpanel" id="leave-policy-panel" aria-labelledby="leave-policy-tab" hidden={section !== "policy"}>{policyOpened && <ExistingLeavePolicy />}</section>
  </div>;
}
