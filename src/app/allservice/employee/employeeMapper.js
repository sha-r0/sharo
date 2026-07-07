import { serverTimestamp } from "firebase/firestore";

import { EMPLOYEE_STATUS } from "./employee.constants";

/* ==========================================================
   Map Employee
========================================================== */

export function mapEmployee({

  companyId,

  firestoreId,

  employeeId,

  form,

  photoUrl = "",

  resumeUrl = "",

  governmentIdUrl = "",

}) {

  return {

    /* ==========================================
       IDs
    ========================================== */

    employeeId,

    companyId,

    firestoreId,

    /* ==========================================
       Personal Information
    ========================================== */

    personalInfo: {

      firstName: form.firstName.trim(),

      lastName: form.lastName.trim(),

      fullName:

        `${form.firstName} ${form.lastName}`.trim(),

      email: form.email.trim().toLowerCase(),

      phone: form.phone.trim(),

      gender: form.gender,

      dob: form.dob,

    },

    /* ==========================================
       Employment
    ========================================== */

    employment: {

      department: form.department,

      designation: form.designation,

      role: form.role,

      employeeType: form.employeeType,

      joiningDate: form.joiningDate,

      shift: form.shift,

      status: EMPLOYEE_STATUS.ACTIVE,

    },

    /* ==========================================
       Salary
    ========================================== */

    salaryStructure: {

      ...form.salaryStructure,

    },

    /* ==========================================
       Bank
    ========================================== */

    bankDetails: {

      ...form.bankDetails,

    },

    /* ==========================================
       Address
    ========================================== */

    address: {

      ...form.address,

    },

    /* ==========================================
       Documents
    ========================================== */

    documents: {

      photoUrl,

      resumeUrl,

      governmentId: {

        type:
          form.documents.governmentId.type,

        number:
          form.documents.governmentId.number,

        fileUrl:
          governmentIdUrl,

      },

    },

    /* ==========================================
       Login
    ========================================== */

    login: {

      employeeId,

      password: form.password,

      lastLogin:

        form.login?.lastLogin ||

        null,

    },

    /* ==========================================
       Search
    ========================================== */

    search: {

      fullName:

        `${form.firstName} ${form.lastName}`

          .trim()

          .toLowerCase(),

      email:

        form.email

          .trim()

          .toLowerCase(),

      phone:

        form.phone.trim(),

      department:

        form.department

          .toLowerCase(),

      designation:

        form.designation

          .toLowerCase(),

    },

    /* ==========================================
       Metadata
    ========================================== */

    createdAt:

      form.createdAt ||

      serverTimestamp(),

    updatedAt:

      serverTimestamp(),

  };

}