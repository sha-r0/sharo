import { collection, doc, getDoc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function formatAddress(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") {
    return [value.line1, value.line2, value.street, value.city, value.state, value.pincode || value.postalCode, value.country]
      .filter(Boolean)
      .join(", ");
  }
  return String(value);
}

function normalizeDocument(id, source) {
  const data = { id, ...source };
  if (data.address) data.address = formatAddress(data.address);
  if (data.companyAddress) data.companyAddress = formatAddress(data.companyAddress);
  if (data.clientSnapshot) {
    data.clientSnapshot = { ...data.clientSnapshot, address: formatAddress(data.clientSnapshot.address) };
  }
  if (data.companySnapshot) {
    data.companySnapshot = {
      ...data.companySnapshot,
      address: formatAddress(data.companySnapshot.address),
      logoUrl: billingImageUrl(data.companySnapshot.logoUrl),
      signatureUrl: billingImageUrl(data.companySnapshot.signatureUrl),
    };
  }
  if (data.logoUrl) data.logoUrl = billingImageUrl(data.logoUrl);
  return data;
}

function billingImageUrl(value) {
  if (!value || typeof value !== "string" || value.startsWith("/api/billing/image")) return value || "";
  try {
    const url = new URL(value);
    if (["firebasestorage.googleapis.com", "storage.googleapis.com"].includes(url.hostname)) {
      return `/api/billing/image?url=${encodeURIComponent(value)}`;
    }
  } catch { return value; }
  return value;
}

class BillingRepository {
  async load(companyId) {
    const companyRef = doc(db, "Companies", companyId);
    const read = async (name) => (await getDocs(collection(companyRef, name))).docs.map((item) => normalizeDocument(item.id, item.data()));
    const [company, projects, clients, invoices, payments, expenses, workLogs, vendorPayments, settings, templates] = await Promise.all([
      getDoc(companyRef), read("Projectmanagement"), read("Clients"), read("Invoices"), read("Payments"),
      read("Expenses"), read("WorkLogs"), read("VendorPayments"),
      getDoc(doc(companyRef, "BillingSettings", "default")), read("InvoiceTemplates"),
    ]);
    return {
      company: company.exists() ? normalizeDocument(company.id, company.data()) : null,
      projects, clients, invoices, payments, expenses, workLogs, vendorPayments,
      settings: settings.exists() ? settings.data() : null, templates,
    };
  }

  subscribe(companyId, callback, onError) {
    const names = ["Projectmanagement", "Clients", "Invoices", "Payments", "Expenses", "WorkLogs", "VendorPayments"];
    const state = Object.fromEntries(names.map((name) => [name, []]));
    let company = null; let settings = null;
    const publish = () => callback({
      company, settings, templates: [], projects: state.Projectmanagement, clients: state.Clients,
      invoices: state.Invoices, payments: state.Payments, expenses: state.Expenses,
      workLogs: state.WorkLogs, vendorPayments: state.VendorPayments,
    });
    const stops = names.map((name) => onSnapshot(
      collection(db, "Companies", companyId, name),
      (snapshot) => { state[name] = snapshot.docs.map((item) => normalizeDocument(item.id, item.data())); publish(); },
      onError,
    ));
    stops.push(onSnapshot(doc(db, "Companies", companyId), (snapshot) => {
      company = snapshot.exists() ? normalizeDocument(snapshot.id, snapshot.data()) : null; publish();
    }, onError));
    stops.push(onSnapshot(doc(db, "Companies", companyId, "BillingSettings", "default"), (snapshot) => {
      settings = snapshot.exists() ? snapshot.data() : null; publish();
    }, onError));
    return () => stops.forEach((stop) => stop());
  }
}

export default new BillingRepository();
