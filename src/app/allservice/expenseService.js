import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy } from "firebase/firestore";

/* =========================
   🔥 GET ALL EXPENSES (COMPANY BASED)
========================= */
export const getExpenses = async (companyId) => {
  try {
    const ref = collection(
      db,
      "Companies",
      companyId,
      "Expenses"
    );

    const q = query(ref, orderBy("createdAt", "desc"));

    const snap = await getDocs(q);

    return snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Fetch Expenses Error:", error);
    return [];
  }
};