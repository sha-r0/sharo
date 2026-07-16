import vendorRepository from "./VendorRepository";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function validateVendor(form) {
  const errors = {};
  if (!form.companyName?.trim()) errors.companyName = "Company name is required.";
  if (!form.contactPerson?.trim()) errors.contactPerson = "Contact person is required.";
  if (!form.phone?.trim()) errors.phone = "Phone is required.";
  if (form.email && !emailPattern.test(form.email)) errors.email = "Enter a valid email.";
  if (form.rating && (Number(form.rating) < 0 || Number(form.rating) > 5)) errors.rating = "Rating must be between 0 and 5.";
  return errors;
}

const normalize = (form) => ({
  vendorName: form.companyName.trim(), companyName: form.companyName.trim(), contactPerson: form.contactPerson.trim(),
  phone: form.phone.trim(), email: form.email.trim().toLowerCase(), gstNo: form.gstNo.trim(), panNo: form.panNo.trim().toUpperCase(),
  address: { line1: form.addressLine1.trim(), city: form.city.trim(), state: form.state.trim(), postalCode: form.postalCode.trim() },
  bankDetails: { accountName: form.accountName.trim(), accountNumber: form.accountNumber.trim(), bankName: form.bankName.trim(), ifsc: form.ifsc.trim().toUpperCase() },
  upi: form.upi.trim(), category: form.category.trim(), services: form.services.split(",").map((item) => item.trim()).filter(Boolean),
  documents: form.documents || [], rating: Number(form.rating || 0), status: form.status || "active", notes: form.notes.trim(),
});

class VendorService {
  create(companyId, form) { const errors = validateVendor(form); return Object.keys(errors).length ? Promise.resolve({ success: false, errors }) : vendorRepository.create(companyId, normalize(form)).then((id) => ({ success: true, id })); }
  update(companyId, id, form) { const errors = validateVendor(form); return Object.keys(errors).length ? Promise.resolve({ success: false, errors }) : vendorRepository.update(companyId, id, normalize(form)).then(() => ({ success: true })); }
  async remove(companyId, vendor, projects, payments) {
    const hasHistory = payments.some((item) => item.vendorId === vendor.id || item.vendorId === vendor.vendorId) || projects.some((project) => (project.vendors || []).some((item) => item.vendorId === vendor.id || item.vendorId === vendor.vendorId));
    if (hasHistory) { await vendorRepository.update(companyId, vendor.id, { status: "inactive", archived: true }); return { archived: true }; }
    await vendorRepository.remove(companyId, vendor.id); return { archived: false };
  }
}
export default new VendorService();
