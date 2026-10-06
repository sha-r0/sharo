"use strict";

const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { createAdvanceRequest, decideAdvance, deleteAdvanceRequest, getAdvanceReferenceData } = require("./AdvanceService");

const { AdvanceRequestError } = require("./CreateAdvanceRequest");

const OPTIONS = { region: "asia-south1", cors: true, enforceAppCheck: false };

function callableError(error) {
  const code = error?.message || "INTERNAL";
  if (code === "UNAUTHENTICATED") return new HttpsError("unauthenticated", "Authentication required.");
  if (["FORBIDDEN", "COMPANY_MISMATCH", "SELF_APPROVAL_FORBIDDEN"].includes(code)) return new HttpsError("permission-denied", "You are not allowed to perform this action.");
  if (code === "ADVANCE_NOT_FOUND" || code === "EMPLOYEE_NOT_FOUND") return new HttpsError("not-found", "The requested record was not found.");
  if (code === "ADVANCE_ALREADY_DECIDED") return new HttpsError("failed-precondition", "This advance has already been decided.");
  if (code === "ADVANCE_NOT_DELETABLE") return new HttpsError("failed-precondition", "Only pending advances without payout activity can be deleted.");
  if (code.startsWith("INVALID_") || code === "EMPLOYEE_REQUIRED") return new HttpsError("invalid-argument", "The advance request is invalid.");
  console.error("Advance function failed", error);
  return new HttpsError("internal", "Unable to process the advance request.");
}

function createAdvanceFunctions(db) {
  return {
    createAdvanceRequest: onCall(OPTIONS, async (request) => {
      try {
        return await createAdvanceRequest(db, request);
      } catch (error) {
        if (error instanceof AdvanceRequestError) throw new HttpsError(error.code, error.message);
        throw callableError(error);
      }
    }),
    getAdvanceReferenceData: onCall(OPTIONS, async (request) => {
      try {
        return await getAdvanceReferenceData(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
    decideAdvance: onCall(OPTIONS, async (request) => {
      try {
        return await decideAdvance(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
    deleteAdvanceRequest: onCall(OPTIONS, async (request) => {
      try {
        return await deleteAdvanceRequest(db, request);
      } catch (error) {
        throw callableError(error);
      }
    }),
  };
}

module.exports = { callableError, createAdvanceFunctions };
