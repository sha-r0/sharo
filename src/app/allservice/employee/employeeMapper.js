import { serverTimestamp } from "firebase/firestore";

import { EMPLOYEE_STATUS } from "./employee.constants";

/* ==========================================================
   Helpers
========================================================== */

function text(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return text(value).toLowerCase();
}

function normalizeRole(value) {
  return lower(value || "employee").replace(
    /[^a-z0-9]+/g,
    "_"
  );
}

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
  const firstName =
    text(form?.firstName);

  const lastName =
    text(form?.lastName);

  const fullName =
    `${firstName} ${lastName}`.trim();

  const roleId =
    normalizeRole(
      form?.role
    );

  const existingAccess =
    form?.access || {};

  const existingLogin =
    form?.login || {};

  const accountStatus =
    text(
      form?.accountStatus ||
        existingAccess?.status ||
        EMPLOYEE_STATUS.ACTIVE
    ).toLowerCase();

  const reporting =
    form?.reporting || {};

  const salaryStructure =
    form?.salaryStructure || {};

  const statutoryDetails =
    form?.statutoryDetails || {};

  const bankDetails =
    form?.bankDetails || {};

  const address =
    form?.address || {};

  const documents =
    form?.documents || {};

  const governmentId =
    documents?.governmentId || {};

  /* ========================================================
     Result
  ======================================================== */

  return {
    /* ==========================================
       IDs
    ========================================== */

    employeeId:
      text(employeeId),

    companyId:
      text(companyId),

    firestoreId:
      text(firestoreId),

    /* ==========================================
       Personal Information
    ========================================== */

    personalInfo: {
      firstName,

      lastName,

      fullName,

      email:
        lower(form?.email),

      phone:
        text(form?.phone),

      gender:
        text(form?.gender),

      dob:
        form?.dob || "",
    },

    /* ==========================================
       Employment
    ========================================== */

    employment: {
      department:
        text(
          form?.department
        ),

      designation:
        text(
          form?.designation
        ),

      role:
        roleId,

      employeeType:
        text(
          form?.employeeType
        ),

      joiningDate:
        form?.joiningDate ||
        "",

      shift:
        text(
          form?.shift
        ),

      /*
       * Do NOT force every edit back to Active.
       */
      status:
        accountStatus ||
        EMPLOYEE_STATUS.ACTIVE,
    },

    /* ==========================================
       Reporting
    ========================================== */

    reporting: {
      ...reporting,

      teamId:
        reporting?.teamId ||
        form?.teamId ||
        null,

      teamLeadId:
        reporting?.teamLeadId ||
        form?.teamLeadId ||
        null,

      reportsTo:
        reporting?.reportsTo ||
        form?.reportsTo ||
        null,
    },

    /* ==========================================
       Salary
    ========================================== */

    salaryStructure: {
      ...salaryStructure,
    },

    ...(Object.keys(
      statutoryDetails
    ).length
      ? {
          statutoryDetails: {
            ...statutoryDetails,
          },
        }
      : {}),

    /* ==========================================
       Bank
    ========================================== */

    bankDetails: {
      ...bankDetails,

      bankName:
        text(
          bankDetails?.bankName
        ),

      accountNumber:
        text(
          bankDetails?.accountNumber
        ),

      ifsc:
        text(
          bankDetails?.ifsc
        ).toUpperCase(),

      branch:
        text(
          bankDetails?.branch
        ),

      accountHolderName:
        text(
          bankDetails?.accountHolderName
        ),

      upi:
        text(
          bankDetails?.upi
        ),
    },

    /* ==========================================
       Address
    ========================================== */

    address: {
      ...address,

      addressLine:
        text(
          address?.addressLine
        ),

      city:
        text(
          address?.city
        ),

      state:
        text(
          address?.state
        ),

      country:
        text(
          address?.country ||
            "India"
        ),

      pincode:
        text(
          address?.pincode
        ),
    },

    /* ==========================================
       Documents
    ========================================== */

    documents: {
      photoUrl:
        photoUrl || "",

      resumeUrl:
        resumeUrl || "",

      governmentId: {
        type:
          text(
            governmentId?.type ||
              "Aadhaar Card"
          ),

        number:
          text(
            governmentId?.number
          ),

        fileUrl:
          governmentIdUrl ||
          "",
      },
    },

    /* ==========================================
       Login

       Preserve existing login metadata during
       normal employee edits.
    ========================================== */

    login: {
      ...existingLogin,

      employeeId:
        text(employeeId),

      temporaryPasswordSet:
        form?.password
          ? true
          : existingLogin
              ?.temporaryPasswordSet ??
            false,

      lastLogin:
        existingLogin
          ?.lastLogin ??
        null,
    },

    /* ==========================================
       Access
    ========================================== */

    access: {
      ...existingAccess,

      authUid:
        form?.authUid ||
        existingAccess?.authUid ||
        null,

      loginEnabled:
        form?.loginEnabled !==
        false,

      roleId,

      status:
        accountStatus ||
        "active",

      requirePasswordChange:
        form
          ?.requirePasswordChange !==
        false,

      /*
       * IMPORTANT:
       * Preserve existing acceptance state.
       */
      policyAccepted:
        existingAccess
          ?.policyAccepted ??
        false,

      permissionOverrides:
        form
          ?.permissionOverrides || {
          grant: [],
          deny: [],
        },

      effectivePermissions:
        Array.isArray(
          form
            ?.effectivePermissions
        )
          ? form
              .effectivePermissions
          : [],
    },

    /* ==========================================
       Search Fields
    ========================================== */

    search: {
      fullName:
        fullName.toLowerCase(),

      email:
        lower(
          form?.email
        ),

      phone:
        text(
          form?.phone
        ),

      department:
        lower(
          form?.department
        ),

      designation:
        lower(
          form?.designation
        ),
    },

    /* ==========================================
       Metadata
    ========================================== */

    createdAt:
      form?.createdAt ||
      serverTimestamp(),

    updatedAt:
      serverTimestamp(),
  };
}