import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function savePendingRegistration(orderId, data) {
  try {
    await setDoc(doc(db, "PendingRegistrations", orderId), {
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
        password: data.password,
        corporateId: data.corporateId,
      },

      subscription: data.subscription,

      createdAt: serverTimestamp(),
    });

    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}