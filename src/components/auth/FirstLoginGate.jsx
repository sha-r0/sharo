"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/app/(auth)/context/AuthContext";

export default function FirstLoginGate({ children }) {
  const { company, companyEmployee, access, refreshUser } = useAuth();
  const [password, setPassword] = useState(""), [confirm, setConfirm] = useState(""), [accepted, setAccepted] = useState(false), [saving, setSaving] = useState(false);
  if (!access || access.isOwner || (!access.requirePasswordChange && access.policyAccepted)) return children;
  const submit = async () => { if (access.requirePasswordChange && (password.length < 8 || password !== confirm)) return toast.error("Enter matching passwords with at least 8 characters."); if (!accepted) return toast.error("Accept the company policy to continue."); setSaving(true); try { if (access.requirePasswordChange) await updatePassword(auth.currentUser, password); await updateDoc(doc(db, "Companies", company.id, "Usermanagement", companyEmployee.id), { "access.requirePasswordChange": false, "access.policyAccepted": true, "access.passwordChangedAt": serverTimestamp(), updatedAt: serverTimestamp() }); await refreshUser(); toast.success("Account setup completed."); } catch (error) { toast.error(error.code === "auth/requires-recent-login" ? "Please sign in again before changing the password." : "Unable to complete account setup."); } finally { setSaving(false); } };
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-[#ECF1FD] p-4"><div className="w-full max-w-lg rounded-3xl border border-white bg-white p-8 shadow-2xl"><h1 className="text-2xl font-bold">Complete your account setup</h1><p className="mt-2 text-sm text-slate-500">Secure your temporary account before accessing the ERP workspace.</p>{access.requirePasswordChange && <div className="mt-6 space-y-3"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="h-12 w-full rounded-xl border px-4"/><input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" className="h-12 w-full rounded-xl border px-4"/></div>}<label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1"/><span>I accept the company security, acceptable-use, privacy, and workplace policies.</span></label><button onClick={submit} disabled={saving} className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Continue to workspace"}</button></div></div>;
}
