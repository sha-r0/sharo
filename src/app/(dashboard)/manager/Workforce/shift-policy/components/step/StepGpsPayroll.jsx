"use client";

import FormInput from "../common/FormInput";
import FormSelect from "../common/FormSelect";
import FormSection from "../common/FormSection";
import FormGrid from "../common/FormGrid";
import FormSwitch from "../common/FormSwitch";

export default function StepGpsPayroll({
  form,
  setForm,
}) {

  function change(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  function getCurrentLocation() {

    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(

      (position) => {

        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));

      },

      () => {
        alert(
          "Unable to detect location. Please enter coordinates manually."
        );
      }

    );

  }

  return (

    <div className="space-y-8">

      {/* ================= OFFICE LOCATION ================= */}

      <FormSection
        title="Office Location"
        subtitle="Configure office GPS location."
      >

        <FormGrid>

          <FormInput
            label="Office Name"
            name="officeName"
            value={form.officeName}
            onChange={change}
            placeholder="Head Office"
          />

          <FormSelect
            label="Location Method"
            name="locationMethod"
            value={form.locationMethod}
            onChange={change}
          >
            <option value="current">
              Detect Current Location
            </option>

            <option value="manual">
              Manual Coordinates
            </option>

          </FormSelect>

          <FormInput
            label="Attendance Radius (Meters)"
            name="attendanceRadius"
            type="number"
            value={form.attendanceRadius}
            onChange={change}
          />

        </FormGrid>

        {form.locationMethod === "current" ? (

          <div className="mt-6">

            <button
              type="button"
              onClick={getCurrentLocation}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              📍 Get Current Location
            </button>

            <div className="mt-5 grid grid-cols-2 gap-5">

              <FormInput
                label="Latitude"
                value={form.latitude}
                readOnly
              />

              <FormInput
                label="Longitude"
                value={form.longitude}
                readOnly
              />

            </div>

          </div>

        ) : (

          <div className="mt-5 grid grid-cols-2 gap-5">

            <FormInput
              label="Latitude"
              name="latitude"
              value={form.latitude}
              onChange={change}
            />

            <FormInput
              label="Longitude"
              name="longitude"
              value={form.longitude}
              onChange={change}
            />

          </div>

        )}

      </FormSection>

            {/* ================= GPS SETTINGS ================= */}

            <FormSection
        title="GPS Attendance"
        subtitle="Configure GPS attendance validation."
      >

        <div className="space-y-5">

          <FormSwitch
            label="GPS Attendance Required"
            checked={form.gpsRequired}
            onChange={(e)=>
              setForm({
                ...form,
                gpsRequired:e.target.checked,
              })
            }
          />

          <FormSelect
            label="Outside Radius Action"
            name="outsideRadiusAction"
            value={form.outsideRadiusAction}
            onChange={change}
          >

            <option value="approval">
              Send for Manager Approval
            </option>

            <option value="reject">
              Reject Attendance
            </option>

            <option value="allow">
              Allow Attendance
            </option>

          </FormSelect>

        </div>

      </FormSection>



      {/* ================= PAYROLL ================= */}

      <FormSection
        title="Payroll & Overtime"
        subtitle="Configure overtime policy."
      >

        <div className="mb-6">

          <FormSwitch
            label="Allow Overtime"
            checked={form.allowOvertime}
            onChange={(e)=>
              setForm({
                ...form,
                allowOvertime:e.target.checked,
              })
            }
          />

        </div>

        {form.allowOvertime && (

          <FormGrid cols={2}>

            <FormInput
              type="time"
              label="Overtime Starts After"
              name="overtimeAfter"
              value={form.overtimeAfter}
              onChange={change}
            />

            <FormSelect
              label="Round Overtime"
              name="overtimeRound"
              value={form.overtimeRound}
              onChange={change}
            >

              <option value="15">
                15 Minutes
              </option>

              <option value="30">
                30 Minutes
              </option>

              <option value="60">
                60 Minutes
              </option>

            </FormSelect>

          </FormGrid>

        )}

      </FormSection>

    </div>

  );

}