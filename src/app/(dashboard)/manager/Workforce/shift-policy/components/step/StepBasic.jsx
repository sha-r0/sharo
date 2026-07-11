"use client";

import FormInput from "../common/FormInput";
import FormSelect from "../common/FormSelect";
import FormSection from "../common/FormSection";
import FormGrid from "../common/FormGrid";
import FormSwitch from "../common/FormSwitch";

export default function StepBasic({
    form,
    setForm,
}) {

    function change(e) {

        const { name, value } = e.target;

        const updated = {
            ...form,
            [name]: value,
        };

        // Auto Calculate Working Hours

        if (
            name === "startTime" ||
            name === "endTime"
        ) {

            updated.workingHours = calculateDuration(
                updated.startTime,
                updated.endTime
            );

        }

        setForm(updated);

    }

    return (

        <div className="space-y-8">

            {/* ================= BASIC INFORMATION ================= */}

            <FormSection
                title="Basic Information"
                subtitle="General information about this shift."
            >

                <FormGrid>

                    <FormInput
                        required
                        label="Shift Name"
                        name="name"
                        value={form.name}
                        onChange={change}
                        placeholder="General Shift"
                    />

                    <FormInput
                        required
                        label="Shift Code"
                        name="code"
                        value={form.code}
                        onChange={change}
                        placeholder="GS001"
                    />

                    <FormSelect
                        label="Status"
                        name="status"
                        value={form.status}
                        onChange={change}
                    >

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>

                    </FormSelect>

                </FormGrid>

                <div className="mt-6">

                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Description
                    </label>

                    <textarea

                        rows={4}

                        name="description"

                        value={form.description}

                        onChange={change}

                        placeholder="Example : General Office Shift"

                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"

                    />

                </div>

                <div className="mt-6">

                    <FormSwitch

                        label="Night Shift"

                        checked={form.isNightShift}

                        onChange={(e) =>

                            setForm({

                                ...form,

                                isNightShift: e.target.checked,

                            })

                        }

                    />

                </div>

            </FormSection>



            {/* ================= WORKING HOURS ================= */}

            <FormSection

                title="Working Hours"

                subtitle="Configure office timing."

            >

                <FormGrid>

                    <FormInput

                        type="time"

                        label="Office Start Time"

                        name="startTime"

                        value={form.startTime}

                        onChange={change}

                    />

                    <FormInput

                        type="time"

                        label="Office End Time"

                        name="endTime"

                        value={form.endTime}

                        onChange={change}

                    />

                    <FormInput

                        label="Working Hours"

                        value={form.workingHours}

                        readOnly

                    />

                </FormGrid>

            </FormSection>

            {/* ================= BREAK POLICY ================= */}

            <FormSection
                title="Break Policy"
                subtitle="Configure lunch or tea break timings."
            >

                <div className="mb-6">

                    <FormSwitch
                        label="Enable Break"
                        checked={form.hasBreak}
                        onChange={(e) =>
                            setForm({
                                ...form,
                                hasBreak: e.target.checked,
                            })
                        }
                    />

                </div>

                {form.hasBreak && (

                    <FormGrid>

                        <FormInput
                            type="time"
                            label="Break Start"
                            name="breakStart"
                            value={form.breakStart}
                            onChange={(e) => {

                                const updated = {
                                    ...form,
                                    breakStart: e.target.value,
                                };

                                updated.breakDuration = calculateDuration(
                                    updated.breakStart,
                                    updated.breakEnd
                                );

                                setForm(updated);

                            }}
                        />

                        <FormInput
                            type="time"
                            label="Break End"
                            name="breakEnd"
                            value={form.breakEnd}
                            onChange={(e) => {

                                const updated = {
                                    ...form,
                                    breakEnd: e.target.value,
                                };

                                updated.breakDuration = calculateDuration(
                                    updated.breakStart,
                                    updated.breakEnd
                                );

                                setForm(updated);

                            }}
                        />

                        <FormInput
                            label="Break Duration"
                            value={form.breakDuration}
                            readOnly
                        />

                    </FormGrid>

                )}

            </FormSection>



            {/* ================= WEEKLY OFF ================= */}

            <FormSection
                title="Weekly Off"
                subtitle="Configure weekly holidays."
            >

                <FormGrid>

                    <FormSelect
                        label="Primary Weekly Off"
                        name="weeklyOff1"
                        value={form.weeklyOff1}
                        onChange={change}
                    >

                        <Days />

                    </FormSelect>

                    <FormSelect
                        label="Secondary Weekly Off"
                        name="weeklyOff2"
                        value={form.weeklyOff2}
                        onChange={change}
                    >

                        <Days />

                    </FormSelect>

                    <div>

                        <label className="mb-3 block text-sm font-medium text-slate-700">
                            Applicable Weeks
                        </label>

                        <div className="flex flex-wrap gap-3">

                            {[1, 2, 3, 4, 5].map((week) => {

                                const active =
                                    form.weekNumbers.includes(week);

                                return (

                                    <button
                                        key={week}
                                        type="button"
                                        onClick={() => {

                                            let weeks = [...form.weekNumbers];

                                            if (weeks.includes(week)) {

                                                weeks = weeks.filter(
                                                    (w) => w !== week
                                                );

                                            } else {

                                                weeks.push(week);

                                            }

                                            setForm({
                                                ...form,
                                                weekNumbers: weeks,
                                            });

                                        }}
                                        className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all

                    ${active
                                                ? "border-indigo-600 bg-indigo-600 text-white"
                                                : "border-slate-200 bg-white hover:border-indigo-400"
                                            }`}
                                    >

                                        Week {week}

                                    </button>

                                );

                            })}

                        </div>

                    </div>

                </FormGrid>

            </FormSection>

        </div>

    );

}



function calculateDuration(start, end) {

    if (!start || !end) return "";

    const [sh, sm] = start.split(":").map(Number);

    const [eh, em] = end.split(":").map(Number);

    let total = (eh * 60 + em) - (sh * 60 + sm);

    if (total < 0) {

        total += 24 * 60;

    }

    const hours = Math.floor(total / 60);

    const minutes = total % 60;

    return `${hours}h ${minutes}m`;

}

function Days() {
    return (
      <>
        <option value="">Select</option>
  
        <option>Sunday</option>
        <option>Monday</option>
        <option>Tuesday</option>
        <option>Wednesday</option>
        <option>Thursday</option>
        <option>Friday</option>
        <option>Saturday</option>
  
      </>
    );
  }