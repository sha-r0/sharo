import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  syncEmployeeClaims,
  ensureEmployeeClaims,
} from "@/lib/server/syncEmployeeClaims.mjs";

import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_LEVELS,
  calculateEffectivePermissions,
  permissionsForRole,
  normalizeRoleId,
} from "@/app/allservice/rbac/permissionCatalog";

import {
  buildEmployeeLoginEmail,
  canonicalEmployeeId,
  resolveEmployeeAuthUid,
  resolveEmployeeRoleId,
  resolvePermissionOverrides,
} from "@/app/allservice/rbac/employeeAuth";

import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";

import { mergeEmployeeStatutory } from "@/app/allservice/employee/employeeStatutory";

/* ==========================================================
   Plan Limits
========================================================== */

const PLAN_LIMITS = {
  starter: 5,
  basic: 5,
  professional: 25,
  pro: 25,
  enterprise: Infinity,
};

/* ==========================================================
   Helpers
========================================================== */

const validPermissions = (
  values
) => [
  ...new Set(
    (
      Array.isArray(values)
        ? values
        : []
    ).filter((value) =>
      ALL_PERMISSIONS.includes(
        value
      )
    )
  ),
];

/* ==========================================================
   Load Role
========================================================== */

async function loadRole(
  companyId,
  roleId
) {
  const normalized =
    normalizeRoleId(roleId);

  const snap =
    await adminDb
      .collection("Companies")
      .doc(companyId)
      .collection("Roles")
      .doc(normalized)
      .get();

  const data =
    snap.exists
      ? snap.data()
      : null;

  const permissions =
    data?.permissions ||
    permissionsForRole(
      normalized
    );

  if (
    !data &&
    !permissions.length
  ) {
    throw new Error(
      "ROLE_NOT_FOUND"
    );
  }

  return {
    id: normalized,

    ...(data || {}),

    level:
      Number(
        data?.level ??
          DEFAULT_ROLE_LEVELS[
            normalized
          ] ??
          10
      ),

    permissions:
      validPermissions(
        permissions
      ),
  };
}

/* ==========================================================
   Authorization
========================================================== */

async function authorize(
  request
) {
  const authorized =
    await authorizeCompanyRequest(
      request
    );

  const {
    token,
    companyId,
  } = authorized;

  const company = {
    id: companyId,

    ...authorized.company,
  };

  const owner =
    authorized.isOwner;

  const caller =
    owner
      ? {
          id:
            token.uid,

          uid:
            token.uid,

          companyId,

          role:
            "owner",
        }
      : {
          ...authorized.employee,

          uid:
            token.uid,

          companyId,
        };

  let callerEmployee =
    null;

  let callerPermissions =
    owner
      ? ALL_PERMISSIONS
      : [];

  let callerRole =
    owner
      ? {
          id:
            "owner",

          level:
            100,
        }
      : null;

  if (!owner) {
    callerEmployee =
      authorized.employee;

    callerRole =
      await loadRole(
        companyId,
        resolveEmployeeRoleId(
          callerEmployee,
          caller
        )
      );

    callerPermissions =
      authorized.permissions;
  }

  if (
    String(
      company.serviceStatus ||
        "active"
    ).toLowerCase() !==
    "active"
  ) {
    throw new Error(
      "COMPANY_INACTIVE"
    );
  }

  return {
    token,

    caller,

    company,

    companyId,

    owner,

    callerEmployee,

    callerPermissions,

    callerRole,
  };
}

/* ==========================================================
   Require Permission
========================================================== */

function requirePermission(
  context,
  permission
) {
  if (
    !context.owner &&
    !context.callerPermissions.includes(
      permission
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }
}

/* ==========================================================
   Validate Target
========================================================== */

function validateTarget(
  context,
  target,
  targetRole
) {
  if (
    targetRole.id ===
    "owner"
  ) {
    throw new Error(
      "OWNER_PROTECTED"
    );
  }

  if (
    !context.owner &&
    targetRole.level >=
      context.callerRole.level
  ) {
    throw new Error(
      "ROLE_HIERARCHY_VIOLATION"
    );
  }

  if (
    context.callerRole.id ===
    "team_leader"
  ) {
    const actorTeam =
      context
        .callerEmployee
        ?.reporting
        ?.teamId ||
      context
        .callerEmployee
        ?.employment
        ?.teamId;

    const targetTeam =
      target?.reporting
        ?.teamId ||
      target?.employment
        ?.teamId;

    if (
      !actorTeam ||
      actorTeam !==
        targetTeam
    ) {
      throw new Error(
        "TEAM_BOUNDARY_VIOLATION"
      );
    }
  }
}

/* ==========================================================
   Error Response
========================================================== */

function responseError(
  error
) {
  const code =
    error?.message ||
    "UNKNOWN_ERROR";

  let status = 400;

  if (
    code ===
    "UNAUTHENTICATED"
  ) {
    status = 401;
  } else if (
    code ===
    "FORBIDDEN"
  ) {
    status = 403;
  } else if (
    [
      "LIMIT_REACHED",
      "EMAIL_EXISTS",
      "PHONE_EXISTS",
      "LOGIN_ACCOUNT_ALREADY_EXISTS",
      "EMPLOYEE_REQUEST_CONFLICT",
    ].includes(code)
  ) {
    status = 409;
  } else if (
    code ===
    "EMPLOYEE_NOT_FOUND"
  ) {
    status = 404;
  }

  return NextResponse.json(
    {
      error: code,
    },
    {
      status,
    }
  );
}

/* ==========================================================
   Required Text
========================================================== */

function requiredText(
  value,
  code
) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    throw new Error(
      code
    );
  }

  return text;
}

