import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

const jsonError = (error) => {
  const code = error?.message || "BILLING_INIT_FAILED";
  const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 400;
  return NextResponse.json({ error: code }, { status });
};

const settingsRef = (companyId) =>
  adminDb.collection("Companies").doc(companyId).collection("BillingSettings").doc("default");

function nextInvoiceNumber(companyData) {
  const sequence = Number(companyData?.sequences?.invoice || 0) + 1;
  const year = new Date().getFullYear();
  return `INV/${year}/${String(sequence).padStart(5, "0")}`;
}

export async function GET(request) {
  try {
    const context = await authorizeCompanyRequest(request);
    requireCompanyPermission(context, "billing.create", "billing.manage");

    const [companySnapshot, settingsSnapshot] = await Promise.all([
      adminDb.collection("Companies").doc(context.companyId).get(),
      settingsRef(context.companyId).get(),
    ]);

    const company = companySnapshot.exists ? companySnapshot.data() : null;
    const settings = settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null;

    return NextResponse.json({
      settings,
      nextInvoiceNumber: nextInvoiceNumber(company),
    });
  } catch (error) {
    console.error("Billing init read failed", {
      code: error?.message || error?.code || "unknown",
    });
    return jsonError(error);
  }
}
