"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp, getDocs, doc, updateDoc } from "firebase/firestore";

export default function ShiftPolicy() {

    const getCompanyId = () => {
        const stored = localStorage.getItem("adminUser");
    
        if (!stored) return null;
    
        try {
            const user = JSON.parse(stored);
            return user.companyDocId; // ✅ ONLY THIS
        } catch {
            return null;
        }
    };

    const companyId = getCompanyId();

    const [form, setForm] = useState({
        name: "",
        code: "",
        start: "",
        end: "",
        duration: "",
        isNight: "No",

        breakStart: "",
        breakEnd: "",
        breakDuration: "",

        weeklyOff1: "",
        weeklyOff2: "",

        weekNumbers: [],

        lateBuffer: "00:15",
        earlyBuffer: "00:15",

        halfDayHours: "08:30",
        absentHours: "04:15",

        late1: "00:00",
        late2: "00:00",
        late3: "00:00",
        late4: "00:00",

        early1: "00:00",
        early2: "00:00",
        early3: "00:00",
        early4: "00:00",
    });

    // ✅ ADDED
    const [shifts, setShifts] = useState([]);
    const [editId, setEditId] = useState(null);

    // ✅ ADDED
    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        const snap = await getDocs(
            collection(db, "Companies", companyId, "ShiftPolicies")
        );
        const data = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        }));
        setShifts(data);
    };

    // ✅ ADDED
    const handleEdit = (shift) => {
        setEditId(shift.id);

        setForm({
            ...form,

            name: shift.name || "",
            code: shift.code || "",
            start: shift.timing?.start || "",
            end: shift.timing?.end || "",
            duration: shift.timing?.duration || "",
            isNight: shift.isNight || "No",

            breakStart: shift.break?.start || "",
            breakEnd: shift.break?.end || "",
            breakDuration: shift.break?.duration || "",

            weeklyOff1: shift.weeklyOff?.primary || "",
            weeklyOff2: shift.weeklyOff?.secondary || "",
            weekNumbers: shift.weeklyOff?.weeks || [],

            lateBuffer: shift.policy?.lateBuffer || "00:15",
            earlyBuffer: shift.policy?.earlyBuffer || "00:15",
            halfDayHours: shift.policy?.halfDay || "08:30",
            absentHours: shift.policy?.absent || "04:15",

            late1: shift.rules?.late?.[0] || "00:00",
            late2: shift.rules?.late?.[1] || "00:00",
            late3: shift.rules?.late?.[2] || "00:00",
            late4: shift.rules?.late?.[3] || "00:00",

            early1: shift.rules?.early?.[0] || "00:00",
            early2: shift.rules?.early?.[1] || "00:00",
            early3: shift.rules?.early?.[2] || "00:00",
            early4: shift.rules?.early?.[3] || "00:00",
        });
    };

    //////////////////////////////////////////////////
    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    //////////////////////////////////////////////////
    const handleWeekChange = (e) => {
        const week = e.target.value;

        let updated = form.weekNumbers || [];

        if (e.target.checked) {
            updated.push(week);
        } else {
            updated = updated.filter((w) => w !== week);
        }

        setForm({ ...form, weekNumbers: updated });
    };

    //////////////////////////////////////////////////
    const calculateDuration = (start, end) => {
        if (!start || !end) return "";

        const [sh, sm] = start.split(":").map(Number);
        const [eh, em] = end.split(":").map(Number);

        let total = (eh * 60 + em) - (sh * 60 + sm);
        if (total < 0) total += 24 * 60;

        const h = Math.floor(total / 60);
        const m = total % 60;

        return `${h}h ${m}m`;
    };

    useEffect(() => {
        const duration = calculateDuration(form.start, form.end);
        setForm((prev) => ({ ...prev, duration }));
    }, [form.start, form.end]);

    //////////////////////////////////////////////////
    const handleSave = async () => {
        try {

            if (!form.name || !form.start || !form.end) {
                alert("Please fill required fields");
                return;
            }

            ////////////////////////////////////////////
            // ✅ NEW LOGIC (WITHOUT REMOVING OLD DATA)
            ////////////////////////////////////////////

            let weeklyOffData = {
                primary: form.weeklyOff1,
                secondary: form.weeklyOff2,
                weeks: form.weekNumbers,
            };

            // NEW structured logic (ADDED, not replaced)
            let weeklyOffConfig = {};

            if (form.weeklyOff1) {
                weeklyOffConfig[form.weeklyOff1] = {
                    type: "all"
                };
            }

            if (form.weeklyOff2) {
                weeklyOffConfig[form.weeklyOff2] = {
                    type: "custom",
                    weeks: form.weekNumbers || []
                };
            }

            // ✅ ADD BEFORE addDoc
            let docRef;

            if (editId) {
                await updateDoc(doc(db, "Companies", companyId, "ShiftPolicies", editId), {
                    name: form.name,
                    code: form.code,
                    timing: {
                        start: form.start,
                        end: form.end,
                        duration: form.duration,
                    },
                    break: {
                        start: form.breakStart,
                        end: form.breakEnd,
                        duration: form.breakDuration,
                    },
                    policy: {
                        lateBuffer: form.lateBuffer,
                        earlyBuffer: form.earlyBuffer,
                        halfDay: form.halfDayHours,
                        absent: form.absentHours,
                    },
                    rules: {
                        late: [form.late1, form.late2, form.late3, form.late4],
                        early: [form.early1, form.early2, form.early3, form.early4],
                    },
                    weeklyOff: weeklyOffData,
                    weeklyOffConfig: weeklyOffConfig,
                    isNight: form.isNight,
                    updatedAt: Timestamp.now(),
                });

                alert("Shift Updated ✅");

            } else {
                await addDoc(collection(db, "Companies", companyId, "ShiftPolicies"), {
                    name: form.name,
                    code: form.code,
                    timing: {
                        start: form.start,
                        end: form.end,
                        duration: form.duration,
                    },
                    break: {
                        start: form.breakStart,
                        end: form.breakEnd,
                        duration: form.breakDuration,
                    },
                    policy: {
                        lateBuffer: form.lateBuffer,
                        earlyBuffer: form.earlyBuffer,
                        halfDay: form.halfDayHours,
                        absent: form.absentHours,
                    },
                    rules: {
                        late: [form.late1, form.late2, form.late3, form.late4],
                        early: [form.early1, form.early2, form.early3, form.early4],
                    },
                    weeklyOff: weeklyOffData,
                    weeklyOffConfig: weeklyOffConfig,
                    isNight: form.isNight,
                    createdAt: Timestamp.now(),
                });

                alert("Shift Saved ✅");
            }

            alert("Shift Policy Saved ✅");

        } catch (err) {
            console.error(err);
            alert("Error saving");
        }

        // ✅ ADD AT END OF handleSave
        setForm({
            name: "",
            code: "",
            start: "",
            end: "",
            duration: "",
            isNight: "No",

            breakStart: "",
            breakEnd: "",
            breakDuration: "",

            weeklyOff1: "",
            weeklyOff2: "",
            weekNumbers: [],

            lateBuffer: "00:15",
            earlyBuffer: "00:15",

            halfDayHours: "08:30",
            absentHours: "04:15",

            late1: "00:00",
            late2: "00:00",
            late3: "00:00",
            late4: "00:00",

            early1: "00:00",
            early2: "00:00",
            early3: "00:00",
            early4: "00:00",
        });

        setEditId(null);
        fetchShifts();
    };

    //////////////////////////////////////////////////

    return (
        <div className="min-h-screen">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">

                    <h3 className="text-sm font-semibold">Shift List</h3>

                    {shifts.map((s) => (
                        <div
                            key={s.id}
                            onClick={() => handleEdit(s)}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                            <p className="text-sm font-medium">{s.name}</p>
                            <p className="text-xs text-gray-400">
                                {s.timing?.start} → {s.timing?.end}
                            </p>
                        </div>
                    ))}

                </div>

                <div className="md:col-span-2 bg-white rounded-2xl shadow-sm p-6 space-y-6">

                    <h2 className="text-lg font-semibold text-gray-800">
                        Create Shift Policy
                    </h2>

                    {/* SHIFT INFO */}
                    <Section title="Shift Info">
                        <Grid>
                            <Input label="Shift Name" name="name" value={form.name} onChange={handleChange} />
                            <Input label="Shift Code" name="code" value={form.code} onChange={handleChange} />
                            <Input type="time" label="Start Time" name="start" value={form.start} onChange={handleChange} />
                            <Input type="time" label="End Time" name="end" value={form.end} onChange={handleChange} />
                            <Input label="Shift Duration" value={form.duration} readOnly />

                            <Select name="isNight" value={form.isNight} onChange={handleChange}>
                                <option>No</option>
                                <option>Yes</option>
                            </Select>
                        </Grid>
                    </Section>

                    {/* BREAK */}
                    <Section title="Break Details">
                        <Grid>
                            <Input type="time" label="Break Start" name="breakStart" onChange={handleChange} />
                            <Input type="time" label="Break End" name="breakEnd" onChange={handleChange} />
                            <Input label="Break Duration (min)" name="breakDuration" onChange={handleChange} />
                        </Grid>
                    </Section>

                    {/* OFFICE POLICY */}
                    <Section title="Office Time Policy">
                        <Grid>
                            <TimePicker label="Late Buffer" value={form.lateBuffer} onChange={(v) => setForm({ ...form, lateBuffer: v })} />
                            <TimePicker label="Early Buffer" value={form.earlyBuffer} onChange={(v) => setForm({ ...form, earlyBuffer: v })} />
                            <TimePicker label="Half Day If <" value={form.halfDayHours} onChange={(v) => setForm({ ...form, halfDayHours: v })} />
                            <TimePicker label="Absent If <" value={form.absentHours} onChange={(v) => setForm({ ...form, absentHours: v })} />
                        </Grid>
                    </Section>

                    {/* WEEKLY OFF */}
                    <Section title="Weekly Off Policy">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            <Select name="weeklyOff1" value={form.weeklyOff1} onChange={handleChange} />
                            <Select name="weeklyOff2" value={form.weeklyOff2} onChange={handleChange} />

                            <div>
                                <label className="text-xs text-gray-500">Applicable Weeks</label>

                                <div className="flex gap-3 mt-2">
                                    {[1, 2, 3, 4, 5].map((w) => (
                                        <label key={w} className="flex gap-1 text-sm">
                                            <input
                                                type="checkbox"
                                                value={w}
                                                checked={form.weekNumbers.includes(String(w))}
                                                onChange={handleWeekChange}
                                            />
                                            {w}
                                        </label>
                                    ))}
                                </div>

                            </div>

                        </div>
                    </Section>

                    <button
                        onClick={handleSave}
                        className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700"
                    >
                        {editId ? "Update Shift" : "Save Shift"}
                    </button>

                </div>

            </div>


        </div>
    );
}

