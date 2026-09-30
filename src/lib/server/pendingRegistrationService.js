import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { hashPendingPassword } from "./pendingPassword.mjs";

export function validatePendingRegistration(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Invalid signup request.";
  for (const field of ["companyName", "companyAddress", "companyEmail", "phone", "fullName", "adminEmail", "adminPhone", "password", "corporateId"]) {
    if (typeof data[field] !== "string" || !data[field].trim() || data[field].length > 2000) {
      return `Invalid or missing ${field}.`;
    }
  }
  for (const field of ["companyEmail", "adminEmail"]) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[field])) return `Invalid ${field}.`;
  }
  if (!/^\d{10}$/.test(data.phone) || !/^\d{10}$/.test(data.adminPhone)) return "Invalid phone number.";
  if (data.password.length < 6 || data.password.length > 128) return "Invalid password length.";
  if (data.gstNumber != null && typeof data.gstNumber !== "string") return "Invalid GST number.";
  const subscription = data.subscription;
  if (!subscription || subscription.plan !== "business" ||
      !["monthly", "yearly"].includes(subscription.billingType) ||
      !Number.isInteger(subscription.employeeCount) || subscription.employeeCount < 1 || subscription.employeeCount > 10000 ||
      typeof subscription.amount !== "number" || !Number.isFinite(subscription.amount) || subscription.amount <= 0) {
    return "Invalid subscription.";
  }
  return null;
}

export async function savePendingRegistration(orderId, data) {
  const error = validatePendingRegistration(data);
  if (error) throw new Error(error);
  if (!/^SHARO_[a-f0-9]{32}$/.test(orderId)) throw new Error("Invalid order ID.");
  const ref = adminDb.collection("PendingRegistrations").doc(orderId);
  // Create-only with a server-generated ID; never overwrite another signup.
  await ref.create({
    orderId,
    paymentStatus: "PENDING",
    company: {
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyEmail: data.companyEmail,
      phone: data.phone,
      gstNumber: data.gstNumber || "",
    },
    admin: {
      fullName: data.fullName,
      adminEmail: data.adminEmail,
      adminPhone: data.adminPhone,
      passwordHash: await hashPendingPassword(data.password),
      corporateId: data.corporateId,
      role: "owner",
    },
    subscription: {
      plan: "business",
      planName: "Business",
      billingType: data.subscription.billingType,
      employeeCount: data.subscription.employeeCount,
      employeeRange: `${data.subscription.employeeCount} Employees`,
      pricePerUser: 99,
      yearlyDiscount: data.subscription.billingType === "yearly" ? 15 : 0,
      amount: data.subscription.amount,
    },
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref;
}
