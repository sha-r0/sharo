import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { authorizeCompanyRequest, requireCompanyPermission } from "@/lib/server/authorizeCompanyRequest";

const jsonError = (error) => {
  const code = error?.message || "QUOTATION_REQUEST_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

const settingsRef = (companyId) => adminDb.collection("Companies").doc(companyId).collection("QuotationSettings").doc("default");

function formatNextQuotationNumber(settings) {
  if (!settings) return "QT-0001";
  const prefix = String(settings.quotationPrefix || "QT").trim().toUpperCase();
  const sequence = Number(settings.nextQuotationNumber || 1);
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "quotation.view", "quotation.manage");
    const companyRef = adminDb.collection("Companies").doc(context.companyId);
    const quotationId = new URL(request.url).searchParams.get("quotationId");
    const [settingsSnapshot, clientsSnapshot, quotationSnapshot] = await Promise.all([
      settingsRef(context.companyId).get(),
      companyRef.collection("Clients").orderBy("companyName").get(),
      quotationId ? companyRef.collection("Quotations").doc(quotationId).get() : Promise.resolve(null),
    ]);
    const settings = settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null;
    return NextResponse.json({
      settings,
      nextQuotationNumber: formatNextQuotationNumber(settings),
      clients: clientsSnapshot.docs.map((document) => ({ id: document.id, ...document.data() })),
      quotation: quotationSnapshot?.exists ? { id: quotationSnapshot.id, ...quotationSnapshot.data() } : null,
    });
  } catch (error) {
    console.error("Quotation settings read failed", { code: error?.message || error?.code || "unknown" });
    return jsonError(error);
  }
}

export async function PUT(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "quotation.manage");
    const input = await request.json();
    const reference = settingsRef(context.companyId);
    const existing = await reference.get();
    const payload = {
      branding: input.branding && typeof input.branding === "object" ? input.branding : {},
      bank: input.bank && typeof input.bank === "object" ? input.bank : {},
      terms: input.terms && typeof input.terms === "object" ? input.terms : {},
      signature: input.signature && typeof input.signature === "object" ? input.signature : {},
      setupCompleted: true,
      defaultValidityDays: Math.max(1, Number(input.defaultValidityDays || 30)),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (input.quotationPrefix) payload.quotationPrefix = String(input.quotationPrefix).trim().toUpperCase();
    if (!existing.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
      payload.nextQuotationNumber = 1;
      payload.quotationPrefix ||= "QT";
    }
    const companyRef = adminDb.collection("Companies").doc(context.companyId);
    const batch = adminDb.batch();
    batch.set(reference, payload, { merge: true });
    batch.update(companyRef, { quotationSetupCompleted: true, quotationSetupUpdatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    return NextResponse.json({ success: true, isNewSetup: !existing.exists });
  } catch (error) {
    console.error("Quotation settings update failed", { code: error?.message || error?.code || "unknown" });
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "quotation.create", "quotation.manage");
    const data = await request.json();
    if (!String(data?.quotationNumber || "").trim()) throw new Error("QUOTATION_NUMBER_REQUIRED");
    if (!String(data?.clientName || "").trim()) throw new Error("CLIENT_NAME_REQUIRED");

    const companyRef = adminDb.collection("Companies").doc(context.companyId);
    const quotationRef = companyRef.collection("Quotations").doc();
    const reference = settingsRef(context.companyId);
    await adminDb.runTransaction(async (transaction) => {
      const settings = await transaction.get(reference);
      if (!settings.exists) throw new Error("QUOTATION_SETUP_INCOMPLETE");
      transaction.create(quotationRef, {
        ...data,
        id: quotationRef.id,
        companyId: context.companyId,
        createdBy: context.token.uid,
        status: data.status || "Draft",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(reference, { nextQuotationNumber: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    });
    return NextResponse.json({ success: true, id: quotationRef.id });
  } catch (error) {
    console.error("Quotation creation failed", { code: error?.message || error?.code || "unknown" });
    return jsonError(error);
  }
}
