import {
  query,
  where,
  limit,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import BaseService from "../base/baseService";

import {
  employeeCollection,
  employeeDoc,
} from "@/lib/firestore-firebase";

class EmployeeRepository extends BaseService {
  constructor() {
    super();

    // Cache full employee directory per company.
    // Individual employee documents are still cached by BaseService.
    this.collectionCache = new Map();

    // 5 minutes is a good balance between freshness and read reduction.
    this.collectionCacheTtl =
      5 * 60 * 1000;
  }

  /* ==========================================
      Collection Cache Helpers
  ========================================== */

  getCollectionCacheKey(companyId) {
    return `employees:${companyId}`;
  }

  invalidateEmployeeList(companyId) {
    if (!companyId) return;

    this.collectionCache.delete(
      this.getCollectionCacheKey(companyId)
    );
  }

  invalidateCompany(companyId) {
    this.invalidateEmployeeList(companyId);
  }

  clearEmployeeCollectionCache() {
    this.collectionCache.clear();
  }

  /* ==========================================
      Get All
  ========================================== */

  async getAll(
    companyId,
    { force = false } = {}
  ) {
    if (!companyId) {
      return [];
    }

    const cacheKey =
      this.getCollectionCacheKey(companyId);

    const cached =
      this.collectionCache.get(cacheKey);

    if (
      !force &&
      cached &&
      Date.now() - cached.savedAt <
        this.collectionCacheTtl
    ) {
      return cached.data;
    }

    const employees =
      await this.getCollection(
        employeeCollection(companyId)
      );

    this.collectionCache.set(
      cacheKey,
      {
        data: employees,
        savedAt: Date.now(),
      }
    );

    return employees;
  }

  /* ==========================================
      Get One
  ========================================== */

  async get(
    companyId,
    firestoreId
  ) {
    if (!companyId || !firestoreId) {
      return null;
    }

    return this.getDocument(
      employeeDoc(
        companyId,
        firestoreId
      )
    );
  }

  /* ==========================================
      Create
  ========================================== */

  async create(
    companyId,
    firestoreId,
    data
  ) {
    await setDoc(
      employeeDoc(
        companyId,
        firestoreId
      ),
      data
    );

    // Newly created employee must appear
    // on the next directory load.
    this.invalidateEmployeeList(
      companyId
    );

    // Remove any stale document cache.
    this.removeCache(
      employeeDoc(
        companyId,
        firestoreId
      ).path
    );

    return {
      success: true,
      id: firestoreId,
    };
  }

  /* ==========================================
      Update
  ========================================== */

  async update(
    companyId,
    firestoreId,
    data
  ) {
    await super.update(
      employeeDoc(
        companyId,
        firestoreId
      ),
      data
    );

    this.invalidateEmployeeList(
      companyId
    );

    return {
      success: true,
    };
  }

  /* ==========================================
      Delete
  ========================================== */

  async delete(
    companyId,
    firestoreId
  ) {
    await super.delete(
      employeeDoc(
        companyId,
        firestoreId
      )
    );

    this.invalidateEmployeeList(
      companyId
    );

    return {
      success: true,
    };
  }

  /* ==========================================
      Email Exists
  ========================================== */

  async emailExists(
    companyId,
    email
  ) {
    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

    if (!companyId || !normalizedEmail) {
      return false;
    }

    const snapshot =
      await getDocs(
        query(
          employeeCollection(
            companyId
          ),
          where(
            "personalInfo.email",
            "==",
            normalizedEmail
          ),
          limit(1)
        )
      );

    return !snapshot.empty;
  }

  /* ==========================================
      Phone Exists
  ========================================== */

  async phoneExists(
    companyId,
    phone
  ) {
    const normalizedPhone =
      String(phone || "").trim();

    if (!companyId || !normalizedPhone) {
      return false;
    }

    const snapshot =
      await getDocs(
        query(
          employeeCollection(
            companyId
          ),
          where(
            "personalInfo.phone",
            "==",
            normalizedPhone
          ),
          limit(1)
        )
      );

    return !snapshot.empty;
  }

  /* ==========================================
      Employee ID Exists
  ========================================== */

  async employeeIdExists(
    companyId,
    employeeId
  ) {
    const normalizedEmployeeId =
      String(employeeId || "").trim();

    if (
      !companyId ||
      !normalizedEmployeeId
    ) {
      return false;
    }

    const snapshot =
      await getDocs(
        query(
          employeeCollection(
            companyId
          ),
          where(
            "employeeId",
            "==",
            normalizedEmployeeId
          ),
          limit(1)
        )
      );

    return !snapshot.empty;
  }

  /* ==========================================
      Deactivate Employee
  ========================================== */

  async deactivate(
    companyId,
    firestoreId
  ) {
    await super.update(
      employeeDoc(
        companyId,
        firestoreId
      ),
      {
        "employment.status":
          "Inactive",

        deactivatedAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    );

    this.invalidateEmployeeList(
      companyId
    );

    return {
      success: true,
    };
  }

  /* ==========================================
      Force Refresh Employee Directory
  ========================================== */

  async refreshAll(companyId) {
    this.invalidateEmployeeList(
      companyId
    );

    return this.getAll(
      companyId,
      {
        force: true,
      }
    );
  }
}

export default new EmployeeRepository();