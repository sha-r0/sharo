import {
  collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp, setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  normalizePurchaseOrderStatus,
  summarizePurchaseOrderProgress,
} from "@/lib/purchase-orders";
import { evaluateVendorPayment } from "./VendorPaymentPolicy";

class VendorRepository {
  collection(companyId) { return collection(db, "Companies", companyId, "Vendors"); }
  payments(companyId) { return collection(db, "Companies", companyId, "VendorPayments"); }

  async createPurchaseOrderBillPayment(companyId, input, approver) {
    const firebaseUser = auth.currentUser || (approver && typeof approver.getIdToken === "function" ? approver : null);
    if (!firebaseUser) throw new Error("UNAUTHENTICATED");
    const token = await firebaseUser.getIdToken();
    const response = await fetch("/api/vendor-payments/po-bill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        purchaseOrderId: String(input.purchaseOrderId || "").trim(),
        purchaseOrderBillId: String(input.purchaseOrderBillId || "").trim(),
        amount: Number(input.amount || 0),
        paymentDate: input.date || input.paymentDate || "",
        referenceNumber: String(input.referenceNumber || "").trim(),
        remarks: String(input.remarks || "").trim(),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || "Unable to create purchase order bill payment.");
    return {
      success: true,
      id: result.payment?.id || result.id || "",
      data: result.payment || result.data || null,
      message: "Vendor payment recorded.",
    };
  }

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
    const linkedPurchaseOrderId = String(input.purchaseOrderId || "").trim();
    const linkedPurchaseOrderBillId = String(input.purchaseOrderBillId || "").trim();
    if (linkedPurchaseOrderId || linkedPurchaseOrderBillId) {
      if (!(linkedPurchaseOrderId && linkedPurchaseOrderBillId)) {
        throw new Error("PURCHASE_ORDER_BILL_REQUIRED");
      }
      return this.createPurchaseOrderBillPayment(companyId, input, approver);
    }

    const paymentRef = doc(this.payments(companyId));
    const vendorRef = doc(this.collection(companyId), input.vendorId);
    const projectRef = doc(db, "Companies", companyId, "Projectmanagement", input.projectId);
    const linkedBillRef = linkedPurchaseOrderId && linkedPurchaseOrderBillId
      ? doc(db, "Companies", companyId, "PurchaseOrders", linkedPurchaseOrderId, "Bills", linkedPurchaseOrderBillId)
      : null;
    const linkedPurchaseOrderRef = linkedPurchaseOrderId
      ? doc(db, "Companies", companyId, "PurchaseOrders", linkedPurchaseOrderId)
      : null;

