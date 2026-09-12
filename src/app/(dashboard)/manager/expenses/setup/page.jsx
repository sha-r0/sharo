"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Settings2, Lock, Unlock } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import categoryService from "@/app/allservice/expense/categoryService";
import { BASES, CALCULATION_TYPES, generateRules, validateCategory } from "@/lib/expense-settings/categoryModel";
import { getExpensePeriod, setExpensePeriod } from "@/app/allservice/expense/periodService";

const panel = "rounded-2xl border border-white bg-[#F9FAFC] p-5 shadow-sm";
const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400";
const button = "rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed";
const gstLabel = (value) => value === "with_gst" ? "With GST" : value === "without_gst" ? "Without GST" : "";
function emptyCategory() {
  const conditions = { locationEnabled: false, gstEnabled: false };
  return { name: "", description: "", active: true, travelRouteEnabled: false, calculationType: "fixed_limit", conditions, rules: generateRules(conditions) };
}

export default function ExpenseSetupPage() {
  const { company, currentUser, can } = useAuth();
  const allowed = can("expense.manage");
  // Remount on identity/tenant changes so an open form cannot cross companies.
  if (!allowed) return <div className={panel}>You do not have permission to manage expense categories.</div>;
  if (!company?.id) return <div className={panel}>Loading Expense Setup…</div>;
  return <ExpenseSetup key={`${company.id}:${currentUser?.uid}`} />;
}

