"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Download, Search, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { neo } from "../../dashboard/DashboardWidgets";

const tabs = [{ id: "pf", label: "PF / EPFO" }, { id: "esi", label: "ESI / ESIC" }];
const money = (value) => value == null ? "—" : `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const errors = {
  FORBIDDEN: "You do not have permission for this action.",
  UNAUTHENTICATED: "Your session has expired. Sign in again.",
  COMPANY_INACTIVE: "This company is inactive.",
  EXPORT_BLOCKED: "Resolve every flagged employee in this scheme before creating the portal file.",
  SOURCE_TENANT_MISMATCH: "Payroll company information is inconsistent. Contact your administrator.",
  INVALID_MONTH: "Choose a valid month.", EXPORT_TOO_LARGE: "This month exceeds the ESIC Excel row limit.",
};
const errorMessage = (error) => errors[error.message] || "Unable to load compliance data or export. Please retry.";
const currentMonth = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year").value}-${parts.find((part) => part.type === "month").value}`;
};

async function apiRequest(user, companyId, month, options = {}, signal) {
  if (!user) throw new Error("UNAUTHENTICATED");
  const token = await user.getIdToken();
  const response = await fetch(`/api/workforce/esi-pf?${new URLSearchParams({ month, ...options })}`, { headers: { Authorization: `Bearer ${token}`, "X-Company-Id": companyId }, cache: "no-store", signal });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "COMPLIANCE_REQUEST_FAILED");
  }
  return response;
}

