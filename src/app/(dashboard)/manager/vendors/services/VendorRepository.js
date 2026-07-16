import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { evaluateVendorPayment } from "./VendorPaymentPolicy";

class VendorRepository {
  collection(companyId) { return collection(db, "Companies", companyId, "Vendors"); }
  payments(companyId) { return collection(db, "Companies", companyId, "VendorPayments"); }

  async create(companyId, data) {
    const vendorRef = doc(this.collection(companyId));
    const companyRef = doc(db, "Companies", companyId);
    await runTransaction(db, async (transaction) => {
      const company = await transaction.get(companyRef);
      const sequence = Number(company.data()?.sequences?.vendor || 0) + 1;
      transaction.set(vendorRef, { ...data, id: vendorRef.id, vendorId: `VEN${String(sequence).padStart(5, "0")}`, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      transaction.set(companyRef, { sequences: { ...(company.data()?.sequences || {}), vendor: sequence } }, { merge: true });
    });
    return vendorRef.id;
  }

  async update(companyId, vendorId, data) {
    await updateDoc(doc(this.collection(companyId), vendorId), { ...data, updatedAt: serverTimestamp() });
  }

  async remove(companyId, vendorId) { await deleteDoc(doc(this.collection(companyId), vendorId)); }
  async get(companyId, vendorId) {
    const snapshot = await getDoc(doc(this.collection(companyId), vendorId));
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
  }
  async getAll(companyId) {
    const snapshot = await getDocs(query(this.collection(companyId), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }
  async getPayments(companyId) {
    const snapshot = await getDocs(query(this.payments(companyId), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  }
  subscribe(companyId, callback, onError) {
    let vendors = []; let payments = [];
    const publish = () => callback({ vendors, payments });
    const stopVendors = onSnapshot(query(this.collection(companyId), orderBy("createdAt", "desc")), (snapshot) => {
      vendors = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish();
    }, onError);
    const stopPayments = onSnapshot(query(this.payments(companyId), orderBy("createdAt", "desc")), (snapshot) => {
      payments = snapshot.docs.map((item) => ({ id: item.id, ...item.data() })); publish();
    }, onError);
    return () => { stopVendors(); stopPayments(); };
  }

  async createPayment(companyId, input, approver) {
    const paymentRef = doc(this.payments(companyId));
    const vendorRef = doc(this.collection(companyId), input.vendorId);
    const projectRef = doc(db, "Companies", companyId, "Projectmanagement", input.projectId);
    return runTransaction(db, async (transaction) => {
      const [vendorSnapshot, projectSnapshot] = await Promise.all([transaction.get(vendorRef), transaction.get(projectRef)]);
      if (!vendorSnapshot.exists()) throw new Error("Vendor not found.");
      if (!projectSnapshot.exists()) throw new Error("Project not found.");
      const project = projectSnapshot.data();
      const vendors = [...(project.vendors || [])];
      const index = vendors.findIndex((item) => item.vendorId === input.vendorId || item.firestoreId === input.vendorId);
      if (index < 0) throw new Error("This vendor is not assigned to the selected project.");
      const assignment = { ...vendors[index] };
      const amount = Number(input.amount || 0); const allocated = Number(assignment.allocatedAmount || assignment.contractValue || 0);
      const paid = Number(assignment.paidAmount || 0); const policy = evaluateVendorPayment({ allocatedAmount: allocated, paidAmount: paid, paymentAmount: amount, managerApproved: input.managerApproved });
      if (!policy.allowed) throw new Error(policy.reason);
      const nextPaid = policy.nextPaid;
      assignment.paidAmount = nextPaid;
      assignment.remainingAmount = policy.remaining;
      assignment.paymentPercent = policy.paymentPercent;
      assignment.paymentStatus = nextPaid >= allocated ? "completed" : "partial";
      vendors[index] = assignment;
      const projectVendorCost = vendors.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
      const payment = {
        id: paymentRef.id, companyId, vendorId: input.vendorId,
        vendorName: vendorSnapshot.data().companyName || vendorSnapshot.data().vendorName,
        projectId: input.projectId, projectName: project.projectName || "",
        amount, date: input.date, referenceNumber: input.referenceNumber || "",
        status: input.status || "paid", remarks: input.remarks || "",
        approvedBy: { id: approver?.id || approver?.uid || "", name: approver?.name || approver?.displayName || "Manager" },
        managerApproved: Boolean(input.managerApproved), allocationExceeded: nextPaid > allocated,
        allocatedAmount: allocated, runningBalance: Math.max(0, allocated - nextPaid), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      transaction.set(paymentRef, payment);
      transaction.update(projectRef, { vendors, vendorExpense: projectVendorCost, vendorCost: projectVendorCost, updatedAt: serverTimestamp() });
      transaction.update(vendorRef, { totalPaid: Number(vendorSnapshot.data().totalPaid || 0) + amount, lastPaymentAt: serverTimestamp(), updatedAt: serverTimestamp() });
      return { id: paymentRef.id, ...payment };
    });
  }
}

export default new VendorRepository();
