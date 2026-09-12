"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ReceiptIndianRupee } from "lucide-react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import categoryService from "@/app/allservice/expense/categoryService";
import ReceiptPicker from "../components/ReceiptPicker";
import { createReceiptSubmission } from "@/lib/expenses/receipt";
import { uploadReceipt } from "@/app/allservice/expense/receiptService";
import expenseCreationService from "@/app/allservice/expense/expenseCreationService";
import { travelRouteEnabled, resolveTravelRoute } from "@/lib/expenses/travelRoute";
import { BASES } from "@/lib/expense-settings/categoryModel";
import { calculateExpensePolicy, money, requiresQuantity, resolveExpenseRule, validateExpenseInput } from "@/lib/expenses/creationPolicy";
import { getExpensePeriod } from "@/app/allservice/expense/periodService";

const field = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400";
const button = "rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const rupees = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(value);
const gstLabel = (value) => ({ with_gst: "With GST", without_gst: "Without GST" })[value] || value;
const quantityLabel = (basis) => ({ per_person: "Number of Persons / Labour Count", per_day: "Number of Days", per_unit: "Quantity" })[basis] || "Quantity";
function blankForm() {
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return { projectFirestoreId: "", categoryId: "", date, description: "", locationType: "", gstType: "", quantity: "", amount: "", billUrl: "", travelFrom: "", travelTo: "" };
}

export default function AddExpensePage() {
  const { company, firebaseUser, can } = useAuth();
  if (!can("expense.create")) return <p className="p-6">You do not have permission to create expenses.</p>;
  if (!company?.id || !firebaseUser) return <p className="p-6">Loading…</p>;
  return <AddExpenseForm key={`${company.id}:${firebaseUser.uid}`} />;
}