//////////////////////////////////////////////////////////

function TimePicker({ label, value = "00:00", onChange }) {
    const [h, m] = value.split(":");

    return (
        <div>
            <label className="text-xs text-gray-500">{label}</label>
            <div className="flex gap-2 mt-1">

                <select value={h} onChange={(e) => onChange(`${e.target.value}:${m}`)} className="input">
                    {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={String(i).padStart(2, "0")}>
                            {String(i).padStart(2, "0")}
                        </option>
                    ))}
                </select>

                <select value={m} onChange={(e) => onChange(`${h}:${e.target.value}`)} className="input">
                    {[0, 5, 10, 15, 20, 30, 45].map(m => (
                        <option key={m} value={String(m).padStart(2, "0")}>
                            {String(m).padStart(2, "0")}
                        </option>
                    ))}
                </select>

            </div>
        </div>
    );
}

function Section({ title, children }) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">{title}</h3>
            {children}
        </div>
    );
}

function Grid({ children }) {
    return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{children}</div>;
}

function Input({ label, ...props }) {
    return (
        <div>
            <label className="text-xs text-gray-500">{label}</label>
            <input {...props} className="input" />
        </div>
    );
}

function Select({ label, children, ...props }) {
    return (
        <div>
            <label className="text-xs text-gray-500">{label}</label>
            <select {...props} className="input">
                {children || (
                    <>
                        <option value="" disabled>Select</option>
                        <option>Sunday</option>
                        <option>Monday</option>
                        <option>Tuesday</option>
                        <option>Wednesday</option>
                        <option>Thursday</option>
                        <option>Friday</option>
                        <option>Saturday</option>
                    </>
                )}
            </select>
        </div>
    );
}