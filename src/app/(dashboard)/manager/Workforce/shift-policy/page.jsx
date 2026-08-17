"use client";

import { useEffect, useState } from "react";

import ShiftHeader from "./components/ShiftHeader";
import ShiftCard from "./components/ShiftCard";
import ShiftDialog from "./components/ShiftDialog";

import ShiftPolicyService from "./services/ShiftPolicyService";
import { useAuth } from "@/app/(auth)/context/AuthContext";

const defaultForm = {
  // ================= BASIC =================

  name: "",
  code: "",
  description: "",

  status: "active",

  isNightShift: false,

  // ================= TIMING =================

  startTime: "",
  endTime: "",
  workingHours: "",

  // ================= BREAK =================

  hasBreak: true,

  breakStart: "",
  breakEnd: "",

  breakDuration: "",

  // ================= WEEKLY OFF =================

  weeklyOff1: "",

  weeklyOff2: "",

  weekNumbers: [],

  // ================= ATTENDANCE =================

  lateGrace: "15",

  earlyGrace: "10",

  minimumWorkingHours: "08:30",

  halfDayHours: "04:30",

  absentHours: "02:00",

  missingCheckout: "manager",

  enableAutoCheckout: true,

  autoCheckoutTime: "19:30",

  maximumWorkingHours: "16:00",

  // ================= GPS =================

  officeName: "",

  locationMethod: "current",

  latitude: "",

  longitude: "",

  attendanceRadius: "50",

  gpsRequired: true,

  outsideRadiusAction: "approval",

  // ================= PAYROLL =================

  allowOvertime: true,

  overtimeAfter: "08:30",

  overtimeRound: "30",
};

const createDefaultForm = () => ({ ...defaultForm, weekNumbers: [] });

function shiftToForm(shift = {}) {
  const basic = shift.basic ?? shift;
  const timing = shift.timing ?? shift;
  const breakPolicy = shift.break ?? shift;
  const weeklyOff = shift.weeklyOff ?? {};
  const attendance = shift.attendance ?? {};
  const gps = shift.gps ?? {};
  const payroll = shift.payroll ?? {};

  return {
    name: basic.name ?? basic.shiftName ?? "",
    code: basic.code ?? basic.shiftCode ?? "",
    description: basic.description ?? "",
    status: basic.status ?? (shift.active === false ? "inactive" : "active"),
    isNightShift: basic.isNightShift ?? basic.nightShift ?? false,
    startTime: timing.startTime ?? "",
    endTime: timing.endTime ?? "",
    workingHours: timing.workingHours ?? "",
    hasBreak: breakPolicy.enabled ?? breakPolicy.hasBreak ?? true,
    breakStart: breakPolicy.startTime ?? breakPolicy.breakStart ?? "",
    breakEnd: breakPolicy.endTime ?? breakPolicy.breakEnd ?? "",
    breakDuration: breakPolicy.duration ?? breakPolicy.breakDuration ?? "",
    weeklyOff1: weeklyOff.primary ?? shift.weeklyOff1 ?? "",
    weeklyOff2: weeklyOff.secondary ?? shift.weeklyOff2 ?? "",
    weekNumbers: [...(weeklyOff.weeks ?? shift.weekNumbers ?? [])],
    lateGrace: String(attendance.lateGrace ?? shift.lateGrace ?? 15),
    earlyGrace: String(attendance.earlyGrace ?? shift.earlyGrace ?? 10),
    minimumWorkingHours: attendance.minimumWorkingHours ?? shift.minimumWorkingHours ?? "08:30",
    halfDayHours: attendance.halfDayHours ?? shift.halfDayHours ?? "04:30",
    absentHours: attendance.absentHours ?? shift.absentHours ?? "02:00",
    missingCheckout: attendance.missingCheckout ?? shift.missingCheckout ?? "manager",
    enableAutoCheckout: attendance.enableAutoCheckout ?? shift.enableAutoCheckout ?? true,
    autoCheckoutTime: attendance.autoCheckoutTime ?? shift.autoCheckoutTime ?? "19:30",
    maximumWorkingHours: attendance.maximumWorkingHours ?? shift.maximumWorkingHours ?? "16:00",
    officeName: gps.officeName ?? shift.officeName ?? "",
    locationMethod: gps.locationMethod ?? shift.locationMethod ?? "current",
    latitude: gps.latitude != null ? String(gps.latitude) : String(shift.latitude ?? ""),
    longitude: gps.longitude != null ? String(gps.longitude) : String(shift.longitude ?? ""),
    attendanceRadius: String(gps.attendanceRadius ?? shift.attendanceRadius ?? 50),
    gpsRequired: gps.gpsRequired ?? shift.gpsRequired ?? true,
    outsideRadiusAction: gps.outsideRadiusAction ?? shift.outsideRadiusAction ?? "approval",
    allowOvertime: payroll.allowOvertime ?? shift.allowOvertime ?? true,
    overtimeAfter: payroll.overtimeAfter ?? shift.overtimeAfter ?? "08:30",
    overtimeRound: String(payroll.overtimeRound ?? shift.overtimeRound ?? 30),
  };
}