/* ==========================================================
   Employee Profile Updates
========================================================== */

function employeeProfileUpdates(
  profile,
  existing,
  isCreate = false
) {
  const firstName =
    requiredText(
      profile
        ?.personalInfo
        ?.firstName,
      "FIRST_NAME_REQUIRED"
    );

  const lastName =
    requiredText(
      profile
        ?.personalInfo
        ?.lastName,
      "LAST_NAME_REQUIRED"
    );

  const email =
    requiredText(
      profile
        ?.personalInfo
        ?.email,
      "EMAIL_REQUIRED"
    ).toLowerCase();

  const phone =
    requiredText(
      profile
        ?.personalInfo
        ?.phone,
      "PHONE_REQUIRED"
    );

  const department =
    requiredText(
      profile
        ?.employment
        ?.department,
      "DEPARTMENT_REQUIRED"
    );

  const designation =
    requiredText(
      profile
        ?.employment
        ?.designation,
      "DESIGNATION_REQUIRED"
    );

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    throw new Error(
      "EMAIL_INVALID"
    );
  }

  if (
    !/^[6-9]\d{9}$/.test(
      phone
    )
  ) {
    throw new Error(
      "PHONE_INVALID"
    );
  }

  /*
   * Employment lifecycle status is not
   * changed through ordinary profile edits.
   *
   * Deactivate/enable/lock actions use PATCH.
   */
  const employment = {
    ...(profile?.employment ||
      {}),

    department,

    designation,

    status:
      existing
        ?.employment
        ?.status ||
      profile
        ?.employment
        ?.status ||
      "Active",
  };

  return {
    personalInfo: {
      ...(profile
        ?.personalInfo ||
        {}),

      firstName,

      lastName,

      fullName:
        `${firstName} ${lastName}`.trim(),

      email,

      phone,
    },

    employment,

    reporting:
      profile?.reporting ||
      {},

    ...mergeEmployeeStatutory(
      profile,
      isCreate
        ? null
        : existing
    ),

    bankDetails:
      profile?.bankDetails ||
      {},

    address:
      profile?.address ||
      {},

    documents:
      profile?.documents ||
      {},

    search: {
      fullName:
        `${firstName} ${lastName}`
          .trim()
          .toLowerCase(),

      email,

      phone,

      department:
        department.toLowerCase(),

      designation:
        designation.toLowerCase(),
    },

    updatedAt:
      FieldValue.serverTimestamp(),
  };
}

/* ==========================================================
   PUT — Update Employee Profile
========================================================== */

