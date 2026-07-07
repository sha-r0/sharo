import {
  query,
  where,
  limit,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import BaseService from "../base/baseService";

import { employeeCollection, employeeDoc } from "@/lib/firestore-firebase";

class EmployeeRepository extends BaseService {

  /* ==========================================
      Get All
  ========================================== */

  async getAll(companyId) {

    return this.getCollection(
      employeeCollection(companyId)
    );

  }

  /* ==========================================
      Get One
  ========================================== */

  async get(companyId, firestoreId) {

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

    return {

      success: true,

      id: firestoreId,

    };

  }

  /* ==========================================
      Update
  ========================================== */

  /* ==========================================
      Update Employee
  ========================================== */

  async update(

    companyId,

    firestoreId,

    data

  ) {

    return await super.update(

      employeeDoc(

        companyId,

        firestoreId

      ),

      data

    );

  }

  /* ==========================================
      Delete
  ========================================== */

  async delete(

    companyId,

    firestoreId

  ) {

    return super.delete(

      employeeDoc(
        companyId,
        firestoreId
      )

    );

  }

  /* ==========================================
      Email Exists
  ========================================== */

  async emailExists(

    companyId,

    email

  ) {

    const snapshot = await getDocs(

      query(

        employeeCollection(companyId),

        where(
          "personalInfo.email",
          "==",
          email.toLowerCase()
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

    const snapshot = await getDocs(

      query(

        employeeCollection(companyId),

        where(
          "personalInfo.phone",
          "==",
          phone
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

    const snapshot = await getDocs(

      query(

        employeeCollection(companyId),

        where(
          "employeeId",
          "==",
          employeeId
        ),

        limit(1)

      )

    );

    return !snapshot.empty;

  }

  /* ==========================================
    Get Employee
========================================== */

  async get(companyId, firestoreId) {

    return await this.getDocument(

      employeeDoc(
        companyId,
        firestoreId
      )

    );

  }

  /* ==========================================
      Deactivate Employee
  ========================================== */

  async deactivate(
    companyId,
    firestoreId
  ) {

    return await super.update(

      employeeDoc(
        companyId,
        firestoreId
      ),

      {

        "employment.status": "Inactive",

        // isActive: false,

        deactivatedAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

      }

    );

  }

}

export default new EmployeeRepository();