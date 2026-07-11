"use client";

import FormInput from "../common/FormInput";
import FormSelect from "../common/FormSelect";
import FormSection from "../common/FormSection";
import FormGrid from "../common/FormGrid";
import FormSwitch from "../common/FormSwitch";

export default function StepAttendance({
  form,
  setForm,
}) {

  function change(e) {
    const { name, value } = e.target;

    setForm({
      ...form,
      [name]: value,
    });
  }

  return (

    <div className="space-y-8">

      {/* ================= GRACE RULES ================= */}

      <FormSection
        title="Grace & Working Rules"
        subtitle="Configure attendance grace timings."
      >

        <FormGrid>

          <FormInput
            label="Late Grace (Minutes)"
            name="lateGrace"
            type="number"
            value={form.lateGrace}
            onChange={change}
            placeholder="15"
          />

          <FormInput
            label="Early Exit Grace (Minutes)"
            name="earlyGrace"
            type="number"
            value={form.earlyGrace}
            onChange={change}
            placeholder="10"
          />

          <FormInput
            label="Minimum Working Hours"
            name="minimumWorkingHours"
            type="time"
            value={form.minimumWorkingHours}
            onChange={change}
          />

        </FormGrid>

      </FormSection>

      {/* ================= ATTENDANCE CALCULATION ================= */}

      <FormSection
        title="Attendance Calculation"
        subtitle="Decide when attendance becomes Half Day or Absent."
      >

        <FormGrid>

          <FormInput
            label="Half Day If Worked Less Than"
            name="halfDayHours"
            type="time"
            value={form.halfDayHours}
            onChange={change}
          />

          <FormInput
            label="Absent If Worked Less Than"
            name="absentHours"
            type="time"
            value={form.absentHours}
            onChange={change}
          />

          <FormSelect
            label="Missing Checkout"
            name="missingCheckout"
            value={form.missingCheckout}
            onChange={change}
          >

            <option value="manager">
              Manager Approval
            </option>

            <option value="auto">
              Auto Checkout
            </option>

            <option value="incomplete">
              Mark Incomplete
            </option>

          </FormSelect>

        </FormGrid>

      </FormSection>
            {/* ================= AUTO CHECKOUT ================= */}

            <FormSection
        title="Auto Checkout"
        subtitle="Automatically checkout employees if they forget."
      >

        <div className="mb-6">

          <FormSwitch
            label="Enable Auto Checkout"
            checked={form.enableAutoCheckout}
            onChange={(e)=>
              setForm({
                ...form,
                enableAutoCheckout:e.target.checked,
              })
            }
          />

        </div>

        {form.enableAutoCheckout && (

          <FormGrid cols={2}>

            <FormInput
              label="Auto Checkout Time"
              name="autoCheckoutTime"
              type="time"
              value={form.autoCheckoutTime}
              onChange={change}
            />

            <FormInput
              label="Maximum Working Hours"
              name="maximumWorkingHours"
              type="time"
              value={form.maximumWorkingHours}
              onChange={change}
            />

          </FormGrid>

        )}

      </FormSection>

    </div>

  );

}