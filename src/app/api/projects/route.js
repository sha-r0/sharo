import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

const jsonError = (error) => {
  const code = error?.message || "PROJECT_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

const projectCollection = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("Projectmanagement");

const number = (value) => Number(value || 0);

function normalizeText(value, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

function nextProjectIdFromDocs(docs) {
  let max = 0;
  docs.forEach((document) => {
    const value = String(document?.projectId || "").trim();
    const parsed = Number(value.replace(/^PRJ/i, ""));
    if (Number.isFinite(parsed) && parsed > max) {
      max = parsed;
    }
  });
  return `PRJ${String(max + 1).padStart(5, "0")}`;
}

function buildProjectPayload({ companyId, firestoreId, projectId, form, token }) {
  const poAmount = number(form?.poAmount);
  const budget = number(form?.budget);

  return {
    id: firestoreId,
    companyId,
    projectId,
    projectCode: projectId,
    projectName: normalizeText(form?.projectName),
    clientId: normalizeText(form?.clientId),
    clientName: normalizeText(form?.clientName),
    managerId: normalizeText(form?.managerId),
    managerName: normalizeText(form?.managerName),
    projectType: normalizeText(form?.projectType, "Structural Design"),
    executionModel: normalizeText(form?.executionModel, "inhouse"),
    priority: normalizeText(form?.priority, "Medium"),
    location: normalizeText(form?.location),
    poAmount,
    budget,
    totalExpense: 0,
    employeeExpense: 0,
    normalExpense: 0,
    vendorExpense: 0,
    materialExpense: 0,
    totalProfit: budget,
    startDate: form?.startDate || null,
    endDate: form?.endDate || null,
    status: normalizeText(form?.status, "Pending"),
    progress: 0,
    healthScore: 100,
    overdue: false,
    employees: (Array.isArray(form?.employees) ? form.employees : []).map((employee) => ({
      firestoreId: employee.firestoreId || employee.id || "",
      employeeId: employee.employeeId || "",
      fullName: employee.fullName || "",
      designation: employee.designation || "",
      salary: number(employee.salary),
      hours: number(employee.hours),
    })),
    employeeCount: Array.isArray(form?.employees) ? form.employees.length : 0,
    vendors: (Array.isArray(form?.vendors) ? form.vendors : []).map((vendor) => ({
      firestoreId: vendor.firestoreId || vendor.id || vendor.vendorId || "",
      vendorId: vendor.vendorId || vendor.firestoreId || vendor.id || "",
      vendorCode: vendor.vendorCode || "",
      vendorName: vendor.vendorName || vendor.companyName || "",
      contactPerson: vendor.contactPerson || "",
      phone: vendor.phone || "",
      allocatedAmount: number(vendor.allocatedAmount),
      paidAmount: number(vendor.paidAmount),
      remainingAmount: Math.max(0, number(vendor.allocatedAmount) - number(vendor.paidAmount)),
      paymentPercent: number(vendor.paymentPercent),
      scope: vendor.scope || "",
      targetCompletion: vendor.targetCompletion || null,
      paymentTerms: vendor.paymentTerms || "",
      notes: vendor.notes || "",
      progress: number(vendor.progress),
      status: vendor.status || "assigned",
      assignedAt: new Date().toISOString(),
    })),
    vendorCount: Array.isArray(form?.vendors) ? form.vendors.length : 0,
    description: normalizeText(form?.description),
    totalHours: 0,
    completedTasks: 0,
    pendingTasks: 0,
    delayedTasks: 0,
    totalReceived: 0,
    totalPending: poAmount,
    createdBy: {
      uid: token?.uid || "",
      name: token?.name || token?.displayName || "",
      email: token?.email || "",
    },
    updatedBy: {
      uid: token?.uid || "",
      name: token?.name || token?.displayName || "",
      email: token?.email || "",
    },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "projects.create", "projects.manage");

    const { form } = await request.json();
    if (!normalizeText(form?.projectName)) throw new Error("PROJECT_NAME_REQUIRED");
    if (!normalizeText(form?.clientId)) throw new Error("CLIENT_REQUIRED");
    if (!normalizeText(form?.startDate)) throw new Error("START_DATE_REQUIRED");
    if (!normalizeText(form?.endDate)) throw new Error("END_DATE_REQUIRED");

    const collectionRef = projectCollection(context.companyId);

    let createdProject = null;
    await adminDb.runTransaction(async (transaction) => {
      const latestSnapshot = await transaction.get(
        collectionRef.orderBy("projectId", "desc").limit(1)
      );
      const latestDocs = latestSnapshot.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));
      const projectId = nextProjectIdFromDocs(latestDocs);
      const firestoreId = collectionRef.doc().id;
      const payload = buildProjectPayload({
        companyId: context.companyId,
        firestoreId,
        projectId,
        form,
        token: context.token,
      });
      const projectRef = collectionRef.doc(firestoreId);
      transaction.create(projectRef, payload);
      createdProject = { id: firestoreId, ...payload };
    });

    return NextResponse.json({ success: true, project: createdProject });
  } catch (error) {
    console.error("Project creation failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
