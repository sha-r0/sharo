import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import {
  authorizeCompanyRequest,
  requireCompanyPermission,
} from "@/lib/server/authorizeCompanyRequest";

const ALLOWED_STATUSES = [
  "draft",
  "sent",
  "approved",
  "rejected",
];

const jsonError = (error) => {
  const code =
    error?.message ||
    error?.code ||
    "QUOTATION_REQUEST_FAILED";

  const status =
    code === "UNAUTHENTICATED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code === "QUOTATION_NOT_FOUND"
          ? 404
          : 400;

  return NextResponse.json(
    {
      error: code,
    },
    {
      status,
    }
  );
};

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

export async function GET(
  request,
  { params }
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "quotation.view",
      "quotation.manage"
    );

    const { id } =
      await params;

    const quotationId =
      String(id || "").trim();

    if (!quotationId) {
      throw new Error(
        "QUOTATION_ID_REQUIRED"
      );
    }

    const reference =
      adminDb
        .collection("Companies")
        .doc(context.companyId)
        .collection("Quotations")
        .doc(quotationId);

    const snapshot =
      await reference.get();

    if (!snapshot.exists) {
      throw new Error(
        "QUOTATION_NOT_FOUND"
      );
    }

    return NextResponse.json({
      quotation: {
        id:
          snapshot.id,

        ...snapshot.data(),
      },
    });
  } catch (error) {
    console.error(
      "Quotation read failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(error);
  }
}

export async function PUT(
  request,
  { params }
) {
  try {
    const context =
      await authorizeCompanyRequest(
        request
      );

    requireCompanyPermission(
      context,
      "quotation.manage"
    );

    const { id } =
      await params;

    const quotationId =
      String(id || "").trim();

    if (!quotationId) {
      throw new Error(
        "QUOTATION_ID_REQUIRED"
      );
    }

    const input =
      await request.json();

    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input)
    ) {
      throw new Error(
        "QUOTATION_DATA_REQUIRED"
      );
    }

    /*
     * Prevent client-controlled identity fields.
     */
    const {
        id: _ignoredId,
        companyId: _ignoredCompanyId,
        createdAt: _ignoredCreatedAt,
        createdBy: _ignoredCreatedBy,
      
        // Quotation number is generated when created.
        // Do not allow normal edits to change it.
        quotationNumber: _ignoredQuotationNumber,
      
        // Sorting fields are server-managed.
        quotationSortCurrent: _ignoredSortCurrent,
        quotationSortYear: _ignoredSortYear,
        quotationSortSequence: _ignoredSortSequence,
        quotationSortValue: _ignoredSortValue,
      
        ...safeInput
      } = input;

    if (
      Object.prototype.hasOwnProperty.call(
        safeInput,
        "status"
      )
    ) {
      const requestedStatus =
        normalizeStatus(
          safeInput.status
        );

      if (
        !ALLOWED_STATUSES.includes(
          requestedStatus
        )
      ) {
        throw new Error(
          "INVALID_QUOTATION_STATUS"
        );
      }

      /*
       * Preserve the existing display format used
       * throughout the quotation module.
       */
      safeInput.status =
        requestedStatus === "draft"
          ? "Draft"
          : requestedStatus === "sent"
            ? "Sent"
            : requestedStatus === "approved"
              ? "Approved"
              : "Rejected";
    }

    const reference =
      adminDb
        .collection("Companies")
        .doc(context.companyId)
        .collection("Quotations")
        .doc(quotationId);

    let updatedQuotation =
      null;

    let statusTransition = {
      previousStatus: "",
      nextStatus: "",
      decisionChanged: false,
    };

    await adminDb.runTransaction(
      async (transaction) => {
        /*
         * Single authoritative quotation read.
         */
        const snapshot =
          await transaction.get(
            reference
          );

        if (!snapshot.exists) {
          throw new Error(
            "QUOTATION_NOT_FOUND"
          );
        }

        const current = {
          id:
            snapshot.id,

          ...snapshot.data(),
        };

        const previousStatus =
          normalizeStatus(
            current.status
          );

        const nextStatus =
          normalizeStatus(
            safeInput.status ??
              current.status
          );

        const decisionChanged =
          [
            "approved",
            "rejected",
          ].includes(
            nextStatus
          ) &&
          nextStatus !==
            previousStatus;

        statusTransition = {
          previousStatus,
          nextStatus,
          decisionChanged,
        };

        const payload = {
            ...safeInput,
          
            id: current.id,
          
            companyId:
              context.companyId,
          
            /*
             * Quotation number and sorting metadata
             * remain authoritative from the stored record.
             */
            quotationNumber:
              current.quotationNumber,
          
            quotationSortCurrent:
              current.quotationSortCurrent ?? null,
          
            quotationSortYear:
              current.quotationSortYear ?? null,
          
            quotationSortSequence:
              current.quotationSortSequence ?? null,
          
            quotationSortValue:
              current.quotationSortValue ?? null,
          
            updatedAt:
              FieldValue.serverTimestamp(),
          };

        transaction.set(
          reference,
          payload,
          {
            merge: true,
          }
        );

        /*
         * Return the updated quotation using
         * data already available in the transaction.
         *
         * Do not perform another Firestore read.
         */
        updatedQuotation = {
            ...current,
            ...safeInput,
          
            quotationNumber:
              current.quotationNumber,

          id:
            current.id,

          companyId:
            context.companyId,

          /*
           * Do not expose a Firestore
           * serverTimestamp sentinel in JSON.
           */
          updatedAt:
            current.updatedAt ||
            null,
        };
      }
    );

    return NextResponse.json({
      success: true,

      quotation:
        updatedQuotation,

      statusTransition,
    });
  } catch (error) {
    console.error(
      "Quotation update failed",
      {
        code:
          error?.message ||
          error?.code ||
          "unknown",
      }
    );

    return jsonError(error);
  }
}