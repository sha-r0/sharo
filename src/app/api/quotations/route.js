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
    const searchParams =
      new URL(request.url).searchParams;

    const quotationId =
      searchParams.get("quotationId");

    const includeClients =
      searchParams.get("includeClients") !== "false";
    const [
      settingsSnapshot,
      clientsSnapshot,
      quotationSnapshot,
    ] = await Promise.all([
      settingsRef(context.companyId).get(),

      includeClients
        ? companyRef
          .collection("Clients")
          .orderBy("companyName")
          .get()
        : Promise.resolve(null),

      quotationId
        ? companyRef
          .collection("Quotations")
          .doc(quotationId)
          .get()
        : Promise.resolve(null),
    ]);
    const settings = settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null;

    function quotationSortFields(quotationNumber, prefix = "QT") {
      const value =
        String(quotationNumber || "").trim();

      const normalizedPrefix =
        String(prefix || "QT")
          .trim()
          .toUpperCase();

      const current =
        value
          .toUpperCase()
          .startsWith(
            `${normalizedPrefix}-`
          ) &&
        /^(\d{2}|\d{4})-\d+$/.test(
          value.slice(
            normalizedPrefix.length + 1
          )
        );

      const pieces =
        current
          ? value
            .slice(
              normalizedPrefix.length + 1
            )
            .split("-")
          : [];

      const suffix =
        value.match(
          /(\d+)(?:-[A-Za-z]+)?$/
        )?.[1] || "";

      const year =
        current
          ? Number(
            pieces[0].length === 2
              ? `20${pieces[0]}`
              : pieces[0]
          )
          : 0;

      /*
       * String key avoids JS safe-integer issues
       * while preserving numeric ordering.
       */
      const sequenceKey =
        suffix
          ? `${String(
            suffix.length
          ).padStart(6, "0")}:${suffix}`
          : "000000:";

      return {
        quotationSortCurrent:
          current ? 1 : 0,

        quotationSortYear:
          year,

        quotationSortSequence:
          sequenceKey,

        quotationSortValue:
          value.toLowerCase(),
      };
    }
    return NextResponse.json({
      settings,
      nextQuotationNumber: formatNextQuotationNumber(settings),
      clients:
        clientsSnapshot?.docs?.map(
          (document) => ({
            id: document.id,
            ...document.data(),
          })
        ) || [],
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
      const settingsData =
        settings.data();

      const sortFields =
        quotationSortFields(
          data.quotationNumber,
          settingsData?.quotationPrefix ||
          "QT"
        );
        transaction.create(quotationRef, {
          ...data,
          ...sortFields,
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

export async function DELETE(request) {
  try {
    const context = await authorizeCompanyRequest(request);

    requireCompanyPermission(
      context,
      "quotation.manage"
    );

    const quotationId = String(
      new URL(request.url).searchParams.get("quotationId") || ""
    ).trim();

    if (!quotationId) {
      throw new Error("QUOTATION_ID_REQUIRED");
    }

    const quotationRef = adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("Quotations")
      .doc(quotationId);

    let deletedQuotation = null;

    await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(quotationRef);

      if (!snapshot.exists) {
        throw new Error("QUOTATION_NOT_FOUND");
      }

      deletedQuotation = {
        id: snapshot.id,
        ...snapshot.data(),
      };

      transaction.delete(quotationRef);
    });

    return NextResponse.json({
      success: true,

      deletedQuotation: {
        id: deletedQuotation.id,

        quotationNumber:
          deletedQuotation.quotationNumber ||
          deletedQuotation.meta?.quotationNo ||
          deletedQuotation.id,

        clientName:
          deletedQuotation.clientName ||
          deletedQuotation.meta?.clientName ||
          "",

        status:
          deletedQuotation.status ||
          "Draft",
      },
    });
  } catch (error) {
    console.error("Quotation deletion failed", {
      code:
        error?.message ||
        error?.code ||
        "unknown",
    });

    return jsonError(error);
  }
}
