"use client";

import { useEffect, useRef, useState } from "react";
import { Save, LoaderCircle } from "lucide-react";
import AttendanceService from "../services/AttendanceService";
import { attendanceMonthKey } from "../../services/attendanceDateTime";

const statuses = ["present", "late", "halfday", "leave", "absent", "holiday", "weeklyoff", "pending"];
const inputClass = "rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400";

export default function AttendanceCorrection({ companyId, employees, onSaved }) {
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState(attendanceMonthKey);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const [rowStates, setRowStates] = useState({}), [rowErrors, setRowErrors] = useState({});
  const generation = useRef(0), savingLock = useRef(false);
  useEffect(() => {
    generation.current += 1;
    setRows([]); setError(""); setMessage(""); setRowStates({}); setRowErrors({}); setLoading(false);
    return () => { generation.current += 1; };
  }, [companyId, employeeId, month]);
  const dirtyCount = rows.filter((row) => Object.values(row._dirty).some(Boolean)).length;

  async function loadAttendance() {
    if (!employeeId || !month) { setError("Select an employee and month."); return; }
    const request = ++generation.current;
    setLoading(true); setError(""); setMessage(""); setRows([]); setRowErrors({}); setRowStates({});
    try {
      const data = await AttendanceService.getEmployeeMonthlyAttendance({ companyId, employeeId, month });
      if (request === generation.current) setRows(data);
    } catch (failure) {
      if (request === generation.current) setError(failure.message || "Unable to load attendance.");
    } finally { if (request === generation.current) setLoading(false); }
  }
  function updateRow(index, field, value) {
    setRows((previous) => previous.map((row, i) => i !== index ? row : { ...row, [field]: value, _dirty: { ...row._dirty, [field]: value !== row._initial[field] } }));
    setMessage("");
  }
  async function handleSave() {
    if (savingLock.current || !dirtyCount) return;
    savingLock.current = true;
    const request = generation.current;
    setSaving(true); setError(""); setMessage(""); setRowErrors({});
    try {
      const result = await AttendanceService.saveMonthlyAttendanceBatch({ companyId, employeeFirestoreId: employeeId, month, rows,
        onProgress: (id, state) => { if (request === generation.current) setRowStates((current) => ({ ...current, [id]: state })); },
      });
      if (request !== generation.current) return;
      setRowErrors(result.errors);
      // A successful row must not be resubmitted if refreshing or another row fails.
      setRows((current) => current.map((row) => result.saved.includes(row._key) ? { ...row, _initial: { checkIn: row.checkIn, checkOut: row.checkOut, status: row.status, remarks: row.remarks }, _dirty: {} } : row));
      const fresh = await AttendanceService.getEmployeeMonthlyAttendance({ companyId, employeeId, month });
      if (request !== generation.current) return;
      setRows(fresh.map((row) => result.errors[row._key] ? rows.find((old) => old._key === row._key) : row));
      setMessage(`${result.saved.length} correction${result.saved.length === 1 ? "" : "s"} saved.`);
      if (Object.keys(result.errors).length) setError("Some corrections could not be saved. Your unsaved edits are retained below.");
      if (result.saved.length) onSaved?.();
    } catch (failure) {
      if (request === generation.current) setError(failure.message || "Unable to save or reload corrections. Please reload to verify saved records.");
    } finally { savingLock.current = false; setSaving(false); }
  }
  return <section className="mt-8 space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-8">
    <header><h2 className="text-2xl font-bold text-slate-800">Monthly Attendance Correction</h2><p className="mt-1 text-sm text-slate-500">Load an employee’s month to correct attendance or add a missing day. Only edited rows are saved.</p></header>
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
      <label className="space-y-2 text-sm font-medium text-slate-700"><span className="block">Employee</span><select aria-label="Employee" value={employeeId} disabled={saving} onChange={(event) => setEmployeeId(event.target.value)} className={`${inputClass} w-full`}><option value="">Select Employee</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>
      <label className="space-y-2 text-sm font-medium text-slate-700"><span className="block">Month</span><input aria-label="Month" type="month" value={month} disabled={saving} onChange={(event) => setMonth(event.target.value)} className={`${inputClass} w-full`} /></label>
      <div className="flex items-end"><button type="button" onClick={loadAttendance} disabled={loading || saving || !companyId} className="w-full rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{loading ? "Loading…" : "Load Attendance"}</button></div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-green-700">{message}</p>}
    {loading && <div role="status" aria-label="Loading monthly attendance" className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-200" />)}</div>}
    {rows.length > 0 && <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-100 text-slate-600"><tr>{["Date", "Day", "Check In", "Check Out", "Status", "Approval / Review", "GPS", "Remarks"].map((label) => <th key={label} scope="col" className="px-4 py-3">{label}</th>)}</tr></thead><tbody>
        {rows.map((row, index) => <tr key={row._key} className="border-t border-slate-100" aria-busy={rowStates[row._key] === "saving"}>
          <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.date}{!row.exists && <p className="mt-1 text-xs text-slate-400">No record yet</p>}{rowStates[row._key] && <p className={`mt-1 text-xs ${rowStates[row._key] === "error" ? "text-red-600" : "text-blue-600"}`}>{rowStates[row._key] === "saving" ? "Saving…" : rowStates[row._key] === "saved" ? "Saved" : "Not saved"}</p>}{rowErrors[row._key] && <p role="alert" className="mt-1 max-w-48 whitespace-normal text-xs text-red-600">{rowErrors[row._key]}</p>}</td>
          <td className="px-4 py-3 text-slate-500">{new Date(`${row.date}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" })}</td>
          {["checkIn", "checkOut"].map((field) => <td key={field} className="px-2 py-2"><input type="time" aria-label={`${field === "checkIn" ? "Check In" : "Check Out"} ${row.date}`} value={row[field]} disabled={saving} onChange={(event) => updateRow(index, field, event.target.value)} className={inputClass} /></td>)}
          <td className="px-2 py-2"><select aria-label={`Status ${row.date}`} value={row.status} disabled={saving} onChange={(event) => updateRow(index, "status", event.target.value)} className={inputClass}><option value="">—</option>{row.status && !statuses.includes(row.status) && <option value={row.status}>{row.status}</option>}{statuses.map((status) => <option key={status} value={status}>{status === "halfday" ? "Half Day" : status === "weeklyoff" ? "Weekly Off" : status[0].toUpperCase() + status.slice(1)}</option>)}</select></td>
          <td className="px-4 py-3 capitalize text-slate-600">{row.approvalStatus || "—"}{row.requiresManagerReview && <p className="mt-1 text-xs text-amber-700">Review required</p>}{row.reviewStatus && row.reviewStatus !== row.approvalStatus && <p className="mt-1 text-xs text-slate-400">Review: {row.reviewStatus}</p>}</td>
          <td className="px-4 py-3 text-slate-600">{row.gpsValid === true ? "Valid" : row.gpsValid === false ? "Invalid" : "—"}</td>
          <td className="px-2 py-2"><input type="text" aria-label={`Remarks ${row.date}`} value={row.remarks} maxLength={500} disabled={saving} onChange={(event) => updateRow(index, "remarks", event.target.value)} placeholder="Remarks" className={`${inputClass} w-52`} /></td>
        </tr>)}
      </tbody></table></div>
      <footer className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-semibold text-slate-800">{rows.filter((row) => row.exists).length} Attendance records loaded</p><p className="mt-1 text-sm text-slate-500">{dirtyCount} changed {dirtyCount === 1 ? "row" : "rows"} · Times shown in IST</p></div><button type="button" onClick={handleSave} disabled={saving || loading || !dirtyCount} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />}{saving ? "Saving…" : "Save All Changes"}</button></footer>
    </>}
  </section>;
}
