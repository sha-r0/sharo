import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

const ref = (companyId) => collection(db, "Companies", companyId, "advance_requests");
export default class AdvanceService {
  static subscribe(companyId, onData, onError, employeeFirestoreId = null) {
    const source = employeeFirestoreId
      ? query(ref(companyId), where("employeeFirestoreId", "==", employeeFirestoreId))
      : ref(companyId);
    return onSnapshot(source, (snapshot) => {
      const records = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      records.sort((a, b) => (b.createdAt?.seconds || b.requestedAt?.seconds || 0) - (a.createdAt?.seconds || a.requestedAt?.seconds || 0));
      onData(records);
    }, onError);
  }

  static async getReferenceData() {
    const getReferences = httpsCallable(functions, "getAdvanceReferenceData");
    const result = await getReferences({});
    return result.data;
  }

  static async save(companyId, values, existingId) {
    const now = serverTimestamp();
    const payload = { ...values, companyId, amount: Number(values.amount || 0), monthlyDeduction: Number(values.monthlyDeduction || 0), months: Number(values.months || 0), interest: Number(values.interest || 0), remainingAmount: Number(values.remainingAmount ?? values.amount ?? 0), settledAmount: Number(values.settledAmount || 0), updatedAt: now };
    if (existingId) { await updateDoc(doc(db, "Companies", companyId, "advance_requests", existingId), payload); return existingId; }
    const createRequest = httpsCallable(functions, "createAdvanceRequest");
    const requestValues = {
      advanceType: values.advanceType,
      amount: values.amount,
      monthlyDeduction: values.monthlyDeduction,
      reason: values.reason,
      projectId: values.projectId,
      projectName: values.projectName,
      purpose: values.purpose,
      description: values.description,
      priority: values.priority,
      firstDeductionDate: values.firstDeductionDate instanceof Date ? values.firstDeductionDate.toISOString() : values.firstDeductionDate || null,
      requiredDate: values.requiredDate instanceof Date ? values.requiredDate.toISOString() : values.requiredDate || null,
    };
    const result = await createRequest(requestValues);
    return result.data.advanceId;
  }

  static async decide(advanceId, action) {
    const decide = httpsCallable(functions, "decideAdvance");
    const result = await decide({ advanceId, action });
    return result.data;
  }

  static async initiatePayout(advanceId) {
    const initiate = httpsCallable(functions, "initiateAdvancePayout");
    const result = await initiate({ advanceId });
    return result.data;
  }

  static async retryQueuedPayout(advanceId) {
    const retry = httpsCallable(functions, "retryQueuedAdvancePayout");
    const result = await retry({ advanceId });
    return result.data;
  }

  static async reconcilePayout(advanceId) {
    const reconcile = httpsCallable(functions, "reconcileAdvancePayout");
    const result = await reconcile({ advanceId });
    return result.data;
  }

  static async recordSettlement(companyId, advance, amount) {
    const settledAmount = Math.min(Number(advance.amount || 0), Number(advance.settledAmount || 0) + Number(amount || 0));
    const remainingAmount = Math.max(0, Number(advance.amount || 0) - settledAmount);
    await updateDoc(doc(db, "Companies", companyId, "advance_requests", advance.id), { settledAmount, remainingAmount, status: remainingAmount === 0 ? "Settled" : advance.status, updatedAt: serverTimestamp() });
  }

  static delete(companyId, id) { return deleteDoc(doc(db, "Companies", companyId, "advance_requests", id)); }
}
