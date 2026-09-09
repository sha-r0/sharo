"use client";

import { useEffect, useState } from "react";
import { Building2, KeyRound, Landmark, Link2, Save, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/app/(auth)/context/AuthContext";
import { payoutSettingsService } from "./services/PayoutSettingsService";

const initial = {
  provider: "cashfree",
  environment: "sandbox",
  status: "NOT_CONNECTED",
  payoutsEnabled: false,
  merchantId: "",
  authMode: "",
};

const inputClass = "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function CompanySettingsPage() {
  const { can } = useAuth();
  const authorized = can("company.manage");
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [credentials, setCredentials] = useState({ clientId: "", clientSecret: "", publicKey: "", authMode: "PUBLIC_KEY" });

  const refreshSettings = async () => {
    const settings = await payoutSettingsService.get();
    setForm({ ...initial, ...settings, merchantId: settings.merchantId || "", authMode: settings.authMode || "" });
    setConnectOpen(settings.status !== "CONNECTED");
    return settings;
  };

  useEffect(() => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    refreshSettings()
      .catch((error) => {
        console.error(error);
        toast.error("Unable to load payout settings.");
      })
      .finally(() => setLoading(false));
  }, [authorized]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const settings = await payoutSettingsService.update(form);
      setForm((current) => ({ ...current, ...settings, merchantId: settings.merchantId || "", authMode: settings.authMode || "" }));
      toast.success("Payout settings saved.");
    } catch (error) {
      console.error(error);
      toast.error(error?.message || "Unable to save payout settings.");
    } finally {
      setSaving(false);
    }
  };

  const connect = async (event) => {
    event.preventDefault();
    if (!credentials.clientId.trim() || !credentials.clientSecret) {
      toast.error("Enter the Cashfree sandbox client ID and client secret.");
      return;
    }
    if (credentials.authMode === "PUBLIC_KEY" && !credentials.publicKey.trim()) {
      toast.error("Enter the Cashfree public key PEM.");
      return;
    }
    setConnecting(true);
    try {
      const result = await payoutSettingsService.connect({
        clientId: credentials.clientId.trim(),
        clientSecret: credentials.clientSecret,
        publicKey: credentials.publicKey.trim(),
        authMode: credentials.authMode,
      });
      if (!result?.verified) throw new Error("Connection verification failed.");
      await refreshSettings();
      toast.success("Cashfree Payouts connected.");
    } catch {
      toast.error("Unable to verify the Cashfree sandbox connection.");
    } finally {
      setCredentials({ clientId: "", clientSecret: "", publicKey: "", authMode: "PUBLIC_KEY" });
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    setConnecting(true);
    try {
      await payoutSettingsService.disconnect();
      await refreshSettings();
      toast.success("Cashfree Payouts disconnected.");
    } catch {
      toast.error("Unable to disconnect Cashfree Payouts.");
    } finally {
      setConnecting(false);
    }
  };

  const connected = form.status === "CONNECTED" && (form.authMode === "MERCHANT" || form.authMode === "PUBLIC_KEY") && form.environment === "sandbox";

  if (!authorized) {
    return <div className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-800">Company settings require the Company Manage permission.</div>;
  }

  return <main className="space-y-6 px-2 py-2 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Building2 size={23}/></div>
        <div><h1 className="text-2xl font-bold text-slate-900">Company Settings</h1><p className="text-sm text-slate-500">Company-scoped operational configuration</p></div>
      </div>
    </header>

    <form onSubmit={save} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-slate-700"><Landmark size={21}/></div>
          <div><h2 className="font-bold text-slate-900">Payout Settings</h2><p className="text-sm text-slate-500">Safe provider metadata for future employee advance payouts</p></div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{form.status.replaceAll("_", " ")}</span>
      </div>

      {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading payout settings…</p> : <>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Payout Provider"><select value={form.provider} onChange={(event) => update("provider", event.target.value)} className={inputClass}><option value="cashfree">Cashfree</option></select></Field>
          <Field label="Environment"><select value={form.environment} onChange={(event) => update("environment", event.target.value)} className={inputClass}><option value="sandbox">Sandbox</option><option value="production">Production</option></select></Field>
          <Field label="Authentication Mode"><select value={form.authMode} onChange={(event) => update("authMode", event.target.value)} className={inputClass}><option value="">Not configured</option><option value="PARTNER">Partner</option><option value="MERCHANT">Merchant</option><option value="PUBLIC_KEY">Public Key</option></select></Field>
          <Field label="Merchant ID"><input value={form.merchantId} onChange={(event) => update("merchantId", event.target.value)} maxLength={128} placeholder="Not configured" className={inputClass}/></Field>
        </div>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div><p className="text-sm font-bold text-slate-800">Payouts Enabled</p><p className="text-xs text-slate-500">Available after a future secure provider connection is completed.</p></div>
          <input type="checkbox" checked={form.payoutsEnabled} disabled readOnly className="h-5 w-5 accent-blue-600"/>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800"><ShieldCheck className="mt-0.5 shrink-0" size={18}/><p>Credentials are sent only to the secure connection callable and are never stored in browser storage or Firestore.</p></div>

        <div className="mt-6 flex justify-end"><button disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Save size={17}/>{saving ? "Saving…" : "Save Payout Settings"}</button></div>
      </>}
    </form>

    {!loading && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><KeyRound size={19}/></span>
          <div><p className="text-sm font-bold text-slate-900">Cashfree Payouts</p><p className="text-xs text-slate-500">Sandbox advance payout connection</p></div>
        </div>
        {connected && !connectOpen && <div className="flex gap-2"><button type="button" onClick={disconnect} disabled={connecting} className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50">Disconnect</button><button type="button" onClick={() => setConnectOpen(true)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700">Reconnect</button></div>}
      </div>

      {connected && !connectOpen ? <div className="mt-4 grid gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs font-semibold uppercase text-emerald-700">Authentication Mode</p><p className="font-bold text-emerald-900">{form.authMode || "PUBLIC_KEY"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-emerald-700">Environment</p><p className="font-bold text-emerald-900">Sandbox</p></div>
        <div><p className="text-xs font-semibold uppercase text-emerald-700">Status</p><p className="font-bold text-emerald-900">Connected</p></div>
      </div> : <form onSubmit={connect} autoComplete="off" className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Environment"><input value="Sandbox" disabled readOnly className={`${inputClass} bg-slate-100 text-slate-600`}/></Field>
        <Field label="Authentication Mode"><select value={credentials.authMode} onChange={(event) => setCredentials((current) => ({ ...current, authMode: event.target.value }))} className={inputClass}><option value="PUBLIC_KEY">Public Key</option><option value="MERCHANT">Merchant</option></select></Field>
        <Field label="Cashfree Payout Client ID"><input value={credentials.clientId} onChange={(event) => setCredentials((current) => ({ ...current, clientId: event.target.value }))} autoComplete="off" maxLength={256} required className={inputClass}/></Field>
        <div className="sm:col-span-2"><Field label="Cashfree Payout Client Secret"><input type="password" value={credentials.clientSecret} onChange={(event) => setCredentials((current) => ({ ...current, clientSecret: event.target.value }))} autoComplete="new-password" maxLength={512} required className={inputClass}/></Field></div>
        {credentials.authMode === "PUBLIC_KEY" && <div className="sm:col-span-2"><Field label="Cashfree Public Key PEM"><textarea value={credentials.publicKey} onChange={(event) => setCredentials((current) => ({ ...current, publicKey: event.target.value }))} autoComplete="off" spellCheck={false} rows={6} required className={`${inputClass} h-auto py-3 font-mono text-xs leading-5`}/></Field></div>}
        <div className="flex justify-end gap-2 sm:col-span-2">
          {connected && <button type="button" onClick={() => { setCredentials({ clientId: "", clientSecret: "", publicKey: "", authMode: "PUBLIC_KEY" }); setConnectOpen(false); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">Cancel</button>}
          <button disabled={connecting} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Link2 size={16}/>{connecting ? "Connecting…" : "Connect Cashfree Payouts"}</button>
        </div>
      </form>}
    </section>}
  </main>;
}

function Field({ label, children }) {
  return <label className="block text-xs font-bold text-slate-600">{label}{children}</label>;
}
