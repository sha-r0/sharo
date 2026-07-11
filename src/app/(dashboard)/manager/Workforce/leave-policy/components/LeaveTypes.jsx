"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/app/(auth)/context/AuthContext";

import LeaveTypeCard from "./LeaveTypeCard";
import LeaveTypeDialog from "./LeaveTypeDialog";

import LeaveTypeService from "../../services/LeaveTypeService";

const defaultForm = {
  name: "",
  code: "",
  color: "#2563EB",
  status: "active",
  description: "",

  paid: true,
  carryForward: true,
  negativeBalance: false,
  halfDay: true,
  attachment: false,
  approval: true,
  probation: true,

  annualAllocation: 12,
  monthlyAccrual: 1,
  maxPerRequest: 5,
  maxCarryForward: 6,
  minimumService: 0,

  gender: "all",
};

export default function LeaveTypes() {

  const { company } = useAuth();

  const [loading, setLoading] = useState(true);

  const [leaveTypes, setLeaveTypes] = useState([]);

  const [dialog, setDialog] = useState(false);

  const [editLeave, setEditLeave] = useState(null);

  const [form, setForm] = useState(defaultForm);

  ////////////////////////////////////////////////////

  useEffect(() => {

    if (company?.id) {

      load();

    }

  }, [company?.id]);

  ////////////////////////////////////////////////////

  async function load() {

    try {

      setLoading(true);

      const data =
        await LeaveTypeService.getAll(
          company.id
        );

      setLeaveTypes(data);

    } finally {

      setLoading(false);

    }

  }

  ////////////////////////////////////////////////////

  function addLeave() {

    setEditLeave(null);

    setForm(defaultForm);

    setDialog(true);

  }

  ////////////////////////////////////////////////////

  function edit(item) {

    setEditLeave(item);

    setForm({

      name: item.basic?.name || "",

      code: item.basic?.code || "",

      color: item.basic?.color || "#2563EB",

      status: item.basic?.active
        ? "active"
        : "inactive",

      description:
        item.basic?.description || "",

      paid: item.rules?.paid ?? true,

      carryForward:
        item.rules?.carryForward ?? true,

      negativeBalance:
        item.rules?.negativeBalance ??
        false,

      halfDay:
        item.rules?.halfDay ?? true,

      attachment:
        item.rules?.attachment ??
        false,

      approval:
        item.rules?.approval ?? true,

      probation:
        item.rules?.probation ?? true,

      annualAllocation:
        item.limits?.annualAllocation ??
        12,

      monthlyAccrual:
        item.limits?.monthlyAccrual ??
        1,

      maxPerRequest:
        item.limits?.maxPerRequest ?? 5,

      maxCarryForward:
        item.limits?.maxCarryForward ??
        6,

      minimumService:
        item.limits?.minimumService ??
        0,

      gender:
        item.applicable?.gender ||
        "all",

    });

    setDialog(true);

  }

    ////////////////////////////////////////////////////

    async function remove(item) {

        if (
          !confirm(
            `Delete "${item.basic?.name}" ?`
          )
        ) {
          return;
        }
    
        await LeaveTypeService.delete(
          company.id,
          item.id
        );
    
        load();
    
      }
    
      ////////////////////////////////////////////////////
    
      async function save() {
    
        if (!form.name || !form.code) {
    
          alert("Please fill required fields.");
    
          return;
    
        }
    
        if (editLeave) {
    
          await LeaveTypeService.update(
            company.id,
            editLeave.id,
            form
          );
    
        } else {
    
          await LeaveTypeService.create(
            company.id,
            form
          );
    
        }
    
        setDialog(false);
    
        setEditLeave(null);
    
        setForm(defaultForm);
    
        load();
    
      }
    
      ////////////////////////////////////////////////////
    
      const total = leaveTypes.length;
    
      const paid = leaveTypes.filter(
        (x) => x.rules?.paid
      ).length;
    
      const unpaid = leaveTypes.filter(
        (x) => !x.rules?.paid
      ).length;
    
      const active = leaveTypes.filter(
        (x) => x.basic?.active
      ).length;
    
      ////////////////////////////////////////////////////
    
      return (
    
        <div className="space-y-8">
    
          {/* Summary */}
    
          <div className="grid grid-cols-4 gap-6">
    
            <SummaryCard
              title="Total Leave Types"
              value={total}
              color="text-indigo-600"
            />
    
            <SummaryCard
              title="Paid Leave"
              value={paid}
              color="text-green-600"
            />
    
            <SummaryCard
              title="Unpaid Leave"
              value={unpaid}
              color="text-red-600"
            />
    
            <SummaryCard
              title="Active"
              value={active}
              color="text-blue-600"
            />
    
          </div>
    
          {/* Body */}
    
          {loading ? (
    
            <div className="py-24 text-center text-slate-500">
    
              Loading Leave Types...
    
            </div>
    
          ) : leaveTypes.length === 0 ? (
    
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-24 text-center">
    
              <h2 className="text-2xl font-bold text-slate-700">
    
                No Leave Types
    
              </h2>
    
              <p className="mt-3 text-slate-500">
    
                Click "Add Leave Type" to create one.
    
              </p>
    
              <button
    
                onClick={addLeave}
    
                className="mt-8 rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white"
    
              >
    
                Add Leave Type
    
              </button>
    
            </div>
    
          ) : (
    
            <div className="grid grid-cols-3 gap-6">
    
              {leaveTypes.map((leave) => (
    
                <LeaveTypeCard
    
                  key={leave.id}
    
                  leave={leave}
    
                  onView={edit}
    
                  onEdit={edit}
    
                  onDelete={remove}
    
                />
    
              ))}
    
            </div>
    
          )}
    
          <LeaveTypeDialog
    
            open={dialog}
    
            onClose={() => setDialog(false)}
    
            form={form}
    
            setForm={setForm}
    
            onSave={save}
    
            editMode={!!editLeave}
    
          />
    
        </div>
    
      );
    
    }
    
    /* ======================================== */
    
    function SummaryCard({
    
      title,
    
      value,
    
      color,
    
    }) {
    
      const neo =
        "shadow-[0px_0.706592px_0.706592px_-0.666667px_rgba(0,0,0,0.08),0px_1.80656px_1.80656px_-1.33333px_rgba(0,0,0,0.08),0px_3.62176px_3.62176px_-2px_rgba(0,0,0,0.07),0px_6.8656px_6.8656px_-2.66667px_rgba(0,0,0,0.05),0px_30px_30px_-4px_rgba(0,0,0,0.02),inset_0px_3px_1px_0px_rgb(255,255,255)]";
    
      return (
    
        <div
          className={`${neo} rounded-3xl bg-[#F9FAFC] p-6`}
        >
    
          <p className="text-sm text-slate-500">
    
            {title}
    
          </p>
    
          <h2
            className={`mt-3 text-4xl font-bold ${color}`}
          >
    
            {value}
    
          </h2>
    
        </div>
    
      );
    
    }