function ExpenseSetup() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const formRef = useRef(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [periodState, setPeriodState] = useState(null);
  const [periodBusy, setPeriodBusy] = useState(false);

  useEffect(() => { let active = true; getExpensePeriod(period).then((value) => active && setPeriodState(value)).catch(() => active && setPeriodState(null)); return () => { active = false; }; }, [period]);
  async function changePeriod(action) {
    const reason = window.prompt(`${action === "lock" ? "Why is this period closing?" : "Reason for reopening this period?"}`);
    if (reason === null) return;
    setPeriodBusy(true);
    try { setPeriodState(await setExpensePeriod(period, action, reason)); toast.success(action === "lock" ? "Expense period locked." : "Expense period unlocked."); }
    catch (failure) { toast.error(failure.message); }
    finally { setPeriodBusy(false); }
  }

  useEffect(() => {
    let active = true;
    categoryService.list().then((result) => { if (active) setCategories(result.categories); })
      .catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { if (draft) formRef.current?.focus(); }, [editingId, Boolean(draft)]);

  async function refresh() {
    setLoading(true);
    setError("");
    try { setCategories((await categoryService.list()).categories); }
    catch (failure) { setError(failure.message); }
    finally { setLoading(false); }
  }

  async function save(category, id, closeForm = false) {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const input = { name: category.name, description: category.description, active: category.active,
        travelRouteEnabled: category.travelRouteEnabled ?? false, calculationType: category.calculationType, conditions: category.conditions,
        rules: category.rules.map((rule) => ({ ...rule, amount: category.calculationType === "actual" ? 0 : rule.amount === "" ? NaN : Number(rule.amount) })) };
      validateCategory(input);
      await categoryService.save(input, id);
      if (closeForm) { setDraft(null); setEditingId(null); }
      toast.success(id ? "Category updated." : "Category created.");
      await refresh();
    } catch (failure) { setError(failure.message.replace(/^INVALID_CATEGORY: /, "")); }
    finally { setBusy(false); saving.current = false; }
  }

  function configure(key, value) {
    setDraft((current) => {
      const conditions = { ...current.conditions, [key]: value };
      return { ...current, conditions, rules: generateRules(conditions, current.rules).map((rule) => ({ ...rule, amount: current.calculationType === "actual" ? 0 : rule.amount })) };
    });
  }

  return <div className="space-y-5 px-4 pb-6 text-slate-700">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Settings2 className="text-blue-600" />Expense Setup</h1><p className="mt-1 text-sm text-slate-500">Configure categories, limits, and calculation rules.</p></div>
      <button disabled={busy || Boolean(draft)} onClick={() => { setEditingId(null); setDraft(emptyCategory()); setError(""); }} className={`${button} flex items-center gap-2 bg-blue-600 text-white`}><Plus size={17} />Add Category</button>
    </header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className={panel} aria-label="Expense Period Control"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-bold">Expense Period Control</h2><p className="mt-1 text-sm text-slate-500">Lock submission after month-end review. Approval and reimbursement remain available.</p></div><div className="flex items-center gap-2"><input aria-label="Expense period" type="month" value={period} onChange={(event) => setPeriod(event.target.value)} className={field.replace("mt-1 ", "")} /><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${periodState?.status === "locked" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{periodState?.status === "locked" ? <Lock size={13} /> : <Unlock size={13} />}{periodState?.status === "locked" ? "LOCKED" : "OPEN"}</span><button disabled={periodBusy || !periodState} onClick={() => changePeriod(periodState.status === "locked" ? "unlock" : "lock")} className={`${button} ${periodState?.status === "locked" ? "bg-slate-100" : "bg-amber-600 text-white"}`}>{periodBusy ? "Saving…" : periodState?.status === "locked" ? "Unlock Period" : "Lock Period"}</button></div></div>{periodState?.status === "locked" && <p className="mt-3 text-xs text-slate-500">Locked {periodState.lockedByName ? `by ${periodState.lockedByName}` : ""}{periodState.lockReason ? ` · ${periodState.lockReason}` : ""}</p>}</section>
    {draft && <form ref={formRef} tabIndex={-1} aria-label={editingId ? "Edit category" : "Add category"} className={`${panel} space-y-5`} onSubmit={(event) => { event.preventDefault(); save(draft, editingId, true); }}>
      <h2 className="text-lg font-bold">{editingId ? "Edit Category" : "Add Category"}</h2>
      <fieldset disabled={busy} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">Category Name *<input required maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className={field} /></label>
          <label className="text-sm font-medium">Calculation Type<select value={draft.calculationType} onChange={(event) => { const calculationType = event.target.value; setDraft({ ...draft, calculationType, rules: draft.rules.map((rule) => ({ ...rule, amount: calculationType === "actual" ? 0 : draft.calculationType === "actual" ? "" : rule.amount })) }); }} className={field}>{Object.entries(CALCULATION_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        </div>
        <label className="block text-sm font-medium">Description<textarea maxLength={1000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className={field} rows={2} /></label>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.conditions.locationEnabled} onChange={(event) => configure("locationEnabled", event.target.checked)} />Depends on Location</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.conditions.gstEnabled} onChange={(event) => configure("gstEnabled", event.target.checked)} />Depends on GST Type</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.travelRouteEnabled ?? false} onChange={(event) => setDraft({ ...draft, travelRouteEnabled: event.target.checked })} />Requires From / To</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={draft.active} onChange={(event) => setDraft({ ...draft, active: event.target.checked })} />Active</label>
        </div>
        <p className="text-sm text-slate-500">{draft.calculationType === "actual" ? "Use the actual claimed amount; no configured limit or rate. Basis can describe how quantities are recorded." : draft.calculationType === "per_unit" ? "Set the rate and basis for each combination, such as per person or per day." : "Set the allowance limit and basis for each combination."}</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500">{draft.conditions.locationEnabled && <th className="p-2">Location</th>}{draft.conditions.gstEnabled && <th className="p-2">GST Type</th>}<th className="p-2">{draft.calculationType === "actual" ? "Amount" : "Amount / Rate (₹)"}</th><th className="p-2">Basis</th></tr></thead><tbody>
          {draft.rules.map((rule, index) => <tr key={rule.id} className="border-b border-slate-100">
            {draft.conditions.locationEnabled && <td className="p-2">{rule.locationType}</td>}{draft.conditions.gstEnabled && <td className="p-2">{gstLabel(rule.gstType)}</td>}
            <td className="p-2">{draft.calculationType === "actual" ? "Actual claimed amount" : <input aria-label={`Amount ${rule.locationType || "all locations"} ${gstLabel(rule.gstType)}`} type="number" min="0" step="any" required className={field} value={rule.amount} onChange={(event) => setDraft({ ...draft, rules: draft.rules.map((item, i) => i === index ? { ...item, amount: event.target.value } : item) })} />}</td>
            <td className="p-2"><select aria-label={`Basis ${rule.locationType || "all locations"} ${gstLabel(rule.gstType)}`} className={field} value={rule.basis} onChange={(event) => setDraft({ ...draft, rules: draft.rules.map((item, i) => i === index ? { ...item, basis: event.target.value } : item) })}>{Object.entries(BASES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
          </tr>)}
        </tbody></table></div>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => { setDraft(null); setEditingId(null); setError(""); }} className={`${button} bg-slate-100`}>Cancel</button><button type="submit" className={`${button} bg-blue-600 text-white`}>{busy ? "Saving…" : "Save Category"}</button></div>
      </fieldset>
    </form>}
    <section className={panel} aria-label="Configured categories">
      <div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Configured Categories</h2><button disabled={busy || loading} onClick={refresh} className={`${button} text-blue-600`}>Refresh</button></div>
      {loading ? <p role="status">Loading categories…</p> : !categories.length ? <p className="py-8 text-center text-slate-500">No categories configured. Add a category to get started.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-slate-500">{["Category", "Calculation", "Rules", "Status", "Actions"].map((title) => <th className="p-3" key={title}>{title}</th>)}</tr></thead><tbody>{categories.map((category) => <tr key={category.id} className="border-b border-slate-100">
        <td className="p-3"><div className="font-bold">{category.name}</div><p className="max-w-60 whitespace-pre-wrap break-words text-xs text-slate-500">{category.description}</p></td>
        <td className="p-3">{CALCULATION_TYPES[category.calculationType]}<p className="text-xs text-slate-500">{[category.conditions.locationEnabled && "Location", category.conditions.gstEnabled && "GST"].filter(Boolean).join(" + ") || "General"}</p></td>
        <td className="p-3">{category.rules.map((rule) => <p key={rule.id} className="mb-1">{[rule.locationType, gstLabel(rule.gstType)].filter(Boolean).join(" · ") || "All expenses"}: {category.calculationType === "actual" ? "Actual amount" : `₹${Number(rule.amount).toLocaleString("en-IN")}`} <span className="text-xs text-slate-500">({BASES[rule.basis]})</span></p>)}</td>
        <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${category.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{category.active ? "Active" : "Disabled"}</span></td>
        <td className="p-3"><div className="flex gap-2"><button disabled={busy || Boolean(draft)} onClick={() => { setEditingId(category.id); setDraft(category); setError(""); }} className={`${button} bg-blue-50 text-blue-600`}>Edit</button><button disabled={busy || Boolean(draft)} onClick={() => save({ ...category, active: !category.active }, category.id)} className={`${button} bg-slate-100`}>{category.active ? "Disable" : "Enable"}</button></div></td>
      </tr>)}</tbody></table></div>}
    </section>
  </div>;
}