function AddExpenseForm() {
  const router = useRouter();
  const { can } = useAuth();
  const [form, setForm] = useState(blankForm);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [submitterType, setSubmitterType] = useState("employee");
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitStage, setSubmitStage] = useState("");
  const [periodState, setPeriodState] = useState(null);
  const receiptSubmit = useRef(createReceiptSubmission(uploadReceipt));
  const inFlight = useRef(false);
  const requestId = useRef(null);

  useEffect(() => { let active = true; getExpensePeriod(form.date.slice(0, 7)).then((value) => active && setPeriodState(value)).catch(() => active && setPeriodState(null)); return () => { active = false; }; }, [form.date]);

  useEffect(() => {
    let active = true;
    setLoading(true); setLoadError("");
    Promise.all([categoryService.list(), expenseCreationService.references()])
      .then(([categoryData, references]) => {
        if (!active) return;
        setCategories(categoryData.categories.filter((category) => category.active === true));
        setProjects(references.projects); setEmployeeName(references.employeeName); setSubmitterType(references.submitterType || "employee");
      })
      .catch((failure) => { if (active) setLoadError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const category = categories.find((item) => item.id === form.categoryId);
  const selection = {
    ...(category?.conditions.locationEnabled ? { locationType: form.locationType } : {}),
    ...(category?.conditions.gstEnabled ? { gstType: form.gstType } : {}),
  };
  let rule = null;
  let ruleError = "";
  if (category) {
    try { rule = resolveExpenseRule(category, selection); }
    catch (failure) { ruleError = failure.message.replace(/^INVALID_EXPENSE: /, ""); }
  }
  const needsQuantity = rule && requiresQuantity(category, rule);
  const actualAmount = Number(form.amount);
  let policy = null;
  let policyError = "";
  if (rule) {
    try { policy = calculateExpensePolicy(category, { ...selection, ...(needsQuantity ? { quantity: Number(form.quantity) } : {}), amount: actualAmount }); }
    catch (failure) { policyError = failure.message.replace(/^INVALID_EXPENSE: /, ""); }
  }
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const ready = !loading && !loadError && categories.length > 0 && projects.length > 0;

  async function submit(event) {
    event.preventDefault();
    if (inFlight.current || !ready || periodState?.status === "locked") return;
    inFlight.current = true; setSubmitting(true); setError("");
    try {
      if (!category || !rule) throw new Error(ruleError || "Select a configured category.");
      requestId.current ||= crypto.randomUUID();
      const input = validateExpenseInput({ requestId: requestId.current,
        projectFirestoreId: form.projectFirestoreId, categoryId: form.categoryId, date: form.date,
        description: form.description, amount: Number(form.amount), billUrl: form.billUrl,
        ...resolveTravelRoute(category, form), ...selection, ...(needsQuantity ? { quantity: Number(form.quantity) } : {}),
      });
      calculateExpensePolicy(category, input);
      await receiptSubmit.current({ input, file: receiptFile, save: expenseCreationService.create, onStage: setSubmitStage });
      setReceiptFile(null);
      toast.success(submitterType === "owner" ? "Owner expense recorded and approved." : "Expense submitted for approval.");
      setForm(blankForm()); requestId.current = null;
      // Returning to the list remounts its existing getDocs loader.
      if (can("expense.view")) { router.replace("/manager/expenses"); router.refresh(); }
    } catch (failure) { setError(failure.message.replace(/^INVALID_EXPENSE: /, "")); }
    finally { setSubmitting(false); inFlight.current = false; }
  }

  return <div className="mx-auto max-w-4xl space-y-5 px-4 pb-6 text-slate-700">
    <header><h1 className="flex items-center gap-2 text-2xl font-bold"><ReceiptIndianRupee className="text-blue-600" />Add Expense</h1><p className="mt-1 text-sm text-slate-500">{submitterType === "owner" ? `Submitting as company owner${employeeName ? ` — ${employeeName}` : ""}. Owner expenses are automatically approved; reimbursement remains separate.` : `${employeeName ? `Submitting as ${employeeName}. ` : ""}Expenses are submitted for manager approval.`}</p></header>
    {loading && <p role="status">Loading projects and expense categories…</p>}
    {loadError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}<button type="button" onClick={() => setReload((value) => value + 1)} className={`${button} ml-2`}>Retry</button></div>}
    {!loading && !loadError && (!categories.length || !projects.length) && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">{!categories.length ? "No active expense categories. Ask an authorized manager to configure Expense Setup." : "No company projects are available. Create a project before submitting an expense."}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {periodState?.status === "locked" && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{periodState.label} is locked for expense submission. Choose an open expense date.</p>}
    <form onSubmit={submit} className="rounded-2xl border border-white bg-[#F9FAFC] p-6 shadow-sm">
      <fieldset disabled={submitting || !ready} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Project *<select required className={field} value={form.projectFirestoreId} onChange={(event) => update("projectFirestoreId", event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.projectFirestoreId} value={project.projectFirestoreId}>{project.projectName} ({project.projectId})</option>)}</select></label>
          <label className="text-sm font-medium">Category *<select required className={field} value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value, locationType: "", gstType: "", quantity: "", amount: "", travelFrom: "", travelTo: "" })}><option value="">Select category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm font-medium">Expense Date *<input required type="date" className={field} value={form.date} onChange={(event) => update("date", event.target.value)} /></label>
        </div>
        <label className="block text-sm font-medium">Description<textarea maxLength={2000} rows={3} className={field} value={form.description} onChange={(event) => update("description", event.target.value)} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          {category?.conditions.locationEnabled && <label className="text-sm font-medium">Location *<select required className={field} value={form.locationType} onChange={(event) => { update("locationType", event.target.value); update("quantity", ""); }}><option value="">Select location</option>{category.locationOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>}
          {category?.conditions.gstEnabled && <label className="text-sm font-medium">GST Type *<select required className={field} value={form.gstType} onChange={(event) => { update("gstType", event.target.value); update("quantity", ""); }}><option value="">Select GST type</option>{category.gstOptions.map((option) => <option key={option} value={option}>{gstLabel(option)}</option>)}</select></label>}
        </div>
        {ruleError && <p className="text-sm text-slate-500">{ruleError}</p>}
        {travelRouteEnabled(category) && <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium">From *<input required maxLength={300} placeholder="Enter starting location" className={field} value={form.travelFrom} onChange={(event) => update("travelFrom", event.target.value)} /></label>
          <label className="text-sm font-medium">To *<input required maxLength={300} placeholder="Enter destination" className={field} value={form.travelTo} onChange={(event) => update("travelTo", event.target.value)} /></label>
        </div>}
        {rule && category.calculationType !== "actual" && <div className="rounded-xl border border-blue-100 bg-blue-50 p-4"><p className="text-sm text-blue-700">{category.calculationType === "fixed_limit" ? "Configured Limit" : "Allowed Rate"}</p><p className="mt-1 text-xl font-bold text-blue-800">{rupees(rule.amount)}{category.calculationType === "per_unit" ? ` / ${BASES[rule.basis].replace("Per ", "")}` : ""}</p></div>}
        {needsQuantity && <label className="block text-sm font-medium">{quantityLabel(rule.basis)} *<input required type="number" min={rule.basis === "per_person" ? "1" : "0.001"} max="1000000000" step={rule.basis === "per_person" ? "1" : "any"} className={field} value={form.quantity} onChange={(event) => update("quantity", event.target.value)} /></label>}
        {category && <label className="block text-sm font-medium">{category.calculationType === "actual" ? "Expense Amount" : "Actual Expense Amount"} (₹) *<input required type="number" min="0.01" step="0.01" className={field} value={form.amount} onChange={(event) => update("amount", event.target.value)} /></label>}
        {policyError && <p className="text-sm text-slate-500">{policyError}</p>}
        <ReceiptPicker file={receiptFile} onChange={(file) => setReceiptFile(file)} disabled={submitting} />
        {policy && <section aria-label="Expense Summary" aria-live="polite" className={`rounded-xl border p-4 ${policy.policyExceeded ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <h2 className="mb-3 font-bold">Expense Summary</h2><dl className="grid grid-cols-2 gap-2 text-sm">
            <dt>Category</dt><dd>{category.name}</dd>
            {selection.locationType && <><dt>Location</dt><dd>{selection.locationType}</dd></>}
            {selection.gstType && <><dt>GST Type</dt><dd>{gstLabel(selection.gstType)}</dd></>}
            {policy.allowedAmount !== undefined ? <><dt>{category.calculationType === "fixed_limit" ? "Policy Limit" : "Allowed Amount"}</dt><dd>{rupees(policy.allowedAmount)}</dd></> : <><dt>Policy</dt><dd>Actual expense — no monetary limit</dd></>}
            <dt>Requested Amount</dt><dd>{form.amount !== "" ? rupees(actualAmount) : "Enter an amount"}</dd>
            {category.calculationType === "per_unit" && form.amount !== "" && <><dt>Difference (actual − allowed)</dt><dd>{rupees(money(actualAmount - policy.allowedAmount))}</dd></>}
            {policy.policyExceeded && <><dt className="font-semibold text-amber-800">Over Policy</dt><dd className="font-semibold text-amber-800">{rupees(policy.excessAmount)}</dd></>}
          </dl>
          {policy.policyExceeded ? <p className="mt-3 text-sm text-amber-800">Amount exceeds configured limit by {rupees(policy.excessAmount)}. You can still submit it for manager approval.</p> : policy.allowedAmount !== undefined && actualAmount > 0 ? <p className="mt-3 text-sm text-emerald-700">Within policy</p> : null}
        </section>}
        <div className="flex justify-end gap-2"><button type="button" className={`${button} bg-slate-100`} onClick={() => can("expense.view") ? router.push("/manager/expenses") : router.back()}>Cancel</button><button type="submit" disabled={!policy || periodState?.status === "locked"} className={`${button} bg-blue-600 text-white`}>{submitting ? submitStage || "Submitting…" : "Submit Expense"}</button></div>
      </fieldset>
    </form>
  </div>;
}