function Validation({ data }) {
  if (data.issues.length) return <div className="flex max-w-sm flex-wrap gap-1.5">{data.issues.map((issue) => <span key={issue} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">{issue}</span>)}</div>;
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${data.ready ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{data.ready ? "Ready" : "Not eligible"}</span>;
}

export default function EsiPfPage() {
  const { company, firebaseUser, can } = useAuth();
  const [month, setMonth] = useState(currentMonth), [activeTab, setActiveTab] = useState("pf"), [search, setSearch] = useState("");
  const [result, setResult] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const overrideRef = useRef({ row: null, fields: {}, saving: false, error: "" });
  const [downloadError, setDownloadError] = useState(""), [downloading, setDownloading] = useState(false), [retry, setRetry] = useState(0);
  const downloadController = useRef(null);
  const identity = `${company?.id || ""}:${firebaseUser?.uid || ""}:${month}`;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const canView = can("payroll.view"), canExport = can("payroll.export"), canOverride = can("payroll.manage") || can("payroll.export");
  // Do not render a previous month/tenant's data during an identity change.
  const report = result?.identity === identity && canView ? result.report : null;

  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(""); setDownloadError(""); setLoading(true);
    downloadController.current?.abort(); setDownloading(false);
    if (!company?.id || !firebaseUser || !canView || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) {
      setLoading(false);
      return () => controller.abort();
    }
    apiRequest(firebaseUser, company.id, month, {}, controller.signal).then((response) => response.json())
      .then((payload) => {
        if (payload.companyId !== company.id || payload.month !== month) throw new Error("FORBIDDEN");
        if (!controller.signal.aborted) setResult({ identity, report: payload });
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(errorMessage(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); downloadController.current?.abort(); };
  }, [identity, company?.id, firebaseUser, month, canView, retry]);

  const download = async (format) => {
    if (!report || !canExport || downloading) return;
    const controller = new AbortController();
    downloadController.current = controller;
    setDownloading(true); setDownloadError("");
    try {
      const response = await apiRequest(firebaseUser, company.id, month, { format, scheme: activeTab }, controller.signal);
      const blob = await response.blob();
      if (controller.signal.aborted || identityRef.current !== identity) return;
      const extension = format === "ecr" ? "txt" : format === "esi" ? "xls" : "xlsx";
      const filename = response.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] || `${activeTab}-${month}.${extension}`;
      const url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (!controller.signal.aborted && identityRef.current === identity) setDownloadError(errorMessage(failure));
    } finally { if (downloadController.current === controller) setDownloading(false); }
  };
  const overrideRow = overrideRef.current.row, overrideFields = overrideRef.current.fields, overrideSaving = overrideRef.current.saving, overrideError = overrideRef.current.error;
  const rerender = () => setResult((value) => value ? { ...value } : value);
  const openOverride = (row) => { overrideRef.current = { row, fields: {}, saving: false, error: "" }; rerender(); };
  const saveOverride = async () => {
    if (!overrideRow || !Object.keys(overrideFields).length || overrideSaving) return;
    overrideRef.current.saving = true; overrideRef.current.error = ""; rerender();
    try {
      const token = await firebaseUser.getIdToken();
      const response = await fetch("/api/workforce/esi-pf/overrides", { method: "POST", headers: { Authorization: `Bearer ${token}`, "X-Company-Id": company.id, "Content-Type": "application/json" }, body: JSON.stringify({ month, payrollId: overrideRow.payrollId, scheme: activeTab, fields: overrideFields }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "COMPLIANCE_OVERRIDE_FAILED");
      overrideRef.current = { row: null, fields: {}, saving: false, error: "" }; setRetry((value) => value + 1);
    } catch (failure) { overrideRef.current.error = errorMessage(failure); overrideRef.current.saving = false; rerender(); } finally { overrideRef.current.saving = false; }
  };
  const handleTabKeyDown = (event, index) => {
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : null;
    if (next === null) return;
    event.preventDefault(); setActiveTab(tabs[next].id);
    document.getElementById(`compliance-tab-${tabs[next].id}`)?.focus();
  };
  const query = search.trim().toLowerCase();
  const visible = (report?.rows || []).filter((row) => [row.employeeName, row.employeeId, row[activeTab].name, row[activeTab].identifier].some((value) => String(value || "").toLowerCase().includes(query)));
  const status = report?.exportStatus[activeTab];
  const cards = [["Total Employees", report?.summary.totalEmployees], ["PF Eligible", report?.summary.pfEligible], ["ESI Eligible", report?.summary.esiEligible], ["Missing Data", report?.summary.missingData]];

  return <div className="space-y-6 px-2 pb-6 text-slate-800 sm:px-5">
    <header className={`${neo} flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="flex items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white"><ShieldCheck aria-hidden="true" /></span><div><h1 className="text-2xl font-bold">ESI &amp; PF Compliance</h1><p className="text-sm text-slate-500">Review finalized monthly payroll and statutory filing readiness</p></div></div>
      <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">Payroll month<input type="month" min="2000-01" max="2099-12" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800" /></label>
    </header>
    <section aria-label="Compliance summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, value]) => <div key={label} className={`${neo} rounded-2xl p-4`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-slate-500">{label}</p>{label === "Missing Data" ? <AlertCircle size={17} className="text-amber-600" /> : <Users size={17} className="text-blue-600" />}</div><p className="mt-3 text-2xl font-bold">{value ?? "—"}</p></div>)}</section>
    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900">Only Processed, Paid, or Finalized payroll is used. Missing statutory wages and contributions stay blank; payroll is never recalculated.{report && <span> {report.ignoredDrafts} unfinalized payroll record(s) excluded.</span>}<p className="mt-1 text-xs">Eligibility uses finalized payroll flags. Differences from current employee settings require review. Downloads cover the full month, regardless of search.</p></div>
    <div role="tablist" aria-label="Compliance schemes" className={`${neo} flex flex-wrap gap-3 rounded-3xl p-3`}>{tabs.map((tab, index) => <button key={tab.id} type="button" role="tab" id={`compliance-tab-${tab.id}`} aria-controls="compliance-panel" aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => { setActiveTab(tab.id); setDownloadError(""); }} onKeyDown={(event) => handleTabKeyDown(event, index)} className={`rounded-2xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-600 hover:bg-white"}`}>{tab.label}</button>)}</div>
    <section role="tabpanel" id="compliance-panel" aria-labelledby={`compliance-tab-${activeTab}`} tabIndex={0} className={`${neo} overflow-hidden rounded-3xl`}>
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-center xl:justify-between">
        <div><h2 className="font-bold">{activeTab === "pf" ? "PF / EPFO" : "ESI / ESIC"} employee preview</h2><p className="mt-1 text-xs text-slate-500">{visible.length} of {report?.rows.length ?? 0} employees · {month || "Select a month"}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5"><Search size={16} className="text-slate-400" /><input aria-label="Search employees by name, ID, UAN or IP number" placeholder="Search employee or number" value={search} onChange={(event) => setSearch(event.target.value)} className="w-48 bg-transparent text-sm outline-none" /></label>
          <button type="button" onClick={() => download("preview")} disabled={!report?.rows.length || !canExport || downloading} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />Excel preview/export</button>
          <button type="button" onClick={() => download(activeTab === "pf" ? "ecr" : "esi")} disabled={!status?.ready || !canExport || downloading} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Download size={16} />{downloading ? "Preparing…" : activeTab === "pf" ? "Download ECR" : "Download contribution Excel"}</button>
        </div>
      </div>
      {!canExport && <p className="px-5 pt-4 text-sm text-slate-500">Payroll export permission is required to download files.</p>}
      {status && !status.ready && <p className="px-5 pt-4 text-sm text-amber-800">{status.candidates ? `Portal download blocked: ${status.blocked} employee(s) need review. Excel preview includes missing fields.` : "No eligible employees are available for this scheme."}</p>}
      {downloadError && <p role="alert" className="px-5 pt-4 text-sm text-red-700">{downloadError}</p>}
      {loading ? <p role="status" className="p-12 text-center text-slate-500">Loading finalized payroll…</p> : !canView ? <p role="alert" className="p-12 text-center">You do not have permission to view payroll compliance.</p> : error ? <div role="alert" className="p-12 text-center"><p className="text-red-700">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 rounded-xl border px-4 py-2 font-semibold">Retry</button></div> : !month ? <p className="p-12 text-center text-slate-500">Select a payroll month.</p> : !visible.length ? <p className="p-12 text-center text-slate-500">{query ? "No employees match your search." : "No employee or finalized payroll records found for this month."}</p> : <div className="overflow-x-auto p-2">
        <table className="w-full min-w-[1150px] text-left text-sm"><caption className="sr-only">{activeTab === "pf" ? "PF" : "ESI"} compliance preview for {month}</caption>
          <thead className="bg-slate-100/80 text-xs uppercase text-slate-500"><tr>{["Employee", "Eligibility", activeTab === "pf" ? "UAN" : "IP number", ...(activeTab === "pf" ? ["Gross wages", "EPF wages", "EPS wages", "Employee PF", "Employer PF"] : ["Working days", "Gross wages", "Employee ESI", "Employer ESI"]), "Validation"].map((label) => <th key={label} scope="col" className="whitespace-nowrap p-3">{label}</th>)}</tr></thead>
          <tbody>{visible.map((row) => {
            const data = row[activeTab];
            return <tr key={row.id} className="border-t border-slate-100 bg-white align-top">
              <td className="p-3"><p className="font-semibold">{row.employeeName}</p><p className="mt-1 text-xs text-slate-400">{row.employeeId || "No employee ID"} · {row.payrollStatus || "No finalized payroll"}</p>{canOverride && data.missingFields?.length > 0 && row.payrollId && <button type="button" onClick={() => openOverride(row)} className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700">Resolve Missing Data</button>}</td>
              <td className="p-3">{data.eligible === null ? "Unknown" : data.eligible ? "Eligible" : "Not eligible"}</td><td className="p-3 font-mono">{data.identifier || "—"}</td>
              {activeTab === "esi" && <td className="p-3">{data.workingDays ?? "—"}</td>}
              <td className="p-3"><span className="whitespace-nowrap">{money(data.grossWages)}</span>{data.grossWages === null && row.payrollStatus && <p className="mt-1 min-w-36 text-xs text-slate-400">Payroll gross {money(row.payrollGrossSalary)}<br />Earned {money(row.earnedSalary)}<br />Statutory wages unavailable</p>}</td>
              {activeTab === "pf" && <><td className="p-3">{money(data.epfWages)}</td><td className="p-3">{money(data.epsWages)}</td></>}
              <td className="p-3">{money(data.employeeContribution)}</td><td className="p-3">{money(data.employerContribution)}</td><td className="p-3"><Validation data={data} />{data.missingFields?.length > 0 && <p className="mt-2 max-w-44 text-xs text-amber-700">Missing: {data.missingFields.join(", ")}</p>}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
      <p className="border-t border-slate-100 p-5 text-xs text-slate-500">{activeTab === "pf" ? "Employer PF is the EPF share excluding EPS. ECR also requires EDLI wages, EPS contribution, NCP days and refunds; missing values block the file." : "Working days are finalized payable days. ESIC export rounds fractional days up and uses the portal’s six-column .xls format. Contributions shown here come only from payroll."}</p>
    </section>
    {overrideRow && <div role="dialog" aria-modal="true" aria-labelledby="resolve-missing-title" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 p-4"><div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 id="resolve-missing-title" className="text-lg font-bold">Resolve Missing Data</h2><p className="mt-1 text-sm text-slate-500">{overrideRow.employeeName} · {activeTab === "pf" ? "PF / EPFO" : "ESI / ESIC"}</p></div><button type="button" onClick={() => { overrideRef.current = { row: null, fields: {}, saving: false, error: "" }; rerender(); }} className="rounded-lg px-2 py-1 text-slate-500" aria-label="Close">×</button></div><p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Only fields reported missing for this finalized payroll are shown. Values already frozen in payroll cannot be changed.</p><div className="mt-4 grid gap-3">{(overrideRow[activeTab].missingFields || []).map((field) => <label key={field} className="text-sm font-semibold text-slate-700">{({ epsMember: "EPS member", edliApplicable: "EDLI applicable", pfWageBasis: "PF wage basis/source", epfWages: "EPF wages", epsWages: "EPS wages", edliWages: "EDLI wages", ncpDays: "NCP days", refundOfAdvance: "Refund of advance", zeroContributionReason: "Zero contribution reason", lastWorkingDay: "Last working day" })[field] || field}<input type={field === "lastWorkingDay" ? "date" : ["epsMember", "edliApplicable"].includes(field) ? "checkbox" : "number"} min="0" step={field === "refundOfAdvance" ? "0.01" : "1"} value={typeof overrideFields[field] === "boolean" ? undefined : overrideFields[field] ?? ""} checked={typeof overrideFields[field] === "boolean" ? overrideFields[field] : undefined} onChange={(event) => { overrideRef.current.fields = { ...overrideRef.current.fields, [field]: event.target.type === "checkbox" ? event.target.checked : event.target.type === "number" ? Number(event.target.value) : event.target.value }; rerender(); }} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" />{["epsMember", "edliApplicable"].includes(field) && <span className="ml-2 text-xs font-normal text-slate-500">Checked = Yes</span>}</label>)}</div>{overrideError && <p role="alert" className="mt-3 text-sm text-red-700">{overrideError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => { overrideRef.current = { row: null, fields: {}, saving: false, error: "" }; rerender(); }} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button type="button" onClick={saveOverride} disabled={overrideSaving || !Object.keys(overrideFields).length} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{overrideSaving ? "Saving…" : "Save approved override"}</button></div></div></div>}
  </div>;
}
