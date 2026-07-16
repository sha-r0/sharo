"use client";

import { useEffect, useState } from "react";
import { Building2, X } from "lucide-react";
import toast from "react-hot-toast";
import vendorService from "../services/VendorService";

const empty = {
  companyName: "", contactPerson: "", phone: "", email: "", gstNo: "", panNo: "",
  addressLine1: "", city: "", state: "", postalCode: "", accountName: "",
  accountNumber: "", bankName: "", ifsc: "", upi: "", category: "", services: "",
  rating: "", status: "active", notes: "", documents: [],
};
const field = "mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

function fromVendor(vendor) {
  if (!vendor) return { ...empty };
  return {
    ...empty, ...vendor,
    addressLine1: vendor.address?.line1 || "", city: vendor.address?.city || "",
    state: vendor.address?.state || "", postalCode: vendor.address?.postalCode || "",
    accountName: vendor.bankDetails?.accountName || "", accountNumber: vendor.bankDetails?.accountNumber || "",
    bankName: vendor.bankDetails?.bankName || "", ifsc: vendor.bankDetails?.ifsc || "",
    services: (vendor.services || []).join(", "),
  };
}

function Input({ name, label, type = "text", value, onChange, error }) {
  return <label className="block text-xs font-bold text-slate-600">
    {label}
    <input name={name} type={type} value={value ?? ""} onChange={(event) => onChange(name, event.target.value)} className={field}/>
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>;
}

export default function VendorDialog({ open, onClose, companyId, vendor }) {
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setForm(fromVendor(vendor)); setErrors({}); } }, [open, vendor]);
  if (!open) return null;
  const update = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const input = (name, label, type) => <Input key={name} name={name} label={label} type={type} value={form[name]} onChange={update} error={errors[name]}/>;
  const save = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const result = vendor ? await vendorService.update(companyId, vendor.id, form) : await vendorService.create(companyId, form);
      if (!result.success) { setErrors(result.errors); return; }
      toast.success(vendor ? "Vendor updated." : "Vendor created."); onClose();
    } catch (error) { console.error(error); toast.error(error.message || "Could not save vendor."); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/30 p-2 backdrop-blur-sm sm:p-5">
    <form onSubmit={save} className="flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white bg-[#F9FAFC] shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white p-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Building2 size={20}/></span><div><h2 className="text-xl font-bold text-slate-800">{vendor ? "Edit vendor" : "Add vendor"}</h2><p className="text-xs text-slate-500">Commercial, tax and payment information</p></div></div>
        <button type="button" onClick={onClose} className="p-2"><X size={20}/></button>
      </header>
      <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
        <section><h3 className="mb-4 font-bold text-slate-800">Basic details</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {input("companyName", "Company name")}{input("contactPerson", "Contact person")}{input("phone", "Phone")}{input("email", "Email", "email")}{input("gstNo", "GST")}{input("panNo", "PAN")}{input("category", "Vendor category")}{input("services", "Services (comma separated)")}{input("rating", "Rating (0–5)", "number")}
          <label className="block text-xs font-bold text-slate-600">Status<select value={form.status} onChange={(event) => update("status", event.target.value)} className={field}><option value="active">Active</option><option value="inactive">Inactive</option><option value="blocked">Blocked</option></select></label>
        </div></section>
        <section><h3 className="mb-4 font-bold text-slate-800">Address</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="lg:col-span-2">{input("addressLine1", "Address")}</div>{input("city", "City")}{input("state", "State")}{input("postalCode", "Postal code")}</div></section>
        <section><h3 className="mb-4 font-bold text-slate-800">Bank and payment</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{input("accountName", "Account name")}{input("accountNumber", "Account number")}{input("bankName", "Bank name")}{input("ifsc", "IFSC")}{input("upi", "UPI")}</div></section>
        <label className="block text-xs font-bold text-slate-600">Notes<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} className={`${field} h-24 py-3`}/></label>
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-100 bg-white p-5"><button type="button" onClick={onClose} className="rounded-xl border px-5 py-2.5 text-sm font-bold">Cancel</button><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : vendor ? "Update vendor" : "Save vendor"}</button></footer>
    </form>
  </div>;
}
