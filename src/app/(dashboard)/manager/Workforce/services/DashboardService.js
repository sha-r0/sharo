import {
    collection,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    orderBy,
    limit,
  } from "firebase/firestore";
  import { db } from "@/lib/firebase";
  
  export default class DashboardService {
    static collection(companyId) {
      return collection(
        db,
        "Companies",
        companyId,
        "Attendance"
      );
    }
  
    static async getTodayAttendance(companyId) {
      const today = new Date().toISOString().split("T")[0];
  
      const q = query(
        this.collection(companyId),
        where("date", "==", today),
        orderBy("checkIn", "desc")
      );
  
      const snap = await getDocs(q);
  
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
  
    static async getGpsAttendance(companyId) {
      const today = new Date().toISOString().split("T")[0];
  
      const q = query(
        this.collection(companyId),
        where("date", "==", today),
        where("gpsValid", "==", true),
        orderBy("checkIn", "desc")
      );
  
      const snap = await getDocs(q);
  
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
  
    static async getPendingGps(companyId) {
      const today = new Date().toISOString().split("T")[0];
  
      const q = query(
        this.collection(companyId),
        where("date", "==", today),
        where("approvalStatus", "==", "pending")
      );
  
      const snap = await getDocs(q);
  
      return snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }
  
    static async getAttendanceSummary(companyId) {
      const records = await this.getTodayAttendance(companyId);
  
      return {
        total: records.length,
        present: records.filter((x) => x.status === "present").length,
        absent: records.filter((x) => x.status === "absent").length,
        late: records.filter((x) => x.status === "late").length,
        pendingGps: records.filter(
          (x) => x.approvalStatus === "pending"
        ).length,
      };
    }
  }