export async function PUT(
  request
) {
  try {
    const context =
      await authorize(
        request
      );

    const input =
      await request.json();

    requirePermission(
      context,
      "employee.edit"
    );

    const employeeFirestoreId =
      requiredText(
        input.employeeFirestoreId,
        "EMPLOYEE_ID_REQUIRED"
      );

    const employeeRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "Usermanagement"
        )
        .doc(
          employeeFirestoreId
        );

    /* ======================================
       Read Employee Once
    ====================================== */

    const targetSnapshot =
      await employeeRef.get();

    if (
      !targetSnapshot.exists
    ) {
      throw new Error(
        "EMPLOYEE_NOT_FOUND"
      );
    }

    const existing =
      targetSnapshot.data() ||
      {};

    /* ======================================
       Current Role
    ====================================== */

    const currentRole =
      await loadRole(
        context.companyId,
        resolveEmployeeRoleId(
          existing
        )
      );

    validateTarget(
      context,
      existing,
      currentRole
    );

    /* ======================================
       Build Updates
    ====================================== */

    const updates =
      employeeProfileUpdates(
        input.profile,
        existing
      );

    /* ======================================
       Duplicate Checks

       Only query fields that actually changed.
       Email and phone checks run in parallel.
    ====================================== */

    const oldEmail =
      String(
        existing
          ?.personalInfo
          ?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    const newEmail =
      String(
        updates
          ?.personalInfo
          ?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    const oldPhone =
      String(
        existing
          ?.personalInfo
          ?.phone ||
          ""
      ).trim();

    const newPhone =
      String(
        updates
          ?.personalInfo
          ?.phone ||
          ""
      ).trim();

    const emailChanged =
      oldEmail !==
      newEmail;

    const phoneChanged =
      oldPhone !==
      newPhone;

    const [
      duplicateEmail,
      duplicatePhone,
    ] = await Promise.all([
      emailChanged
        ? employeeRef.parent
            .where(
              "personalInfo.email",
              "==",
              newEmail
            )
            .limit(2)
            .get()
        : Promise.resolve(
            null
          ),

      phoneChanged
        ? employeeRef.parent
            .where(
              "personalInfo.phone",
              "==",
              newPhone
            )
            .limit(2)
            .get()
        : Promise.resolve(
            null
          ),
    ]);

    if (
      duplicateEmail?.docs.some(
        (document) =>
          document.id !==
          employeeFirestoreId
      )
    ) {
      throw new Error(
        "EMAIL_EXISTS"
      );
    }

    if (
      duplicatePhone?.docs.some(
        (document) =>
          document.id !==
          employeeFirestoreId
      )
    ) {
      throw new Error(
        "PHONE_EXISTS"
      );
    }

    /* ======================================
       Access Changes
    ====================================== */

    const requestedAccess =
      input.access || {};

    const requestedRoleId =
      normalizeRoleId(
        requestedAccess.roleId ||
          currentRole.id
      );

    const requestedLoginEnabled =
      requestedAccess.loginEnabled !==
      false;

    const currentLoginEnabled =
      existing.access
        ?.loginEnabled !==
      false;

    const requestedOverrides = {
      grant:
        validPermissions(
          requestedAccess
            ?.permissionOverrides
            ?.grant
        ),

      deny:
        validPermissions(
          requestedAccess
            ?.permissionOverrides
            ?.deny
        ),
    };

    const currentOverrides =
      resolvePermissionOverrides(
        existing
      );

    const overridesChanged =
      JSON.stringify(
        requestedOverrides
      ) !==
      JSON.stringify(
        currentOverrides
      );

    const roleChanged =
      requestedRoleId !==
      currentRole.id;

    const loginChanged =
      requestedLoginEnabled !==
      currentLoginEnabled;

    const accessChanged =
      roleChanged ||
      loginChanged ||
      overridesChanged;

    const authUid =
      resolveEmployeeAuthUid(
        existing
      );

    /* ======================================
       Access Processing
    ====================================== */

    if (accessChanged) {
      requirePermission(
        context,
        "employee.manage"
      );

      /*
       * Reuse current role when the role itself
       * did not change.
       */
      const requestedRole =
        roleChanged
          ? await loadRole(
              context.companyId,
              requestedRoleId
            )
          : currentRole;

      validateTarget(
        context,
        existing,
        requestedRole
      );

      if (
        !context.owner &&
        requestedOverrides.grant.some(
          (permission) =>
            !context
              .callerPermissions
              .includes(
                permission
              )
        )
      ) {
        throw new Error(
          "PERMISSION_ESCALATION"
        );
      }

      if (
        context
          .callerRole
          .id ===
          "team_leader" &&
        requestedOverrides.grant.some(
          (permission) =>
            permission.endsWith(
              ".manage"
            )
        )
      ) {
        throw new Error(
          "PERMISSION_ESCALATION"
        );
      }

      const effectivePermissions =
        calculateEffectivePermissions({
          rolePermissions:
            requestedRole.permissions,

          grantedPermissions:
            requestedOverrides.grant,

          deniedPermissions:
            requestedOverrides.deny,
        });

      updates[
        "access.roleId"
      ] = requestedRoleId;

      updates[
        "access.permissionOverrides"
      ] = requestedOverrides;

      updates[
        "access.effectivePermissions"
      ] =
        effectivePermissions;

      updates[
        "access.loginEnabled"
      ] =
        requestedLoginEnabled;

      updates[
        "access.status"
      ] =
        requestedLoginEnabled
          ? "active"
          : "inactive";

      /* ====================================
         Sync Firebase Auth Only If Account
         Already Exists
      ==================================== */

      if (authUid) {
        /*
         * Claims only need syncing if the role
         * or permission-related access changed.
         */
        if (
          roleChanged ||
          overridesChanged
        ) {
          await syncEmployeeClaims(
            adminAuth,
            {
              uid:
                authUser.uid,
          
              companyId:
                context.companyId,
          
              employeeFirestoreId:
                employeeRef.id,
          
              employee: {
                ...employeeData,
          
                access: {
                  ...employeeData.access,
          
                  authUid:
                    authUser.uid,
          
                  roleId,
          
                  effectivePermissions:
                    permissions,
          
                  permissionOverrides,
                },
              },
          
              // Already returned by createUser().
              // Avoid another Firebase Auth lookup.
              authUser,
            }
          );
        }

        /*
         * Only call Firebase Auth update when
         * login-enabled state actually changed.
         */
        if (loginChanged) {
          await adminAuth.updateUser(
            authUid,
            {
              disabled:
                !requestedLoginEnabled,
            }
          );

          if (
            !requestedLoginEnabled
          ) {
            await adminAuth.revokeRefreshTokens(
              authUid
            );
          }
        }
      }
    }

    /* ======================================
       Firestore Update + Audit
       Single Batch / Single Round Trip
    ====================================== */

    const logRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "ActivityLogs"
        )
        .doc();

    const batch =
      adminDb.batch();

    batch.update(
      employeeRef,
      updates
    );

    batch.set(
      logRef,
      {
        type:
          "employee.profile-updated",

        actorId:
          context.token.uid,

        targetUserId:
          authUid || null,

        targetEmployeeId:
          employeeFirestoreId,

        metadata: {
          accessChanged,

          emailChanged,

          phoneChanged,
        },

        createdAt:
          FieldValue.serverTimestamp(),
      }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Employee profile update failed:",
      error
    );

    return responseError(
      error
    );
  }
}

