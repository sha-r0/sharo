import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";
import {
  companyVendorPaymentsRef,
  normalizePurchaseOrderStatus,
  normalizePurchaseOrderText,
  purchaseOrderBillsRef,
  purchaseOrderRef,
} from "../../purchase-orders/_shared";
import {
  evaluateVendorPayment,
  isVendorPaymentActiveAllocation,
  isVendorPaymentFinanciallyPaid,
} from "@/app/(dashboard)/manager/vendors/services/VendorPaymentPolicy";

const jsonError = (error) => {
  const code = error?.message || error?.code || "VENDOR_PAYMENT_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

const roundMoney = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const sumPayments = (payments, predicate) =>
  roundMoney(
    payments.reduce((sum, payment) => (
      predicate(payment) ? sum + Number(payment.amount || 0) : sum
    ), 0)
  );

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "vendors.create");

    const body = await request.json().catch(() => ({}));
    const purchaseOrderId = normalizePurchaseOrderText(body.purchaseOrderId);
    const purchaseOrderBillId = normalizePurchaseOrderText(body.purchaseOrderBillId);
    const amount = Number(body.amount || 0);
    const paymentDate = normalizePurchaseOrderText(body.paymentDate || body.date);
    const referenceNumber = normalizePurchaseOrderText(body.referenceNumber || "");
    const remarks = normalizePurchaseOrderText(body.remarks || "");

    if (!purchaseOrderId || !purchaseOrderBillId) throw new Error("PURCHASE_ORDER_BILL_REQUIRED");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("PAYMENT_AMOUNT_INVALID");
    if (!paymentDate) throw new Error("PAYMENT_DATE_REQUIRED");

    const purchaseOrderRefDoc = purchaseOrderRef(context.companyId, purchaseOrderId);
    const billRef = purchaseOrderBillsRef(context.companyId, purchaseOrderId).doc(purchaseOrderBillId);

    let responsePayload = null;

    await adminDb.runTransaction(async (transaction) => {
      const [purchaseOrderSnapshot, billSnapshot] = await Promise.all([
        transaction.get(purchaseOrderRefDoc),
        transaction.get(billRef),
      ]);

      if (!purchaseOrderSnapshot.exists) throw new Error("PURCHASE_ORDER_NOT_FOUND");
      if (!billSnapshot.exists) throw new Error("PURCHASE_ORDER_BILL_NOT_FOUND");

      const purchaseOrder = { id: purchaseOrderSnapshot.id, ...purchaseOrderSnapshot.data() };
      const bill = { id: billSnapshot.id, ...billSnapshot.data() };

      const purchaseOrderStatus = normalizePurchaseOrderStatus(purchaseOrder.status);
      if (!["issued", "partially_fulfilled", "completed"].includes(purchaseOrderStatus)) {
        throw new Error("PURCHASE_ORDER_BILL_NOT_ALLOWED");
      }
      if (String(bill.purchaseOrderId || purchaseOrderId) !== purchaseOrderId) {
        throw new Error("PURCHASE_ORDER_BILL_MISMATCH");
      }

      const canonicalVendorFirestoreId = String(purchaseOrder.vendorFirestoreId || purchaseOrder.vendorId || "").trim();
      const canonicalProjectFirestoreId = String(purchaseOrder.projectFirestoreId || purchaseOrder.projectId || "").trim();
      if (!canonicalVendorFirestoreId || !canonicalProjectFirestoreId) {
        throw new Error("PURCHASE_ORDER_REFERENCE_INVALID");
      }
      const poVendorIds = new Set([purchaseOrder.vendorFirestoreId, purchaseOrder.vendorId].filter(Boolean).map(String));
      const poProjectIds = new Set([purchaseOrder.projectFirestoreId, purchaseOrder.projectId].filter(Boolean).map(String));
      const billVendorIds = new Set([bill.vendorFirestoreId, bill.vendorId].filter(Boolean).map(String));
      const billProjectIds = new Set([bill.projectFirestoreId, bill.projectId].filter(Boolean).map(String));
      if (![...poVendorIds].includes(canonicalVendorFirestoreId) || ![...billVendorIds].includes(canonicalVendorFirestoreId)) {
        throw new Error("VENDOR_DOES_NOT_MATCH_PURCHASE_ORDER_BILL");
      }
      if (![...poProjectIds].includes(canonicalProjectFirestoreId) || ![...billProjectIds].includes(canonicalProjectFirestoreId)) {
        throw new Error("PROJECT_DOES_NOT_MATCH_PURCHASE_ORDER_BILL");
      }

      const vendorRef = adminDb.collection("Companies").doc(context.companyId).collection("Vendors").doc(canonicalVendorFirestoreId);
      const projectRef = adminDb.collection("Companies").doc(context.companyId).collection("Projectmanagement").doc(canonicalProjectFirestoreId);
      const vendorPaymentBillQuery = companyVendorPaymentsRef(context.companyId)
        .where("purchaseOrderBillId", "==", purchaseOrderBillId);
      const vendorPaymentPoQuery = companyVendorPaymentsRef(context.companyId)
        .where("purchaseOrderId", "==", purchaseOrderId);

      const [vendorSnapshot, projectSnapshot, billPaymentsSnapshot, poPaymentsSnapshot] = await Promise.all([
        transaction.get(vendorRef),
        transaction.get(projectRef),
        transaction.get(vendorPaymentBillQuery),
        transaction.get(vendorPaymentPoQuery),
      ]);

      if (!vendorSnapshot.exists) throw new Error("VENDOR_NOT_FOUND");
      if (!projectSnapshot.exists) throw new Error("PROJECT_NOT_FOUND");

      const vendor = { id: vendorSnapshot.id, ...vendorSnapshot.data() };
      const project = { id: projectSnapshot.id, ...projectSnapshot.data() };

      const projectVendors = Array.isArray(project.vendors) ? [...project.vendors] : [];
      const vendorIndex = projectVendors.findIndex((item) => {
        const candidateIds = new Set([
          item?.firestoreId,
          item?.vendorId,
          item?.vendorFirestoreId,
        ].filter(Boolean).map(String));
        return candidateIds.has(canonicalVendorFirestoreId);
      });
      if (vendorIndex < 0) throw new Error("This vendor is not assigned to the selected project.");

      const assignment = { ...projectVendors[vendorIndex] };
      const allocatedAmount = Number(assignment.allocatedAmount || assignment.contractValue || 0);
      const paidAmount = Number(assignment.paidAmount || 0);
      const policy = evaluateVendorPayment({
        allocatedAmount,
        paidAmount,
        paymentAmount: amount,
        managerApproved: false,
      });
      if (!policy.allowed) throw new Error(policy.reason);

      const billPayments = billPaymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const poPayments = poPaymentsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      const currentBillActiveAllocation = sumPayments(billPayments, isVendorPaymentActiveAllocation);
      const currentBillPaid = sumPayments(billPayments, isVendorPaymentFinanciallyPaid);
      const billTotal = roundMoney(Number(bill.grandTotal || bill.billTotal || 0));
      const availableForNewPayment = roundMoney(Math.max(0, billTotal - currentBillActiveAllocation));
      if (amount > availableForNewPayment + 0.0001) {
        throw new Error("PAYMENT_EXCEEDS_AVAILABLE_BILL_BALANCE");
      }

      const currentPoPaid = sumPayments(poPayments, isVendorPaymentFinanciallyPaid);

      assignment.paidAmount = roundMoney(paidAmount + amount);
      assignment.remainingAmount = roundMoney(Math.max(0, allocatedAmount - assignment.paidAmount));
      assignment.paymentPercent = allocatedAmount ? roundMoney((assignment.paidAmount / allocatedAmount) * 100) : 0;
      assignment.paymentStatus = assignment.paidAmount >= allocatedAmount ? "completed" : "partial";
      projectVendors[vendorIndex] = assignment;

      const nextProjectVendorCost = roundMoney(
        projectVendors.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0)
      );

      const nextBillPaid = roundMoney(currentBillPaid + amount);
      const nextBillOutstanding = roundMoney(Math.max(0, billTotal - nextBillPaid));
      const nextPoPaid = roundMoney(currentPoPaid + amount);
      const nextPoOutstanding = roundMoney(Math.max(0, Number(purchaseOrder.billedAmount || 0) - nextPoPaid));

      const paymentRef = companyVendorPaymentsRef(context.companyId).doc();
      const actor = {
        uid: context.employee?.uid || context.token.uid,
        name: context.employee?.name || context.employee?.displayName || context.company?.ownerName || "System",
        role: context.employee?.roleId || context.employee?.role || (context.isOwner ? "owner" : "employee"),
      };
      const payment = {
        id: paymentRef.id,
        companyId: context.companyId,
        vendorId: canonicalVendorFirestoreId,
        vendorFirestoreId: canonicalVendorFirestoreId,
        vendorName: String(vendor.vendorName || vendor.companyName || vendor.name || ""),
        projectId: canonicalProjectFirestoreId,
        projectFirestoreId: canonicalProjectFirestoreId,
        projectName: String(project.projectName || project.name || ""),
        amount: roundMoney(amount),
        date: paymentDate,
        referenceNumber,
        status: "paid",
        remarks,
        approvedBy: { id: actor.uid, name: actor.name },
        createdBy: { uid: actor.uid, name: actor.name, role: actor.role },
        managerApproved: false,
        allocationExceeded: false,
        allocatedAmount,
        runningBalance: roundMoney(Math.max(0, allocatedAmount - (paidAmount + amount))),
        purchaseOrderId: purchaseOrder.id,
        purchaseOrderBillId: bill.id,
        purchaseOrderNumber: String(purchaseOrder.poNumber || ""),
        purchaseOrderBillNumber: String(bill.billNumber || referenceNumber || ""),
        billTotal,
        billPaidAmount: nextBillPaid,
        billOutstandingAmount: nextBillOutstanding,
        paymentSource: "purchase_order_bill",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      transaction.set(paymentRef, payment);
      transaction.update(projectRef, {
        vendors: projectVendors,
        vendorExpense: nextProjectVendorCost,
        vendorCost: nextProjectVendorCost,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(vendorRef, {
        totalPaid: roundMoney(Number(vendor.totalPaid || 0) + amount),
        lastPaymentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(billRef, {
        paidAmount: nextBillPaid,
        outstandingAmount: nextBillOutstanding,
        paymentStatus: nextBillOutstanding <= 0 ? "paid" : nextBillPaid > 0 ? "partially_paid" : "unpaid",
        lastPaymentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(purchaseOrderRefDoc, {
        paidAmount: nextPoPaid,
        outstandingAmount: nextPoOutstanding,
        updatedAt: FieldValue.serverTimestamp(),
      });

      responsePayload = { payment, bill: { id: bill.id, paidAmount: nextBillPaid, outstandingAmount: nextBillOutstanding, paymentStatus: nextBillOutstanding <= 0 ? "paid" : nextBillPaid > 0 ? "partially_paid" : "unpaid" } };
    });

    return NextResponse.json({ success: true, ...responsePayload });
  } catch (error) {
    console.error("Vendor payment PO bill create failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
