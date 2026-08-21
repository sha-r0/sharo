"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import toast from "react-hot-toast";
import AdvanceService from "../services/AdvanceService";

const dateValue = (value) => { const date = typeof value?.toDate === "function" ? value.toDate() : value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : ""; };

export default function AddAdvanceModal({ companyId, projects = [], existing, currentEmployee, onClose }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeFirestoreId: "", advanceType: "Personal", amount: "", monthlyDeduction: "", firstDeductionDate: "", reason: "", projectId: "", purpose: "", requiredDate: "", description: "", priority: "Normal", managerRemarks: "" });
  useEffect(() => {
    if (existing) {
      setForm((current) => ({ ...current, ...existing, amount: String(existing.amount || ""), monthlyDeduction: String(existing.monthlyDeduction || ""), firstDeductionDate: dateValue(existing.firstDeductionDate), requiredDate: dateValue(existing.requiredDate) }));
    } else if (currentEmployee?.id) {
      setForm((current) => ({ ...current, employeeFirestoreId: currentEmployee.id }));
    }
  }, [existing, currentEmployee?.id]);
  const employee = existing;
  const project = useMemo(() => projects.find((item) => item.id === form.projectId), [projects, form.projectId]);
  const amount = Number(form.amount || 0), deduction = Number(form.monthlyDeduction || 0);
  const months = form.advanceType === "Personal" && deduction > 0 ? Math.ceil(amount / deduction) : 0;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (amount <= 0) return toast.error("Enter a valid amount.");
    if (form.advanceType === "Personal" && (deduction <= 0 || deduction > amount || !form.firstDeductionDate)) return toast.error("Enter a valid monthly deduction and first deduction date.");
    if (form.advanceType === "Company" && (!form.projectId || !form.purpose.trim())) return toast.error("Select the project and enter the company-work purpose.");
    setSaving(true);
    try {
      await AdvanceService.save(companyId, { ...form, advanceType: form.advanceType, projectName: project?.projectName || project?.name || "", amount, monthlyDeduction: deduction, months, firstDeductionDate: form.firstDeductionDate ? new Date(form.firstDeductionDate) : null, requiredDate: form.requiredDate ? new Date(form.requiredDate) : null }, existing?.id);
      toast.success(existing ? "Advance updated." : "Advance request submitted."); onClose(true);
    } catch (error) { console.error(error); toast.error("Unable to save advance."); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-900/35 p-4 backdrop-blur-sm"><div className="my-6 w-full max-w-3xl rounded-3xl bg-[#F9FAFC] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 className="text-2xl font-bold text-slate-800">{existing ? "Edit advance" : "Request advance"}</h2><p className="text-sm text-slate-500">Personal salary advance or company work advance</p></div><button onClick={() => onClose(false)} className="rounded-xl p-2 hover:bg-slate-100"><X/></button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Employee" value={existing?.employeeName || employee?.employeeName || currentEmployee?.personalInfo?.fullName || "Current employee"} readOnly/><Select label="Advance type *" value={form.advanceType} onChange={(e) => update("advanceType", e.target.value)} options={[["Personal","Personal advance"],["Company","Company work advance"]]}/><Field label="Amount *" type="number" min="1" value={form.amount} onChange={(e) => update("amount", e.target.value)}/><Select label="Priority" value={form.priority} onChange={(e) => update("priority", e.target.value)} options={[["Normal","Normal"],["High","High"],["Emergency","Emergency"]]}/>{form.advanceType === "Personal" ? <><Field label="Monthly salary deduction *" type="number" min="1" value={form.monthlyDeduction} onChange={(e) => update("monthlyDeduction", e.target.value)}/><Field label="First deduction date *" type="date" value={form.firstDeductionDate} onChange={(e) => update("firstDeductionDate", e.target.value)}/><Field label="Calculated repayment months" value={months || "—"} readOnly/><Field label="Reason" value={form.reason} onChange={(e) => update("reason", e.target.value)}/></> : <><Select label="Project *" value={form.projectId} onChange={(e) => update("projectId", e.target.value)} options={[["","Select project"], ...projects.map((item) => [item.id, item.projectName || item.name || "Unnamed project"])]}/><Field label="Required date" type="date" value={form.requiredDate} onChange={(e) => update("requiredDate", e.target.value)}/><Field label="Work purpose *" value={form.purpose} onChange={(e) => update("purpose", e.target.value)}/><Field label="Description" value={form.description} onChange={(e) => update("description", e.target.value)}/></>}</div><div className="mt-6 flex justify-end gap-3"><button onClick={() => onClose(false)} className="rounded-xl border px-5 py-2.5 font-bold">Cancel</button><button onClick={submit} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : existing ? "Update" : "Submit request"}</button></div></div></div>;
}
function Field({ label, ...props }) { return <label><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><input {...props} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-500"/></label>; }
function Select({ label, options, ...props }) { return <label><span className="mb-2 block text-sm font-bold text-slate-700">{label}</span><select {...props} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 outline-none focus:border-blue-500">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>; }
