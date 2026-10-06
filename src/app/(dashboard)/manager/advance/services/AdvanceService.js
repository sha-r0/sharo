import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";

// Only the canonical create contract crosses the callable boundary.
export function buildAdvanceRequestPayload(values) {
  const common = {
    advanceType: values.advanceType,
    amount: Number(values.amount),
    ...(values.employeeFirestoreId ? { employeeFirestoreId: values.employeeFirestoreId } : {}),
  };
  if (values.advanceType === "Company") return {
    ...common, projectId: values.projectId, workPurpose: values.workPurpose ?? values.purpose,
    requiredDate: values.requiredDate instanceof Date ? values.requiredDate.toISOString() : values.requiredDate || null,
    description: values.description || "", priority: values.priority === "High" ? "Urgent" : values.priority || "Normal",
    attachmentUrl: values.attachmentUrl || "",
  };
  return {
    ...common, reason: values.reason || "", repaymentMethod: values.repaymentMethod || "Salary Deduction",
    monthlyDeduction: Number(values.monthlyDeduction || 0), months: Number(values.months || 0),
    emergencyContact: values.emergencyContact || "",
  };
}

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
    const requestValues = { ...buildAdvanceRequestPayload(values), idempotencyKey: values.idempotencyKey };
    const result = await createRequest(requestValues);
    return result.data.advanceId || result.data.data?.requestId;
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

  static async delete(advanceId) {
    const deleteRequest = httpsCallable(functions, "deleteAdvanceRequest");
    const result = await deleteRequest({ advanceId });
    return result.data;
  }
}
