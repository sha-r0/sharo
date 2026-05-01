import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// 🔥 pass companyId
export const fetchUsersByCompany = async (companyId) => {
  if (!companyId) return [];

  const ref = collection(db, "Companies", companyId, "Usermanagement");

  const snap = await getDocs(ref);

  return snap.docs.map((doc) => {
    const d = doc.data();

    return {
      id: doc.id,
      employeeId: d.employeeId || "",
      name: d.name || "Unknown",
      email: d.email || "",
      salary: Number(d.salary || 0),
      role: d.role || "",
      department: d.department || "",
      isActive: d.isActive ?? true,
    };
  });
};