export default function ShiftPolicyPage() {
  const { company } = useAuth();

  const [loading, setLoading] = useState(true);

  const [shifts, setShifts] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);

  const [editShift, setEditShift] = useState(null);

  const [dialogMode, setDialogMode] = useState("create");

  const [form, setForm] = useState(createDefaultForm);

  useEffect(() => {
    if (company?.id) {
      loadShifts();
    }
  }, [company?.id]);

  useEffect(() => {
    if (!openDialog) return;
    setForm(dialogMode === "create" ? createDefaultForm() : shiftToForm(editShift));
  }, [openDialog, dialogMode, editShift]);

  ///////////////////////////////////////////////////////

  async function loadShifts() {
    try {
      setLoading(true);

      const data = await ShiftPolicyService.getAll(company.id);

      setShifts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  ///////////////////////////////////////////////////////

  function handleAdd() {
    setDialogMode("create");
    setEditShift(null);
    setForm(createDefaultForm());
    setOpenDialog(true);
  }

  ///////////////////////////////////////////////////////

  function handleEdit(shift) {
    setDialogMode("edit");
    setEditShift(shift);
    setForm(shiftToForm(shift));
    setOpenDialog(true);
  }

  ///////////////////////////////////////////////////////

  async function handleDelete(shift) {

    const shiftName =
      shift.basic?.name ||
      shift.name ||
      "this shift";

    if (!confirm(`Delete "${shiftName}" ?`)) {
      return;
    }

    try {

      await ShiftPolicyService.delete(
        company.id,
        shift.id
      );

      await loadShifts();

    } catch (error) {

      console.error(error);

      alert("Unable to delete shift.");

    }

  }

  ///////////////////////////////////////////////////////

  function handleView(shift) {
    setDialogMode("view");
    setEditShift(shift);
    setForm(shiftToForm(shift));
    setOpenDialog(true);
  }

  ///////////////////////////////////////////////////////

  async function handleSave() {

    try {

      if (
        !form.name ||
        !form.startTime ||
        !form.endTime
      ) {

        alert(
          "Please fill Shift Name, Start Time and End Time."
        );

        return;

      }

      if (dialogMode === "edit" && editShift) {

        await ShiftPolicyService.update(
          company.id,
          editShift.id,
          form
        );

      } else {

        await ShiftPolicyService.create(
          company.id,
          form
        );

      }

      setOpenDialog(false);

      setEditShift(null);

      setForm(createDefaultForm());

      await loadShifts();

    } catch (error) {

      console.error(error);

      alert("Something went wrong.");

    }

  }

  ///////////////////////////////////////////////////////

  return (
    <div className="space-y-8">

      <ShiftHeader
        onAdd={handleAdd}
      />

      {loading ? (

        <div className="py-20 text-center text-slate-500">
          Loading...
        </div>

      ) : shifts.length === 0 ? (

        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 py-24 text-center">

          <h2 className="text-2xl font-bold text-slate-700">
            No Shift Policies Found
          </h2>

          <p className="mt-3 text-slate-500">

            Create your first shift policy to start managing
            employee attendance and payroll.

          </p>

          <button

            onClick={handleAdd}

            className="mt-8 rounded-2xl bg-indigo-600 px-8 py-3 font-semibold text-white"

          >

            Create Shift Policy

          </button>

        </div>

      ) : (

        <div className="grid grid-cols-2 gap-6">

          {shifts.map((shift) => (

            <ShiftCard

              key={shift.id}

              shift={shift}

              onView={handleView}

              onEdit={handleEdit}

              onDelete={handleDelete}

            />

          ))}

        </div>

      )}

      <ShiftDialog
        open={openDialog}
        onClose={() => {
          setOpenDialog(false);
          setEditShift(null);
        }}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        mode={dialogMode}
        shift={editShift}
      />

    </div>
  );
}