    return runTransaction(db, async (transaction) => {
      const reads = [transaction.get(vendorRef), transaction.get(projectRef)];
      if (linkedPurchaseOrderRef && linkedBillRef) {
        reads.push(transaction.get(linkedPurchaseOrderRef), transaction.get(linkedBillRef));
      }

      const snapshots = await Promise.all(reads);
      const vendorSnapshot = snapshots[0];
      const projectSnapshot = snapshots[1];
      const purchaseOrderSnapshot = linkedPurchaseOrderRef && linkedBillRef ? snapshots[2] : null;
      const billSnapshot = linkedPurchaseOrderRef && linkedBillRef ? snapshots[3] : null;

      if (!vendorSnapshot.exists()) throw new Error("Vendor not found.");
      if (!projectSnapshot.exists()) throw new Error("Project not found.");

      const vendorData = vendorSnapshot.data();
      const project = projectSnapshot.data();
      const vendors = [...(project.vendors || [])];
      const index = vendors.findIndex((item) => item.vendorId === input.vendorId || item.firestoreId === input.vendorId);
      if (index < 0) throw new Error("This vendor is not assigned to the selected project.");

      const assignment = { ...vendors[index] };
      const amount = Number(input.amount || 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be greater than zero.");

      const allocated = Number(assignment.allocatedAmount || assignment.contractValue || 0);
      const paid = Number(assignment.paidAmount || 0);
      const nextPaid = paid + amount;
      const policy = evaluateVendorPayment({
        allocatedAmount: allocated,
        paidAmount: paid,
        paymentAmount: amount,
        managerApproved: Boolean(input.managerApproved),
      });
      if (!policy.allowed) throw new Error(policy.reason);
      assignment.paidAmount = policy.nextPaid;
      assignment.remainingAmount = policy.remaining;
      assignment.paymentPercent = policy.paymentPercent;
      assignment.paymentStatus = policy.nextPaid >= allocated ? "completed" : "partial";

      let linkedBill = null;
      let linkedPurchaseOrder = null;
      let paymentStatus = input.status || "paid";
      let managerApproved = Boolean(input.managerApproved);

      if (linkedPurchaseOrderRef && linkedBillRef) {
        if (!purchaseOrderSnapshot?.exists()) throw new Error("Purchase order not found.");
        if (!billSnapshot?.exists()) throw new Error("Purchase order bill not found.");

        linkedPurchaseOrder = { id: purchaseOrderSnapshot.id, ...purchaseOrderSnapshot.data() };
        linkedBill = { id: billSnapshot.id, ...billSnapshot.data() };
        const purchaseOrderStatus = normalizePurchaseOrderStatus(linkedPurchaseOrder.status);
        if (!["issued", "partially_fulfilled", "completed"].includes(purchaseOrderStatus)) {
          throw new Error("Purchase order bill payments require an issued or fulfilled PO.");
        }

        const poVendorIds = new Set(
          [linkedPurchaseOrder.vendorFirestoreId, linkedPurchaseOrder.vendorId].filter(Boolean).map(String)
        );
        const poProjectIds = new Set(
          [linkedPurchaseOrder.projectFirestoreId, linkedPurchaseOrder.projectId].filter(Boolean).map(String)
        );
        const billVendorIds = new Set(
          [linkedBill.vendorFirestoreId, linkedBill.vendorId].filter(Boolean).map(String)
        );
        const billProjectIds = new Set(
          [linkedBill.projectFirestoreId, linkedBill.projectId].filter(Boolean).map(String)
        );
        const vendorKey = String(input.vendorId || "");
        const projectKey = String(input.projectId || "");
        if (![...poVendorIds].includes(vendorKey) || ![...billVendorIds].includes(vendorKey)) {
          throw new Error("Vendor does not match the selected purchase order bill.");
        }
        if (![...poProjectIds].includes(projectKey) || ![...billProjectIds].includes(projectKey)) {
          throw new Error("Project does not match the selected purchase order bill.");
        }

        const billTotal = Number(linkedBill.grandTotal || linkedBill.billTotal || 0);
        const billPaid = Number(linkedBill.paidAmount || 0);
        const billOutstanding = Number(linkedBill.outstandingAmount ?? Math.max(0, billTotal - billPaid));
        if (amount > billOutstanding + 0.0001) {
          throw new Error("Payment exceeds the outstanding purchase order bill amount.");
        }
        paymentStatus = "paid";
        managerApproved = false;
      }

      vendors[index] = assignment;
      const projectVendorCost = vendors.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
      const payment = {
        id: paymentRef.id,
        companyId,
        vendorId: String(input.vendorId || ""),
        vendorFirestoreId: vendorSnapshot.id,
        vendorName: vendorData.companyName || vendorData.vendorName,
        projectId: linkedPurchaseOrder?.projectId || input.projectId,
        projectFirestoreId: linkedPurchaseOrder?.projectFirestoreId || input.projectId,
        projectName: project.projectName || "",
        amount,
        date: input.date,
        referenceNumber: input.referenceNumber || "",
        status: paymentStatus,
        remarks: input.remarks || "",
        approvedBy: { id: approver?.id || approver?.uid || "", name: approver?.name || approver?.displayName || "Manager" },
        managerApproved,
        allocationExceeded: nextPaid > allocated,
        allocatedAmount: allocated,
        runningBalance: Math.max(0, allocated - nextPaid),
        purchaseOrderId: linkedPurchaseOrder?.id || input.purchaseOrderId || "",
        purchaseOrderBillId: linkedBill?.id || input.purchaseOrderBillId || "",
        purchaseOrderNumber: linkedPurchaseOrder?.poNumber || "",
        purchaseOrderBillNumber: linkedBill?.billNumber || input.vendorBillNumber || input.referenceNumber || "",
        billTotal: Number(linkedBill?.grandTotal || linkedBill?.billTotal || 0),
        billPaidAmount: linkedBill ? Number(linkedBill.paidAmount || 0) + amount : 0,
        billOutstandingAmount: linkedBill ? Math.max(0, Number(linkedBill.outstandingAmount ?? Number(linkedBill.grandTotal || linkedBill.billTotal || 0)) - amount) : 0,
        paymentSource: linkedBill ? "purchase_order_bill" : "project_vendor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      transaction.set(paymentRef, payment);
      transaction.update(projectRef, {
        vendors,
        vendorExpense: projectVendorCost,
        vendorCost: projectVendorCost,
        updatedAt: serverTimestamp(),
      });
      transaction.update(vendorRef, {
        totalPaid: Number(vendorData.totalPaid || 0) + amount,
        lastPaymentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (linkedPurchaseOrderRef && linkedBillRef && linkedPurchaseOrder && linkedBill) {
        const nextBillPaid = Number(linkedBill.paidAmount || 0) + amount;
        const nextBillOutstanding = Math.max(
          0,
          Number(linkedBill.outstandingAmount ?? Number(linkedBill.grandTotal || linkedBill.billTotal || 0)) - amount,
        );
        const nextPoPaid = Number(linkedPurchaseOrder.paidAmount || 0) + amount;
        const nextPoOutstanding = Math.max(
          0,
          Number(linkedPurchaseOrder.billedAmount || 0) - nextPoPaid,
        );
        transaction.update(linkedBillRef, {
          paidAmount: nextBillPaid,
          outstandingAmount: nextBillOutstanding,
          paymentStatus: nextBillOutstanding <= 0 ? "paid" : nextBillPaid > 0 ? "partially_paid" : "unpaid",
          lastPaymentAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        transaction.update(linkedPurchaseOrderRef, {
          paidAmount: nextPoPaid,
          outstandingAmount: nextPoOutstanding,
          updatedAt: serverTimestamp(),
        });
      }

      return { id: paymentRef.id, ...payment };
    });
  }
}

export default new VendorRepository();
