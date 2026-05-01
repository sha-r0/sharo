import { db } from "@/lib/firebase";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export const createCompany = async (data) => {
    try {
        const now = new Date();

        // 🔢 TOTAL EMPLOYEE COUNT (from plan distribution)
        const totalEmployees =
            Number(data.planDistribution?.basic || 0) +
            Number(data.planDistribution?.pro || 0) +
            Number(data.planDistribution?.enterprise || 0);

        // 📅 PLAN DATES (initially same, will update after payment verification)
        const planStart = null;
        const planEnd = null;

        const payload = {
            // 🏢 COMPANY DETAILS (Step 1)
            companyName: data.companyName || "",
            companyAddress: data.companyAddress || "",
            companyEmail: data.companyEmail || "",
            phone: data.phone || "",
            gstNumber: data.gstNumber || "",

            // 👤 ADMIN DETAILS (Step 2)
            corporateId: data.corporateId || "",
            employeeId: data.employeeId || "",
            password: data.password || "", // ⚠️ hash later
            role: data.role || "manager",

            // 📊 PLAN (Step 3)
            planDistribution: data.planDistribution || {
                basic: 0,
                pro: 0,
                enterprise: 0,
            },

            billingMonths: data.billingMonths || 0,
            billingLabel: data.billingLabel || "",

            // 💰 PAYMENT
            amount: data.amount || 0,
            paymentStatus: "unpaid", // ✅ initially unpaid
            paymentUTR: data.paymentUTR || "",

            // 👥 SYSTEM CALCULATED
            employeeCount: totalEmployees,

            // 📅 DATES
            createdAt: Timestamp.now(),
            planStart: null,
            planEnd: null,

            // ⚙️ STATUS
            serviceStatus: "active",

            // 🧾 OPTIONAL
            //   Advances: {},
            //   userId: data.employeeId || "",
        };

        const docRef = await addDoc(collection(db, "Companies"), payload);

        return {
            success: true,
            id: docRef.id,
        };

    } catch (error) {
        console.error("Create Company Error:", error);

        return {
            success: false,
            error: error.message,
        };
    }
};