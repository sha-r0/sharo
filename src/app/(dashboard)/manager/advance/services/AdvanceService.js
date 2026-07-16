import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import notificationService from "@/app/allservice/notification/notificationService";

const ref = (companyId) => collection(db, "Companies", companyId, "advance_requests");
const employeeName = (data) => data.personalInfo?.fullName || data.fullName || data.name || "Unnamed employee";

export default class AdvanceService {
  static subscribe(companyId, onData, onError) {
    return onSnapshot(ref(companyId), (snapshot) => {
      const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      records.sort((a, b) => (b.createdAt?.seconds || b.requestedAt?.seconds || 0) - (a.createdAt?.seconds || a.requestedAt?.seconds || 0));
      onData(records);
    }, onError);
  }

  static async getReferenceData(companyId) {
    const [employees, projects] = await Promise.all([
      getDocs(collection(db, "Companies", companyId, "Usermanagement")),
      getDocs(collection(db, "Companies", companyId, "Projectmanagement")),
    ]);
    return {
      employees: employees.docs.map((item) => { const data = item.data(); return { id: item.id, ...data, employeeName: employeeName(data), employeeId: data.employeeId || data.login?.employeeId || "", department: data.employment?.department || data.department || "", designation: data.employment?.designation || data.designation || "", employeePhotoUrl: data.personalInfo?.photoUrl || data.photoUrl || "" }; }),
      projects: projects.docs.map((item) => ({ id: item.id, ...item.data() })),
    };
  }

  static async save(companyId, values, existingId) {
    const now = serverTimestamp();
    const payload = { ...values, companyId, amount: Number(values.amount || 0), monthlyDeduction: Number(values.monthlyDeduction || 0), months: Number(values.months || 0), interest: Number(values.interest || 0), remainingAmount: Number(values.remainingAmount ?? values.amount ?? 0), settledAmount: Number(values.settledAmount || 0), updatedAt: now };
    if (existingId) { await updateDoc(doc(db, "Companies", companyId, "advance_requests", existingId), payload); return existingId; }
    const created = await addDoc(ref(companyId), { ...payload, requestId: "", status: values.status || "Approved", requestedAt: now, createdAt: now });
    await updateDoc(created, { requestId: created.id });
    await notificationService.emitSafe("advance.approved", { companyId, targetUsers: [values.employeeFirestoreId], employeeName: values.employeeName, actionId: created.id, actionRoute: "/manager/advance", metadata: { advanceId: created.id, amount: payload.amount, advanceType: values.advanceType } });
    return created.id;
  }

  static async setStatus(companyId, advance, status, remarks, manager) {
    const approved = status === "Approved";
    await updateDoc(doc(db, "Companies", companyId, "advance_requests", advance.id), { status, managerRemarks: remarks || "", approvedAt: approved ? serverTimestamp() : null, approvedBy: manager?.id || manager?.uid || manager?.name || "Manager", updatedAt: serverTimestamp() });
    await notificationService.emitSafe(`advance.${approved ? "approved" : "rejected"}`, { companyId, targetUsers: [advance.employeeFirestoreId], employeeName: advance.employeeName, actionId: advance.id, actionRoute: "/manager/advance", metadata: { advanceId: advance.id, amount: advance.amount, remarks: remarks || "" } });
  }

  static async recordSettlement(companyId, advance, amount) {
    const settledAmount = Math.min(Number(advance.amount || 0), Number(advance.settledAmount || 0) + Number(amount || 0));
    const remainingAmount = Math.max(0, Number(advance.amount || 0) - settledAmount);
    await updateDoc(doc(db, "Companies", companyId, "advance_requests", advance.id), { settledAmount, remainingAmount, status: remainingAmount === 0 ? "Settled" : advance.status, updatedAt: serverTimestamp() });
  }

  static delete(companyId, id) { return deleteDoc(doc(db, "Companies", companyId, "advance_requests", id)); }
}
