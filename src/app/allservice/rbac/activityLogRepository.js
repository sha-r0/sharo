import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

class ActivityLogRepository {
  /* ==========================================
      Helpers
  ========================================== */

  collectionRef(companyId) {
    return collection(
      db,
      "Companies",
      companyId,
      "ActivityLogs"
    );
  }

  toMillis(value) {
    if (!value) return 0;

    if (
      typeof value?.toMillis ===
      "function"
    ) {
      return value.toMillis();
    }

    if (
      typeof value?.toDate ===
      "function"
    ) {
      return value
        .toDate()
        .getTime();
    }

    const parsed =
      new Date(value).getTime();

    return Number.isNaN(parsed)
      ? 0
      : parsed;
  }

  mapSnapshot(snapshot) {
    return snapshot.docs.map(
      (item) => ({
        id: item.id,
        ...item.data(),
      })
    );
  }

  /* ==========================================
      Record Activity
  ========================================== */

  async record(
    companyId,
    event
  ) {
    if (!companyId) {
      throw new Error(
        "Company ID is required."
      );
    }

    return addDoc(
      this.collectionRef(
        companyId
      ),
      {
        ...event,

        companyId,

        createdAt:
          serverTimestamp(),
      }
    );
  }

  /* ==========================================
      Recent Company Activity
  ========================================== */

  async recent(
    companyId,
    count = 50
  ) {
    if (!companyId) {
      return [];
    }

    const safeCount =
      Math.max(
        1,
        Math.min(
          Number(count) || 50,
          100
        )
      );

    const snapshot =
      await getDocs(
        query(
          this.collectionRef(
            companyId
          ),

          orderBy(
            "createdAt",
            "desc"
          ),

          limit(
            safeCount
          )
        )
      );

    return this.mapSnapshot(
      snapshot
    );
  }

  /* ==========================================
      Employee Security Activity

      Reads only activity related to
      one employee / auth account.

      Two capped queries are used because
      some existing records reference the
      employee by targetEmployeeId while
      others use targetUserId.
  ========================================== */

  async forEmployee(
    companyId,
    {
      employeeFirestoreId,
      authUid,
      count = 5,
    } = {}
  ) {
    if (!companyId) {
      return [];
    }

    const safeCount =
      Math.max(
        1,
        Math.min(
          Number(count) || 5,
          20
        )
      );

    const requests = [];

    /* ==============================
        Match employee document ID
    ============================== */

    if (
      employeeFirestoreId
    ) {
      requests.push(
        getDocs(
          query(
            this.collectionRef(
              companyId
            ),

            where(
              "targetEmployeeId",
              "==",
              employeeFirestoreId
            ),

            orderBy(
              "createdAt",
              "desc"
            ),

            limit(
              safeCount
            )
          )
        )
      );
    }

    /* ==============================
        Match Firebase Auth UID
    ============================== */

    if (authUid) {
      requests.push(
        getDocs(
          query(
            this.collectionRef(
              companyId
            ),

            where(
              "targetUserId",
              "==",
              authUid
            ),

            orderBy(
              "createdAt",
              "desc"
            ),

            limit(
              safeCount
            )
          )
        )
      );
    }

    if (!requests.length) {
      return [];
    }

    const snapshots =
      await Promise.all(
        requests
      );

    const unique =
      new Map();

    for (const snapshot of snapshots) {
      for (const item of this.mapSnapshot(
        snapshot
      )) {
        unique.set(
          item.id,
          item
        );
      }
    }

    return Array.from(
      unique.values()
    )
      .sort(
        (a, b) =>
          this.toMillis(
            b.createdAt
          ) -
          this.toMillis(
            a.createdAt
          )
      )
      .slice(
        0,
        safeCount
      );
  }
}

export default new ActivityLogRepository();