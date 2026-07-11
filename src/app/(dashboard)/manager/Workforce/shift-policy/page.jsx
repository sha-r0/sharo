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

export default function ShiftPolicyPage() {
  const { company } = useAuth();

  const [loading, setLoading] = useState(true);

  const [shifts, setShifts] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);

  const [editShift, setEditShift] = useState(null);

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (company?.id) {
      loadShifts();
    }
  }, [company?.id]);

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

    setEditShift(null);

    setForm({
      ...defaultForm,
    });

    setOpenDialog(true);

  }

  ///////////////////////////////////////////////////////

  function handleEdit(shift) {

    setEditShift(shift);

    setForm({

      // ================= BASIC =================

      name: shift.basic?.name || "",

      code: shift.basic?.code || "",

      description:
        shift.basic?.description || "",

      status:
        shift.basic?.status || "active",

      isNightShift:
        shift.basic?.isNightShift || false,

      // ================= TIMING =================

      startTime:
        shift.timing?.startTime || "",

      endTime:
        shift.timing?.endTime || "",

      workingHours:
        shift.timing?.workingHours || "",

      // ================= BREAK =================

      hasBreak:
        shift.break?.enabled ?? true,

      breakStart:
        shift.break?.startTime || "",

      breakEnd:
        shift.break?.endTime || "",

      breakDuration:
        shift.break?.duration || "",

      // ================= WEEKLY OFF =================

      weeklyOff1:
        shift.weeklyOff?.primary || "",

      weeklyOff2:
        shift.weeklyOff?.secondary || "",

      weekNumbers:
        shift.weeklyOff?.weeks || [],

      // ================= ATTENDANCE =================

      lateGrace:
        String(
          shift.attendance?.lateGrace ?? 15
        ),

      earlyGrace:
        String(
          shift.attendance?.earlyGrace ?? 10
        ),

      minimumWorkingHours:
        shift.attendance?.minimumWorkingHours ||
        "08:30",

      halfDayHours:
        shift.attendance?.halfDayHours ||
        "04:30",

      absentHours:
        shift.attendance?.absentHours ||
        "02:00",

      missingCheckout:
        shift.attendance?.missingCheckout ||
        "manager",

      enableAutoCheckout:
        shift.attendance?.enableAutoCheckout ??
        true,

      autoCheckoutTime:
        shift.attendance?.autoCheckoutTime ||
        "19:30",

      maximumWorkingHours:
        shift.attendance?.maximumWorkingHours ||
        "16:00",

      // ================= GPS =================

      officeName:
        shift.gps?.officeName || "",

      locationMethod:
        shift.gps?.locationMethod ||
        "current",

      latitude:
        shift.gps?.latitude != null
          ? String(shift.gps.latitude)
          : "",

      longitude:
        shift.gps?.longitude != null
          ? String(shift.gps.longitude)
          : "",

      attendanceRadius:
        shift.gps?.attendanceRadius != null
          ? String(
            shift.gps.attendanceRadius
          )
          : "50",

      gpsRequired:
        shift.gps?.gpsRequired ?? true,

      outsideRadiusAction:
        shift.gps?.outsideRadiusAction ||
        "approval",

      // ================= PAYROLL =================

      allowOvertime:
        shift.payroll?.allowOvertime ??
        true,

      overtimeAfter:
        shift.payroll?.overtimeAfter ||
        "08:30",

      overtimeRound:
        String(
          shift.payroll?.overtimeRound ??
          30
        ),

    });

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
    handleEdit(shift);
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

      if (editShift) {

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

      setForm(defaultForm);

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

              shift={{

                id: shift.id,

                name:
                  shift.basic?.name,

                code:
                  shift.basic?.code,

                description:
                  shift.basic?.description,

                status:
                  shift.basic?.status,

                isNightShift:
                  shift.basic?.isNightShift,

                startTime:
                  shift.timing?.startTime,

                endTime:
                  shift.timing?.endTime,

                workingHours:
                  shift.timing?.workingHours,

                breakStart:
                  shift.break?.startTime,

                breakEnd:
                  shift.break?.endTime,

                breakDuration:
                  shift.break?.duration,

                weeklyOff:
                  shift.weeklyOff,

                attendance:
                  shift.attendance,

                gps:
                  shift.gps,

                payroll:
                  shift.payroll,

              }}

              onView={handleView}

              onEdit={handleEdit}

              onDelete={handleDelete}

            />

          ))}

        </div>

      )}

      <ShiftDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        editMode={!!editShift}
      />

    </div>
  );
}