/* ==========================================================
   POST — Create Employee / Login Account
========================================================== */

export async function POST(
  request
) {
  let createdUid = null;

  let createdEmployeeRef =
    null;

  try {
    const context =
      await authorize(
        request
      );

    const input =
      await request.json();

    if (
      !input.employeeFirestoreId
    ) {
      throw new Error(
        "EMPLOYEE_ID_REQUIRED"
      );
    }

    if (
      input.loginEnabled !==
        false &&
      !input.password
    ) {
      throw new Error(
        "PASSWORD_REQUIRED"
      );
    }

    const employeeRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "Usermanagement"
        )
        .doc(
          input.employeeFirestoreId
        );

    let employeeData =
      null;

    let preparedRole =
      null;

    /* ======================================
       Create Employee Profile
    ====================================== */

    if (input.profile) {
      requirePermission(
        context,
        "employee.create"
      );

      requirePermission(
        context,
        "employee.manage"
      );

      /* ====================================
         Idempotency Check
      ==================================== */

      const existingRequest =
        await employeeRef.get();

      if (
        existingRequest.exists
      ) {
        const existingData =
          existingRequest.data() ||
          {};

        if (
          existingData.createdBy !==
          context.token.uid
        ) {
          throw new Error(
            "EMPLOYEE_REQUEST_CONFLICT"
          );
        }

        const existingUid =
          resolveEmployeeAuthUid(
            existingData
          );

        if (
          existingData.access
            ?.loginEnabled ===
            true &&
          existingData.access
            ?.status ===
            "active" &&
          existingUid
        ) {
          await ensureEmployeeClaims(
            adminAuth,
            {
              uid:
                existingUid,

              companyId:
                context.companyId,

              employeeFirestoreId:
                employeeRef.id,

              employee:
                existingData,
            }
          );
        } else if (
          input.loginEnabled !==
          false
        ) {
          throw new Error(
            "EMPLOYEE_PROVISIONING_INCOMPLETE"
          );
        }

        return NextResponse.json({
          success: true,

          employeeId:
            existingData.employeeId,

          employeeFirestoreId:
            employeeRef.id,

          idempotent: true,
        });
      }

      /* ====================================
         Role + Employee Collection

         These are independent and therefore
         run in parallel.
      ==================================== */

      const roleId =
        normalizeRoleId(
          input.access
            ?.roleId ||
            input.profile
              ?.employment
              ?.role ||
            "employee"
        );

      const [
        employeesSnapshot,
        role,
      ] = await Promise.all([
        employeeRef.parent.get(),

        loadRole(
          context.companyId,
          roleId
        ),
      ]);

      preparedRole =
        role;

      validateTarget(
        context,
        input.profile,
        role
      );

      /* ====================================
         Subscription Limit
      ==================================== */

      const activeEmployeeCount =
        employeesSnapshot.docs.filter(
          (document) =>
            String(
              document.data()
                .employment
                ?.status ||
                "active"
            ).toLowerCase() !==
            "inactive"
        ).length;

      const planName =
        String(
          context.company.plan ||
            ""
        ).toLowerCase();

      const planLimit =
        PLAN_LIMITS[
          planName
        ] ??
        (
          Number(
            context.company
              .employeeCount ||
              0
          ) ||
          Infinity
        );

      const configuredLimit =
        Number(
          context.company
            .employeeLimit ||
            context.company
              .employeeCount ||
            planLimit
        );

      const employeeLimit =
        planName ===
        "enterprise"
          ? Infinity
          : Math.min(
              configuredLimit ||
                planLimit,

              planLimit ||
                configuredLimit
            );

      if (
        activeEmployeeCount >=
        employeeLimit
      ) {
        throw new Error(
          "LIMIT_REACHED"
        );
      }

      /* ====================================
         Duplicate Email / Phone
         Reuse the same snapshot.
      ==================================== */

      const profileEmail =
        String(
          input.profile
            ?.personalInfo
            ?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const profilePhone =
        String(
          input.profile
            ?.personalInfo
            ?.phone ||
            ""
        ).trim();

      if (
        employeesSnapshot.docs.some(
          (document) =>
            String(
              document.data()
                .personalInfo
                ?.email ||
                ""
            )
              .trim()
              .toLowerCase() ===
            profileEmail
        )
      ) {
        throw new Error(
          "EMAIL_EXISTS"
        );
      }

      if (
        employeesSnapshot.docs.some(
          (document) =>
            String(
              document.data()
                .personalInfo
                ?.phone ||
                ""
            ).trim() ===
            profilePhone
        )
      ) {
        throw new Error(
          "PHONE_EXISTS"
        );
      }

      /* ====================================
         Used Employee IDs
      ==================================== */

      const usedEmployeeIds =
        new Set(
          employeesSnapshot.docs
            .map(
              (document) => {
                const raw =
                  String(
                    document.data()
                      .employeeId ||
                      document.data()
                        .login
                        ?.employeeId ||
                      ""
                  ).trim();

                return canonicalEmployeeId(
                  raw
                );
              }
            )
            .filter(Boolean)
        );

      /* ====================================
         Permission Overrides
      ==================================== */

      const requestedOverrides = {
        grant:
          validPermissions(
            input.access
              ?.permissionOverrides
              ?.grant
          ),

        deny:
          validPermissions(
            input.access
              ?.permissionOverrides
              ?.deny
          ),
      };

      if (
        !context.owner &&
        requestedOverrides.grant.some(
          (permission) =>
            !context
              .callerPermissions
              .includes(
                permission
              )
        )
      ) {
        throw new Error(
          "PERMISSION_ESCALATION"
        );
      }

      if (
        context
          .callerRole
          .id ===
          "team_leader" &&
        requestedOverrides.grant.some(
          (permission) =>
            permission.endsWith(
              ".manage"
            )
        )
      ) {
        throw new Error(
          "PERMISSION_ESCALATION"
        );
      }

      const effectivePermissions =
        calculateEffectivePermissions({
          rolePermissions:
            role.permissions,

          grantedPermissions:
            requestedOverrides.grant,

          deniedPermissions:
            requestedOverrides.deny,
        });

      const companyRef =
        adminDb
          .collection(
            "Companies"
          )
          .doc(
            context.companyId
          );

      let createdEmployeeData =
        null;

      /* ====================================
         Allocate Employee Number
      ==================================== */

      await adminDb.runTransaction(
        async (
          transaction
        ) => {
          const companySnapshot =
            await transaction.get(
              companyRef
            );

          if (
            !companySnapshot.exists
          ) {
            throw new Error(
              "COMPANY_NOT_FOUND"
            );
          }

          let nextEmployeeNumber =
            Number(
              companySnapshot.data()
                .nextEmployeeNumber ||
                1
            );

          while (
            usedEmployeeIds.has(
              canonicalEmployeeId(
                String(
                  nextEmployeeNumber
                )
              )
            )
          ) {
            nextEmployeeNumber +=
              1;
          }

          const employeeId =
            String(
              nextEmployeeNumber
            ).padStart(
              8,
              "0"
            );

          const profile =
            employeeProfileUpdates(
              input.profile,
              {},
              true
            );

          createdEmployeeData = {
            ...profile,

            employeeId,

            companyId:
              context.companyId,

            firestoreId:
              input.employeeFirestoreId,

            createdBy:
              context.token.uid,

            employment: {
              ...profile.employment,

              roleId,
            },

            login: {
              employeeId,

              temporaryPasswordSet:
                false,

              lastLogin:
                null,
            },

            access: {
              authUid:
                null,

              loginEnabled:
                false,

              roleId,

              status:
                "active",

              requirePasswordChange:
                input.requirePasswordChange !==
                false,

              policyAccepted:
                false,

              effectivePermissions,

              permissionOverrides:
                requestedOverrides,
            },

            createdAt:
              FieldValue.serverTimestamp(),
          };

          transaction.create(
            employeeRef,
            createdEmployeeData
          );

          transaction.update(
            companyRef,
            {
              nextEmployeeNumber:
                nextEmployeeNumber +
                1,
            }
          );
        }
      );

      createdEmployeeRef =
        employeeRef;

      /*
       * Important performance improvement:
       * do NOT read employeeRef again.
       *
       * We already have the exact data written
       * by the transaction.
       */
      employeeData =
        createdEmployeeData;
    }

    /* ======================================
       Existing Employee Provisioning

       Only read the employee here if this POST
       was called without creating profile data.
    ====================================== */

    if (!employeeData) {
      const employeeDoc =
        await employeeRef.get();

      if (
        !employeeDoc.exists
      ) {
        throw new Error(
          "EMPLOYEE_NOT_FOUND"
        );
      }

      employeeData =
        employeeDoc.data() ||
        {};
    }

    /* ======================================
       No Login Requested
    ====================================== */

    if (
      input.loginEnabled ===
      false
    ) {
      return NextResponse.json({
        success: true,

        employeeId:
          employeeData.employeeId,

        employeeFirestoreId:
          employeeRef.id,
      });
    }

    requirePermission(
      context,
      "employee.create"
    );

    requirePermission(
      context,
      "employee.manage"
    );

    const employeeId =
      String(
        employeeData.employeeId ||
          employeeData.login
            ?.employeeId ||
          ""
      ).trim();

    const corporateId =
      String(
        context.company
          .corporateId ||
          context.company
            .companyCode ||
          ""
      )
        .trim()
        .toLowerCase();

    if (!employeeId) {
      throw new Error(
        "EMPLOYEE_ID_MISSING"
      );
    }

    if (!corporateId) {
      throw new Error(
        "CORPORATE_ID_MISSING"
      );
    }

    const loginEmail =
      buildEmployeeLoginEmail(
        corporateId,
        employeeId
      );

    /* ======================================
       Role and Permissions

       Reuse the role loaded during employee
       creation when available.
    ====================================== */

    const roleId =
      normalizeRoleId(
        employeeData.access
          ?.roleId ||
          employeeData.roleId ||
          employeeData.employment
            ?.role
      );

    const role =
      preparedRole &&
      preparedRole.id ===
        roleId
        ? preparedRole
        : await loadRole(
            context.companyId,
            roleId
          );

    validateTarget(
      context,
      employeeData,
      role
    );

    const requestedOverrides =
      resolvePermissionOverrides(
        employeeData
      );

    const grant =
      validPermissions(
        requestedOverrides.grant
      );

    const deny =
      validPermissions(
        requestedOverrides.deny
      );

    if (
      !context.owner &&
      grant.some(
        (permission) =>
          !context
            .callerPermissions
            .includes(
              permission
            )
      )
    ) {
      throw new Error(
        "PERMISSION_ESCALATION"
      );
    }

    if (
      context
        .callerRole
        .id ===
        "team_leader" &&
      grant.some(
        (permission) =>
          permission.endsWith(
            ".manage"
          )
      )
    ) {
      throw new Error(
        "PERMISSION_ESCALATION"
      );
    }

    const permissionOverrides = {
      grant,

      deny,
    };

    const permissions =
      calculateEffectivePermissions({
        rolePermissions:
          role.permissions,

        grantedPermissions:
          grant,

        deniedPermissions:
          deny,
      });

    /* ======================================
       Phone Number
    ====================================== */

    const rawPhoneNumber =
      String(
        input.phoneNumber ||
          ""
      ).trim();

    const phoneNumber =
      /^\+[1-9]\d{7,14}$/.test(
        rawPhoneNumber
      )
        ? rawPhoneNumber
        : /^\d{10}$/.test(
              rawPhoneNumber
            )
          ? `+91${rawPhoneNumber}`
          : undefined;

    /* ======================================
       Create Firebase Auth User

       No getUserByEmail pre-check.
       createUser itself is authoritative.
    ====================================== */

    let authUser;

    try {
      authUser =
        await adminAuth.createUser({
          email:
            loginEmail,

          password:
            input.password,

          displayName:
            input.displayName ||
            employeeData
              .personalInfo
              ?.fullName ||
            employeeId,

          phoneNumber,

          disabled:
            false,
        });
    } catch (error) {
      if (
        error?.code ===
          "auth/email-already-exists" ||
        error?.code ===
          "auth/phone-number-already-exists"
      ) {
        throw new Error(
          "LOGIN_ACCOUNT_ALREADY_EXISTS"
        );
      }

      throw error;
    }

    createdUid =
      authUser.uid;

    /* ======================================
       Custom Claims
    ====================================== */

    await syncEmployeeClaims(
      adminAuth,
      {
        uid:
          authUser.uid,

        companyId:
          context.companyId,

        employeeFirestoreId:
          employeeRef.id,

        employee: {
          ...employeeData,

          access: {
            ...employeeData.access,

            authUid:
              authUser.uid,

            roleId,

            effectivePermissions:
              permissions,

            permissionOverrides,
          },
        },
      }
    );

    /* ======================================
       Firestore Login Records
    ====================================== */

    const batch =
      adminDb.batch();

    const rootUserRef =
      adminDb
        .collection(
          "Usermanagement"
        )
        .doc(
          authUser.uid
        );

    const personalEmail =
      String(
        employeeData
          .personalInfo
          ?.email ||
          input.email ||
          ""
      )
        .trim()
        .toLowerCase();

    batch.set(
      rootUserRef,
      {
        uid:
          authUser.uid,

        companyId:
          context.companyId,

        companyEmployeeId:
          employeeRef.id,

        employeeFirestoreId:
          employeeRef.id,

        corporateId,

        employeeId,

        loginEmail,

        email:
          personalEmail,

        role:
          roleId,

        status:
          "active",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge:
          true,
      }
    );

    batch.set(
      employeeRef,
      {
        access: {
          authUid:
            authUser.uid,

          loginEnabled:
            true,

          roleId,

          status:
            "active",

          requirePasswordChange:
            input.requirePasswordChange !==
            false,

          policyAccepted:
            false,

          effectivePermissions:
            permissions,

          permissionOverrides,
        },

        login: {
          corporateId,

          employeeId,

          loginEmail,

          lastLogin:
            null,

          temporaryPasswordSet:
            input.requirePasswordChange !==
            false,
        },

        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {
        merge:
          true,
      }
    );

    const activityLogRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "ActivityLogs"
        )
        .doc();

    batch.set(
      activityLogRef,
      {
        type:
          "employee.account-created",

        actorId:
          context.token.uid,

        targetUserId:
          authUser.uid,

        targetEmployeeId:
          employeeRef.id,

        metadata: {
          roleId,

          employeeId,

          permissionCount:
            permissions.length,
        },

        createdAt:
          FieldValue.serverTimestamp(),
      }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,

      uid:
        authUser.uid,

      employeeId,

      employeeFirestoreId:
        employeeRef.id,

      loginEmail,
    });
  } catch (error) {
    /*
     * Firebase Auth was created but Firestore
     * failed: remove the Auth account.
     */
    if (createdUid) {
      await adminAuth
        .deleteUser(
          createdUid
        )
        .catch(
          () => {}
        );
    }

    /*
     * Employee profile was created as part of
     * this request but provisioning failed:
     * rollback the incomplete employee.
     */
    if (
      createdEmployeeRef
    ) {
      await createdEmployeeRef
        .delete()
        .catch(
          () => {}
        );
    }

    console.error(
      "RBAC user creation failed:",
      error
    );

    return responseError(
      error
    );
  }
}

