"use client";

import { AlertTriangle } from "lucide-react";

export default function DeleteClientDialog({
  open,
  client,
  deleting,
  onCancel,
  onConfirm,
}) {
  if (!open || !client) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle size={30} />
        </div>

        <h2 className="mt-5 text-2xl font-bold text-slate-800">
          Delete Client?
        </h2>

        <p className="mt-3 leading-6 text-slate-500">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-800">
            {client.clientName}
          </span>
          ? This action cannot be undone.
        </p>

        <div className="mt-7 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Client"}
          </button>
        </div>
      </div>
    </div>
  );
}