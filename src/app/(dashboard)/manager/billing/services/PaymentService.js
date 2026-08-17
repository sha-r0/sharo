import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { allocatePayment } from "./PaymentAllocationService.js";

const identity = (user) => ({
  id: user?.id || user?.uid || "",
  uid: user?.uid || "",
  name: user?.name || user?.displayName || "Finance",
});

class PaymentService {
  async create(companyId, input, user) {
    const paymentRef = doc(collection(db, "Companies", companyId, "Payments"));
    const invoiceRef = doc(db, "Companies", companyId, "Invoices", input.invoiceId);
    return runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(invoiceRef);
      if (!snapshot.exists()) throw new Error("Invoice not found.");
      const invoice = { id: snapshot.id, ...snapshot.data() };
      const invoiceStatus = String(invoice.invoiceStatus || invoice.status || "draft").toLowerCase();
      if (["cancelled", "draft"].includes(invoiceStatus)) throw new Error("Payments cannot be recorded against draft or cancelled invoices.");
      const allocation = allocatePayment(invoice, input.amount);
      if (!allocation.valid) throw new Error(allocation.message);
      const actor = identity(user);
      const payment = {
        id: paymentRef.id,
        companyId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        projectId: invoice.projectId,
        projectName: invoice.projectName,
        clientId: invoice.clientId,
        clientName: invoice.clientName,
        amount: Number(input.amount),
        paymentDate: input.paymentDate,
        paymentMethod: input.paymentMethod || input.mode,
        mode: input.paymentMethod || input.mode,
        referenceNumber: input.referenceNumber || "",
        transactionId: input.transactionId || "",
        notes: input.notes || "",
        status: "received",
        createdBy: actor,
        receivedBy: actor,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.set(paymentRef, payment);
      transaction.update(invoiceRef, {
        paidAmount: allocation.paid,
        pendingAmount: allocation.pending,
        paymentStatus: allocation.paymentStatus,
        lastPaymentDate: input.paymentDate,
        updatedAt: serverTimestamp(),
        updatedBy: actor,
      });
      return { ...payment, paidAmount: allocation.paid, pendingAmount: allocation.pending, paymentStatus: allocation.paymentStatus };
    });
  }
}

export default new PaymentService();
export { allocatePayment } from "./PaymentAllocationService.js";