/* ==========================================================
   PATCH — Employee Security / Login Actions
========================================================== */

export async function PATCH(
  request
) {
  try {
    const context =
      await authorize(
        request
      );

    const input =
      await request.json();

    if (!input.action) {
      throw new Error(
        "ACTION_REQUIRED"
      );
    }

    requirePermission(
      context,
      "employee.manage"
    );

    let employeeRef =
      null;

    let employeeData =
      null;

    let requestedRole =
      null;

    /* ======================================
       Target Employee
    ====================================== */

    if (
      input.employeeFirestoreId
    ) {
      employeeRef =
        adminDb
          .collection(
            "Companies"
          )
          .doc(
            context.companyId
          )
          .collection(
            "Usermanagement"
          )
          .doc(
            input.employeeFirestoreId
          );

      const targetSnap =
        await employeeRef.get();

      if (
        !targetSnap.exists
      ) {
        throw new Error(
          "EMPLOYEE_NOT_FOUND"
        );
      }

      employeeData =
        targetSnap.data() ||
        {};

      const currentTargetRole =
        await loadRole(
          context.companyId,
          resolveEmployeeRoleId(
            employeeData
          )
        );

      validateTarget(
        context,
        employeeData,
        currentTargetRole
      );

      const storedUid =
        resolveEmployeeAuthUid(
          employeeData
        );

      if (
        input.targetUid &&
        storedUid &&
        input.targetUid !==
          storedUid
      ) {
        throw new Error(
          "TARGET_MISMATCH"
        );
      }

      input.targetUid =
        storedUid ||
        input.targetUid;
    }

    /* ======================================
       Owner Protection
    ====================================== */

    const protectedActions = [
      "disable",
      "deactivate",
      "lock",
      "delete",
      "revoke",
    ];

    if (
      input.targetUid ===
        context.company
          .ownerUid &&
      protectedActions.includes(
        input.action
      )
    ) {
      throw new Error(
        "OWNER_PROTECTED"
      );
    }

    /* ======================================
       Self Protection
    ====================================== */

    if (
      input.targetUid ===
        context.token.uid &&
      [
        "disable",
        "deactivate",
        "lock",
        "delete",
      ].includes(
        input.action
      )
    ) {
      throw new Error(
        "SELF_PROTECTED"
      );
    }

    /* ======================================
       UID Requirement
    ====================================== */

    if (
      ![
        "reset-password",
        "enable",
        "role",
        "deactivate",
      ].includes(
        input.action
      ) &&
      !input.targetUid
    ) {
      throw new Error(
        "TARGET_UID_REQUIRED"
      );
    }

    /* ======================================
       Revoke Sessions
    ====================================== */

    if (
      input.action ===
      "revoke"
    ) {
      await adminAuth.revokeRefreshTokens(
        input.targetUid
      );
    }

    /* ======================================
       Disable / Deactivate / Lock
    ====================================== */

    if (
      [
        "disable",
        "deactivate",
        "lock",
      ].includes(
        input.action
      ) &&
      input.targetUid
    ) {
      await adminAuth.updateUser(
        input.targetUid,
        {
          disabled:
            true,
        }
      );

      await adminAuth.revokeRefreshTokens(
        input.targetUid
      );
    }

    /* ======================================
       Enable / Unlock
    ====================================== */

    if (
      [
        "enable",
        "unlock",
      ].includes(
        input.action
      )
    ) {
      if (
        !employeeRef ||
        !employeeData ||
        resolveEmployeeAuthUid(
          employeeData
        ) !==
          input.targetUid
      ) {
        throw new Error(
          "TARGET_MISMATCH"
        );
      }

      await ensureEmployeeClaims(
        adminAuth,
        {
          uid:
            input.targetUid,
      
          companyId:
            context.companyId,
      
          employeeFirestoreId:
            employeeRef.id,
      
          employee:
            employeeData,
        }
      );

      await adminAuth.updateUser(
        input.targetUid,
        {
          disabled:
            false,
        }
      );
    }

    /* ======================================
       Delete Auth User
    ====================================== */

    if (
      input.action ===
      "delete"
    ) {
      await adminAuth.deleteUser(
        input.targetUid
      );
    }

    /* ======================================
       Password Reset

       Returns early intentionally because
       no employee Firestore state changes.
    ====================================== */

    if (
      input.action ===
      "reset-password"
    ) {
      let loginEmail =
        String(
          input.loginEmail ||
            ""
        ).trim();

      if (
        !loginEmail &&
        input.targetUid
      ) {
        const authUser =
          await adminAuth.getUser(
            input.targetUid
          );

        loginEmail =
          authUser.email ||
          "";
      }

      if (!loginEmail) {
        throw new Error(
          "LOGIN_EMAIL_REQUIRED"
        );
      }

      const resetLink =
        await adminAuth.generatePasswordResetLink(
          loginEmail
        );

      return NextResponse.json({
        success: true,

        resetLink,
      });
    }

    /* ======================================
       Role Change

       Load once and reuse below.
    ====================================== */

    if (
      input.action ===
      "role"
    ) {
      if (
        !employeeRef ||
        !employeeData
      ) {
        throw new Error(
          "EMPLOYEE_NOT_FOUND"
        );
      }

      const roleId =
        normalizeRoleId(
          input.roleId
        );

      requestedRole =
        await loadRole(
          context.companyId,
          roleId
        );

      validateTarget(
        context,
        employeeData,
        requestedRole
      );

      if (
        !input.targetUid
      ) {
        throw new Error(
          "TARGET_UID_REQUIRED"
        );
      }

      await syncEmployeeClaims(
        adminAuth,
        {
          uid:
            input.targetUid,

          companyId:
            context.companyId,

          employeeFirestoreId:
            employeeRef.id,

          employee: {
            ...employeeData,

            access: {
              ...employeeData.access,

              roleId,
            },
          },
        }
      );
    }

    /* ======================================
       Firestore Updates
    ====================================== */

    const updates = {};

    if (
      input.employeeFirestoreId
    ) {
      updates[
        "access.updatedAt"
      ] =
        FieldValue.serverTimestamp();

      updates.updatedAt =
        FieldValue.serverTimestamp();

      if (
        [
          "disable",
          "deactivate",
          "lock",
        ].includes(
          input.action
        )
      ) {
        updates[
          "access.status"
        ] =
          input.action ===
          "lock"
            ? "locked"
            : "inactive";

        updates[
          "access.loginEnabled"
        ] =
          false;

        if (
          input.action ===
          "deactivate"
        ) {
          updates[
            "employment.status"
          ] =
            "Inactive";
        }
      }

      if (
        [
          "unlock",
          "enable",
        ].includes(
          input.action
        )
      ) {
        updates[
          "access.status"
        ] =
          "active";

        updates[
          "access.loginEnabled"
        ] =
          true;
      }

      if (
        input.action ===
        "delete"
      ) {
        updates[
          "access.status"
        ] =
          "inactive";

        updates[
          "access.loginEnabled"
        ] =
          false;

        updates[
          "access.authUid"
        ] =
          null;
      }

      /* ====================================
         Role Update
      ==================================== */

      if (
        input.action ===
        "role"
      ) {
        const roleId =
          normalizeRoleId(
            input.roleId
          );

        const role =
          requestedRole;

        if (!role) {
          throw new Error(
            "ROLE_NOT_FOUND"
          );
        }

        const requested =
          input.permissionOverrides ||
          resolvePermissionOverrides(
            employeeData
          );

        const grant =
          validPermissions(
            requested.grant
          );

        const deny =
          validPermissions(
            requested.deny
          );

        if (
          !context.owner &&
          grant.some(
            (permission) =>
              !context
                .callerPermissions
                .includes(
                  permission
                )
          )
        ) {
          throw new Error(
            "PERMISSION_ESCALATION"
          );
        }

        if (
          context
            .callerRole
            .id ===
            "team_leader" &&
          grant.some(
            (permission) =>
              permission.endsWith(
                ".manage"
              )
          )
        ) {
          throw new Error(
            "PERMISSION_ESCALATION"
          );
        }

        updates[
          "access.roleId"
        ] =
          roleId;

        updates[
          "access.effectivePermissions"
        ] =
          calculateEffectivePermissions({
            rolePermissions:
              role.permissions,

            grantedPermissions:
              grant,

            deniedPermissions:
              deny,
          });

        updates[
          "access.permissionOverrides"
        ] = {
          grant,

          deny,
        };
      }

      /* ====================================
         Expire Password
      ==================================== */

      if (
        input.action ===
        "expire-password"
      ) {
        updates[
          "access.requirePasswordChange"
        ] =
          true;

        updates[
          "login.temporaryPasswordSet"
        ] =
          true;
      }
    }

    /* ======================================
       Firestore Employee + Activity Log

       One batch instead of:
       employee update → wait → activity add.
    ====================================== */

    const activityLogRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          context.companyId
        )
        .collection(
          "ActivityLogs"
        )
        .doc();

    const batch =
      adminDb.batch();

    if (
      employeeRef &&
      Object.keys(updates)
        .length
    ) {
      batch.update(
        employeeRef,
        updates
      );
    }

    batch.set(
      activityLogRef,
      {
        type:
          input.action ===
          "role"
            ? "employee.role-changed"
            : input.action ===
                "deactivate"
              ? "employee.deactivated"
              : `employee.account-${
                  input.action ===
                  "disable"
                    ? "disabled"
                    : input.action ===
                          "enable" ||
                        input.action ===
                          "unlock"
                      ? "enabled"
                      : input.action
                }`,

        actorId:
          context.token.uid,

        targetUserId:
          input.targetUid ||
          null,

        targetEmployeeId:
          input.employeeFirestoreId ||
          null,

        metadata:
          input.metadata ||
          {},

        createdAt:
          FieldValue.serverTimestamp(),
      }
    );

    await batch.commit();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "RBAC user action failed:",
      error
    );

    return responseError(
      error
    );
  }
}