import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export const createCompany = async (data) => {
  try {
    const payload = {
      // ==========================
      // COMPANY DETAILS
      // ==========================
      companyName: data.companyName || "",
      companyAddress: data.companyAddress || "",
      companyEmail: data.companyEmail || "",
      phone: data.phone || "",
      gstNumber: data.gstNumber || "",

      // ==========================
      // OWNER DETAILS
      // ==========================
      ownerName: data.fullName || "",
      ownerEmail: data.adminEmail || "",
      ownerPhone: data.adminPhone || "",

      corporateId: data.corporateId || "",

      // ==========================
      // SUBSCRIPTION
      // ==========================
      subscription: {
        plan: data.subscription?.plan || "",
        billingType: data.subscription?.billingType || "",
        employeeRange: data.subscription?.employeeRange || "",
        employeeCount: data.subscription?.employeeCount || 0,
        pricePerUser: data.subscription?.pricePerUser || 0,
        yearlyDiscount:
          data.subscription?.yearlyDiscount || 0,
      },

      // ==========================
      // PAYMENT
      // ==========================
      amount: data.subscription?.amount || 0,
      paymentStatus: "PAID",

      // Will be updated later when renewal is added
      planStart: Timestamp.now(),
      planEnd: null,

      // ==========================
      // STATUS
      // ==========================
      serviceStatus: "active",

      // ==========================
      // SYSTEM
      // ==========================
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(
      collection(db, "Companies"),
      payload
    );

    return {
      success: true,
      companyId: docRef.id,
    };
  } catch (error) {
    console.error("Create Company Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
};