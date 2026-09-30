import { securePendingPassword, verifyPendingPassword } from "./pendingPassword.mjs";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export function publicSignup(data) {
  const { company, admin, subscription } = data;
  return {
    companyName: company.companyName, companyAddress: company.companyAddress,
    companyEmail: company.companyEmail, phone: company.phone, gstNumber: company.gstNumber || "",
    fullName: admin.fullName, adminEmail: admin.adminEmail,
    adminPhone: admin.adminPhone, corporateId: admin.corporateId,
    subscription: {
      plan: "business", planName: "Business", billingType: subscription.billingType,
      employeeCount: subscription.employeeCount,
    },
  };
}

export const completedSignup = () => ({
  success: true, state: "completed", message: "Registration already completed. Please sign in.",
});

export async function findSignupResume({ adminEmail, password }) {
  if (typeof adminEmail !== "string" || !adminEmail.trim()) {
    throw new Error("Invalid signup request.");
  }
  try {
    await adminAuth.getUserByEmail(adminEmail);
    return { response: completedSignup() };
  } catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
  }
  const matches = await adminDb.collection("PendingRegistrations")
    .where("admin.adminEmail", "==", adminEmail).limit(2).get();
  if (matches.empty) return null;
  // Do not pick an arbitrary registration if legacy duplicate records exist.
  if (matches.docs.length !== 1) throw new Error("Please contact support to resume registration.");
  const doc = matches.docs[0];
  const data = await securePendingPassword(doc);
  if (!await verifyPendingPassword(password, data.admin.passwordHash)) {
    return { response: { success: false, state: "verification_required", message: "Enter the original signup password to resume registration." } };
  }
  const company = await adminDb.collection("Companies")
    .where("corporateId", "==", data.admin.corporateId).limit(1).get();
  if (!company.empty || ["COMPLETED", "PAID"].includes(String(data.paymentStatus).toUpperCase())) {
    return { response: completedSignup() };
  }
  if (data.subscription?.plan !== "business") throw new Error("Unsupported pending signup plan.");
  return { ref: doc.ref, data, response: { success: true, state: "pending", signup: publicSignup(data) } };
}

export async function resumeSignupOrder(pending, { fetchOrder, createOrder, newOrderId }) {
  let orderId = pending.data.orderId;
  if (!/^SHARO_[a-f0-9]{32}$/.test(orderId)) throw new Error("Invalid saved order.");
  const order = await fetchOrder(orderId);
  if (order?.order_status === "PAID") {
    return { success: true, state: "paid", orderId, message: "Payment received. Continue registration completion." };
  }
  if (order?.order_status === "ACTIVE") {
    if (!order.payment_session_id) throw new Error("Payment session unavailable. Please retry.");
    return { success: true, state: "pending", orderId, paymentSessionId: order.payment_session_id };
  }
  if (order && !["EXPIRED", "TERMINATED"].includes(order.order_status)) {
    throw new Error("Payment status is not yet settled. Please retry.");
  }
  // A missing order is retried with the same ID (including after network errors).
  // Rotate only definitively unpayable orders, atomically retaining their link.
  if (order) {
    const candidate = newOrderId();
    orderId = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(pending.ref);
      if (!snap.exists) throw new Error("Registration has already changed. Please retry.");
      const current = snap.data();
      if (String(current.paymentStatus).toUpperCase() !== "PENDING") throw new Error("Registration has already changed. Please retry.");
      if (current.orderId !== pending.data.orderId) return current.orderId;
      tx.update(pending.ref, { orderId: candidate });
      return candidate;
    });
    if (orderId !== candidate) {
      // Another request won rotation. Inspect its order instead of rotating again.
      return resumeSignupOrder({ ...pending, data: { ...pending.data, orderId } }, { fetchOrder, createOrder, newOrderId });
    }
  }
  const data = pending.data;
  return createOrder(orderId, {
    ...publicSignup(data), subscription: data.subscription,
  });
}
