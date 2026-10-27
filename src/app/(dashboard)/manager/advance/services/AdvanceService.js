import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  httpsCallable,
} from "firebase/functions";

import {
  db,
  functions,
} from "@/lib/firebase";


// ==========================================
// Payload Builder
// ==========================================

export function buildAdvanceRequestPayload(
  values
) {
  const common = {
    advanceType:
      values.advanceType,

    amount:
      Number(
        values.amount
      ),

    ...(
      values.employeeFirestoreId
        ? {
            employeeFirestoreId:
              values.employeeFirestoreId,
          }
        : {}
    ),
  };


  if (
    values.advanceType ===
    "Company"
  ) {
    return {
      ...common,

      projectId:
        values.projectId,

      workPurpose:
        values.workPurpose ??
        values.purpose,

      requiredDate:
        values.requiredDate
          instanceof Date
          ? values.requiredDate.toISOString()
          : values.requiredDate ||
            null,

      description:
        values.description ||
        "",

      priority:
        values.priority ===
        "High"
          ? "Urgent"
          : values.priority ||
            "Normal",

      attachmentUrl:
        values.attachmentUrl ||
        "",
    };
  }


  return {
    ...common,

    reason:
      values.reason ||
      "",

    repaymentMethod:
      values.repaymentMethod ||
      "Salary Deduction",

    monthlyDeduction:
      Number(
        values.monthlyDeduction ||
        0
      ),

    months:
      Number(
        values.months ||
        0
      ),

    emergencyContact:
      values.emergencyContact ||
      "",
  };
}


// ==========================================
// Collection Reference
// ==========================================

const ref = (
  companyId
) =>
  collection(
    db,
    "Companies",
    companyId,
    "advance_requests"
  );


// ==========================================
// Advance Service
// ==========================================

export default class AdvanceService {

  static subscribe(
    companyId,
    onData,
    onError,
    employeeFirestoreId = null
  ) {
    const source =
      employeeFirestoreId
        ? query(
            ref(
              companyId
            ),
            where(
              "employeeFirestoreId",
              "==",
              employeeFirestoreId
            )
          )
        : ref(
            companyId
          );

    return onSnapshot(
      source,

      (
        snapshot
      ) => {
        const records =
          snapshot.docs.map(
            (
              item
            ) => ({
              id:
                item.id,

              ...item.data(),
            })
          );

        records.sort(
          (
            a,
            b
          ) =>
            (
              b.createdAt
                ?.seconds ||
              b.requestedAt
                ?.seconds ||
              0
            ) -
            (
              a.createdAt
                ?.seconds ||
              a.requestedAt
                ?.seconds ||
              0
            )
        );

        onData(
          records
        );
      },

      onError
    );
  }


  // ========================================
  // Reference Data
  // ========================================

  static async getReferenceData() {
    const getReferences =
      httpsCallable(
        functions,
        "getAdvanceReferenceData"
      );

    const result =
      await getReferences(
        {}
      );

    return result.data;
  }


  // ========================================
  // Create / Update Advance
  // ========================================

  static async save(
    companyId,
    values,
    existingId
  ) {

    /*
     * companyId remains part of the method
     * signature because existing callers may
     * still pass it.
     *
     * The backend determines the real company
     * from the authenticated user.
     */
    void companyId;


    // --------------------------------------
    // EDIT EXISTING ADVANCE
    // --------------------------------------

    if (
      existingId
    ) {
      const updateRequest =
        httpsCallable(
          functions,
          "updateAdvanceRequest"
        );

      const requestValues = {
        advanceId:
          existingId,

        ...buildAdvanceRequestPayload(
          values
        ),
      };

      const result =
        await updateRequest(
          requestValues
        );

      return (
        result.data
          ?.advanceId ||
        existingId
      );
    }


    // --------------------------------------
    // CREATE NEW ADVANCE
    // --------------------------------------

    const createRequest =
      httpsCallable(
        functions,
        "createAdvanceRequest"
      );

    const requestValues = {
      ...buildAdvanceRequestPayload(
        values
      ),

      idempotencyKey:
        values.idempotencyKey,
    };

    const result =
      await createRequest(
        requestValues
      );

    return (
      result.data
        ?.advanceId ||
      result.data
        ?.data
        ?.requestId
    );
  }


  // ========================================
  // Approve / Reject
  // ========================================

  static async decide(
    advanceId,
    action
  ) {
    const decide =
      httpsCallable(
        functions,
        "decideAdvance"
      );

    const result =
      await decide({
        advanceId,
        action,
      });

    return result.data;
  }


  // ========================================
  // Initiate Payout
  // ========================================

  static async initiatePayout(
    advanceId
  ) {
    const initiate =
      httpsCallable(
        functions,
        "initiateAdvancePayout"
      );

    const result =
      await initiate({
        advanceId,
      });

    return result.data;
  }


  // ========================================
  // Retry Queued Payout
  // ========================================

  static async retryQueuedPayout(
    advanceId
  ) {
    const retry =
      httpsCallable(
        functions,
        "retryQueuedAdvancePayout"
      );

    const result =
      await retry({
        advanceId,
      });

    return result.data;
  }


  // ========================================
  // Reconcile Payout
  // ========================================

  static async reconcilePayout(
    advanceId
  ) {
    const reconcile =
      httpsCallable(
        functions,
        "reconcileAdvancePayout"
      );

    const result =
      await reconcile({
        advanceId,
      });

    return result.data;
  }


  // ========================================
  // Settlement
  // ========================================

  static async recordSettlement(
    companyId,
    advance,
    amount
  ) {
    /*
     * IMPORTANT:
     *
     * Do not use direct Firestore updateDoc()
     * here anymore.
     *
     * Settlement must eventually move to its
     * own privileged backend callable.
     *
     * For now explicitly fail instead of
     * silently bypassing RBAC / Firestore rules.
     */

    void companyId;
    void advance;
    void amount;

    throw new Error(
      "Advance settlement must use the secure backend settlement API."
    );
  }


  // ========================================
  // Delete Advance
  // ========================================

  static async delete(
    advanceId
  ) {
    const deleteRequest =
      httpsCallable(
        functions,
        "deleteAdvanceRequest"
      );

    const result =
      await deleteRequest({
        advanceId,
      });

    return result.data;
  }
}