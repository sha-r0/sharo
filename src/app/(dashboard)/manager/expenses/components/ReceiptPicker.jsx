"use client";
import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { RECEIPT_ACCEPT, validateReceipt } from "@/lib/expenses/receipt";
import BillPreviewModal from "./BillPreviewModal";
export default function ReceiptPicker({ file, existingUrl = "", removed = false, onChange, disabled = false }) {
  const input = useRef(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState(false);
  useEffect(() => {
    if (!file || file.name.toLowerCase().endsWith(".pdf")) { setPreview(""); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const attached = file || (existingUrl && !removed);
  return <div className="space-y-2 text-sm">
    <label className="block font-medium">Bill / Receipt (optional)
      <input ref={input} type="file" accept={RECEIPT_ACCEPT} disabled={disabled} className="mt-2 block w-full rounded-lg border p-2" onChange={(event) => {
        const selected = event.target.files?.[0]; event.target.value = "";
        if (!selected) return;
        try { validateReceipt(selected); setError(""); onChange(selected, false); }
        catch (failure) { setError(failure.message); }
      }} />
    </label>
    <p className="text-xs text-slate-500">JPG, JPEG, PNG or PDF. Maximum 5 MB.</p>
    {error && <p role="alert" className="text-red-600">{error}</p>}
    {file && <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
      {preview ? <img src={preview} alt="Selected receipt" className="h-20 w-20 rounded object-contain" /> : <FileText aria-label="PDF receipt" />}
      <div className="min-w-0"><p className="break-all">{file.name}</p><p className="text-xs text-slate-500">{file.type || file.name.split(".").pop().toUpperCase()} · {(file.size / 1024).toFixed(0)} KB</p></div>
    </div>}
    {!file && existingUrl && !removed && <button type="button" className="text-blue-600 underline" onClick={() => setView(true)}>View existing receipt</button>}
    {!attached && <p className="text-slate-500">No receipt attached</p>}
    {attached && <div className="flex gap-3">
      <button type="button" disabled={disabled} className="text-blue-600" onClick={() => input.current?.click()}>Replace</button>
      <button type="button" disabled={disabled} className="text-red-600" onClick={() => { setError(""); onChange(null, true); }}>Remove</button>
    </div>}
    <BillPreviewModal open={view} billUrl={existingUrl} onClose={() => setView(false)} />
  </div>;
}
