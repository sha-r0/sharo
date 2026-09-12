"use client";
import { useState } from "react";
import { FileText, X } from "lucide-react";
import { receiptPreview } from "@/lib/expenses/receipt";
export default function BillPreviewModal({ open, billUrl, onClose }) {
  const [failedUrl, setFailedUrl] = useState(null);
  if (!open) return null;
  const preview = receiptPreview(billUrl);
  return <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-6">
    <div role="dialog" aria-modal="true" aria-label="Expense receipt" className="bg-white rounded-3xl w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">Expense Receipt</h2>
        <button type="button" onClick={onClose} aria-label="Close receipt" className="p-2 rounded-xl hover:bg-slate-100"><X size={20} /></button>
      </div>
      <div className="flex-1 min-h-0 bg-slate-100 flex flex-col items-center justify-center gap-4 p-4">
        {preview.kind === "none" ? <p>No receipt attached</p> : preview.kind === "invalid" ? <p>Receipt preview unavailable.</p> : <>
          {preview.kind === "pdf" ? <><FileText size={48} /><p>PDF receipt</p></> : failedUrl === preview.url ? <p>Image preview unavailable. Open the receipt to view it.</p> : <img src={preview.url} alt="Expense receipt" referrerPolicy="no-referrer" onError={() => setFailedUrl(preview.url)} className="min-h-0 max-h-[70vh] max-w-full object-contain" />}
          <a href={preview.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-blue-600 underline">{preview.kind === "pdf" ? "Open PDF" : "Open receipt"}</a>
        </>}
      </div>
    </div>
  </div>;
}
