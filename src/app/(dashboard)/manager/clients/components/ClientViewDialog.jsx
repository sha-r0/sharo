"use client";

import {
  Building2,
  Mail,
  MapPin,
  Phone,
  User,
  X,
} from "lucide-react";

function Detail({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {Icon && <Icon size={16} />}
        <span>{label}</span>
      </div>

      <p className="mt-2 break-words font-semibold text-slate-800">
        {value || "-"}
      </p>
    </div>
  );
}

export default function ClientViewDialog({
  open,
  client,
  onClose,
}) {
  if (!open || !client) return null;

  const fullAddress = [
    client.address?.line1,
    client.address?.city,
    client.address?.state,
    client.address?.country,
    client.address?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <Building2 size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {client.clientName}
              </h2>

              <p className="text-slate-500">
                {client.companyName || "Individual Client"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close client details"
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={22} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          <Detail
            label="Contact Person"
            value={client.contactPerson}
            icon={User}
          />

          <Detail
            label="Phone"
            value={client.phone}
            icon={Phone}
          />

          <Detail
            label="Email"
            value={client.email}
            icon={Mail}
          />

          <Detail
            label="Status"
            value={client.status}
          />

          <Detail
            label="GST Number"
            value={client.gstNo}
          />

          <Detail
            label="PAN Number"
            value={client.panNo}
          />

          <div className="sm:col-span-2">
            <Detail
              label="Address"
              value={fullAddress}
              icon={MapPin}
            />
          </div>

          <div className="sm:col-span-2">
            <Detail
              label="Notes"
              value={client.notes}
            />
          </div>
        </div>
      </div>
    </div>
  );
}