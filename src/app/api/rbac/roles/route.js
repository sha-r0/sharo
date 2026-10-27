import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_LEVELS,
  calculateEffectivePermissions,
  normalizeRoleId,
} from "@/app/allservice/rbac/permissionCatalog";

import {
  resolveEmployeeAuthUid,
  resolvePermissionOverrides,
} from "@/app/allservice/rbac/employeeAuth";

import {
  authorizeCompanyRequest,
} from "@/lib/server/authorizeCompanyRequest";

import {
  syncEmployeeClaims,
} from "@/lib/server/syncEmployeeClaims.mjs";


/* ==========================================
    Constants
========================================== */

const FIRESTORE_BATCH_SIZE = 400;

const AUTH_SYNC_BATCH_SIZE = 20;


/* ==========================================
    Helpers
========================================== */

function normalizePermissions(
  value
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (permission) =>
          ALL_PERMISSIONS.includes(
            permission
          )
      )
    ),
  ];
}


function normalizeAssignableRoles(
  roles,
  level
) {
  if (
    !Array.isArray(roles)
  ) {
    return [];
  }

  return [
    ...new Set(
      roles
        .map(
          normalizeRoleId
        )
        .filter(Boolean)
        .filter(
          (roleId) =>
            Number(
              DEFAULT_ROLE_LEVELS[
                roleId
              ] || 0
            ) < level
        )
    ),
  ];
}


/* ==========================================
    Firebase Claim Synchronization
========================================== */

async function syncRoleClaims({
  companyId,
  employees,
}) {
  let synced = 0;
  let failed = 0;

  /*
   * Avoid firing a large number of Firebase
   * Auth requests simultaneously.
   */
  for (
    let offset = 0;
    offset < employees.length;
    offset += AUTH_SYNC_BATCH_SIZE
  ) {
    const chunk =
      employees.slice(
        offset,
        offset +
          AUTH_SYNC_BATCH_SIZE
      );

    const results =
      await Promise.allSettled(
        chunk.map(
          async ({
            firestoreId,
            authUid,
            employee,
          }) => {
            if (!authUid) {
              return {
                skipped: true,
              };
            }

            await syncEmployeeClaims(
              adminAuth,
              {
                uid:
                  authUid,

                companyId,

                employeeFirestoreId:
                  firestoreId,

                employee,
              }
            );

            return {
              skipped: false,
            };
          }
        )
      );

    results.forEach(
      (result) => {
        if (
          result.status ===
          "fulfilled"
        ) {
          if (
            !result.value
              ?.skipped
          ) {
            synced += 1;
          }

          return;
        }

        failed += 1;

        console.error(
          "[RBAC Roles] Employee claim sync failed",
          {
            message:
              result.reason
                ?.message ||
              "CLAIM_SYNC_FAILED",

            code:
              result.reason
                ?.code ||
              null,
          }
        );
      }
    );
  }

  return {
    synced,
    failed,
  };
}


/* ==========================================
    PUT — Create / Update Role
========================================== */

export async function PUT(
  request
) {
  try {
    /* ======================================
        Authorization

        Owner authority is determined only by
        authorizeCompanyRequest(), which verifies:

        Companies/{companyId}.ownerUid === uid
    ====================================== */

    const context =
      await authorizeCompanyRequest(
        request
      );

    if (
      !context?.isOwner
    ) {
      throw new Error(
        "FORBIDDEN"
      );
    }

    const {
      token,
      companyId,
      company,
      companyRef,
    } = context;

    if (
      !token?.uid ||
      !companyId ||
      !companyRef
    ) {
      throw new Error(
        "UNAUTHENTICATED"
      );
    }

    /*
     * Defensive protection.
     *
     * authorizeCompanyRequest already verifies
     * this relationship, but keeping this check
     * makes the mutation explicitly owner-only.
     */
    if (
      company?.ownerUid !==
      token.uid
    ) {
      throw new Error(
        "FORBIDDEN"
      );
    }


    /* ======================================
        Input
    ====================================== */

    const input =
      await request.json();

    const name =
      String(
        input?.name ||
          ""
      ).trim();

    if (!name) {
      throw new Error(
        "ROLE_NAME_REQUIRED"
      );
    }

    const id =
      normalizeRoleId(
        input?.id ||
          name
      );

    if (!id) {
      throw new Error(
        "INVALID_ROLE_ID"
      );
    }

    /*
     * Nobody can create/edit a role document
     * capable of becoming the company owner.
     *
     * Owner identity remains tied only to
     * company.ownerUid.
     */
    if (
      id === "owner"
    ) {
      throw new Error(
        "OWNER_PROTECTED"
      );
    }


    /* ======================================
        Permissions
    ====================================== */

    const permissions =
      normalizePermissions(
        input?.permissions
      );


    /* ======================================
        Role Level
    ====================================== */

    const defaultLevel =
      DEFAULT_ROLE_LEVELS[
        id
      ];

    const level =
      Number(
        input?.level ??
          defaultLevel ??
          10
      );

    if (
      !Number.isFinite(
        level
      ) ||
      level < 1 ||
      level >= 100
    ) {
      throw new Error(
        "INVALID_ROLE_LEVEL"
      );
    }


    /* ======================================
        Assignment Rules
    ====================================== */

    const canAssignRoles =
      normalizeAssignableRoles(
        input?.canAssignRoles,
        level
      );


    /* ======================================
        Existing Role
    ====================================== */

    const roleRef =
      companyRef
        .collection(
          "Roles"
        )
        .doc(id);

    const before =
      await roleRef.get();

    const beforeData =
      before.exists
        ? before.data() ||
          {}
        : null;


    /* ======================================
        Prepare Role
    ====================================== */

    const roleData = {
      name,

      description:
        String(
          input?.description ||
            ""
        ).trim(),

      level,

      /*
       * Built-in role IDs remain system roles.
       *
       * Owner is separately protected above.
       */
      system:
        Boolean(
          DEFAULT_ROLE_LEVELS[
            id
          ]
        ),

      isActive:
        input?.isActive !==
        false,

      permissions,

      canAssignRoles,

      canManagePermissions:
        Boolean(
          input
            ?.canManagePermissions
        ),

      updatedBy:
        token.uid,

      updatedAt:
        FieldValue
          .serverTimestamp(),

      createdAt:
        beforeData
          ?.createdAt ||
        FieldValue
          .serverTimestamp(),
    };


    /* ======================================
        Employees Using Role
    ====================================== */

    const usersSnapshot =
      await companyRef
        .collection(
          "Usermanagement"
        )
        .where(
          "access.roleId",
          "==",
          id
        )
        .get();


    /* ======================================
        Build Employee Permission Updates

        Role permissions
              +
        Employee explicit grants
              -
        Employee explicit denies
              =
        Effective permissions
    ====================================== */

    const employeeUpdates =
      usersSnapshot.docs.map(
        (user) => {
          const userData =
            user.data() ||
            {};

          const overrides =
            resolvePermissionOverrides(
              userData
            );

          const safeOverrides = {
            grant:
              normalizePermissions(
                overrides?.grant
              ),

            deny:
              normalizePermissions(
                overrides?.deny
              ),
          };

          const effectivePermissions =
            calculateEffectivePermissions({
              rolePermissions:
                permissions,

              grantedPermissions:
                safeOverrides
                  .grant,

              deniedPermissions:
                safeOverrides
                  .deny,
            });

          const authUid =
            resolveEmployeeAuthUid(
              userData
            );

          const employeeForClaims = {
            ...userData,

            access: {
              ...(userData
                .access ||
                {}),

              authUid:
                authUid ||
                null,

              roleId:
                id,

              effectivePermissions,

              permissionOverrides:
                safeOverrides,
            },
          };

          return {
            ref:
              user.ref,

            firestoreId:
              user.id,

            authUid,

            effectivePermissions,

            overrides:
              safeOverrides,

            employeeForClaims,
          };
        }
      );


    /* ======================================
        Save Role First

        Role document is the authority for
        everyone assigned to this role.
    ====================================== */

    await roleRef.set(
      roleData,
      {
        merge: true,
      }
    );


    /* ======================================
        Update Employee Effective Permissions
    ====================================== */

    for (
      let offset = 0;
      offset <
      employeeUpdates.length;
      offset +=
        FIRESTORE_BATCH_SIZE
    ) {
      const chunk =
        employeeUpdates.slice(
          offset,
          offset +
            FIRESTORE_BATCH_SIZE
        );

      const batch =
        adminDb.batch();

      for (
        const employee
        of chunk
      ) {
        batch.update(
          employee.ref,
          {
            "access.roleId":
              id,

            "access.effectivePermissions":
              employee
                .effectivePermissions,

            "access.permissionOverrides":
              employee
                .overrides,

            "access.permissionsUpdatedAt":
              FieldValue
                .serverTimestamp(),

            "access.updatedAt":
              FieldValue
                .serverTimestamp(),

            updatedAt:
              FieldValue
                .serverTimestamp(),
          }
        );
      }

      await batch.commit();
    }


    /* ======================================
        Synchronize Firebase Auth Claims

        Firestore permissions are already
        authoritative at this point.

        Claim failures are recorded but do not
        roll back valid Firestore permissions.
    ====================================== */

    const claimSync =
      await syncRoleClaims({
        companyId,

        employees:
          employeeUpdates.map(
            (employee) => ({
              firestoreId:
                employee
                  .firestoreId,

              authUid:
                employee
                  .authUid,

              employee:
                employee
                  .employeeForClaims,
            })
          ),
      });


    /* ======================================
        Audit Log
    ====================================== */

    await companyRef
      .collection(
        "ActivityLogs"
      )
      .add({
        type:
          "role.permissions-changed",

        actorId:
          token.uid,

        companyId,

        roleId:
          id,

        before:
          beforeData
            ? {
                permissions:
                  normalizePermissions(
                    beforeData
                      .permissions
                  ),

                level:
                  beforeData
                    .level ??
                  null,

                isActive:
                  beforeData
                    .isActive !==
                  false,
              }
            : null,

        after: {
          roleId:
            id,

          permissions,

          level,

          isActive:
            roleData
              .isActive,
        },

        metadata: {
          roleName:
            name,

          affectedUsers:
            usersSnapshot
              .size,

          permissionCount:
            permissions
              .length,

          claimsSynced:
            claimSync
              .synced,

          claimSyncFailures:
            claimSync
              .failed,
        },

        createdAt:
          FieldValue
            .serverTimestamp(),
      });


    /* ======================================
        Response
    ====================================== */

    return NextResponse.json({
      success: true,

      id,

      role: {
        id,

        name,

        description:
          roleData
            .description,

        level,

        system:
          roleData
            .system,

        isActive:
          roleData
            .isActive,

        permissions,

        canAssignRoles,

        canManagePermissions:
          roleData
            .canManagePermissions,
      },

      affectedUsers:
        usersSnapshot.size,

      claimsSynced:
        claimSync.synced,

      claimSyncFailures:
        claimSync.failed,
    });
  } catch (error) {
    console.error(
      "[RBAC Roles] Update failed",
      {
        code:
          error?.message ||
          "ROLE_UPDATE_FAILED",

        firebaseCode:
          error?.code ||
          null,
      }
    );

    const message =
      error?.message ||
      "ROLE_UPDATE_FAILED";

    let status = 400;

    if (
      message ===
      "UNAUTHENTICATED"
    ) {
      status = 401;
    } else if (
      message ===
      "FORBIDDEN" ||
      message ===
        "COMPANY_INACTIVE"
    ) {
      status = 403;
    } else if (
      message ===
      "COMPANY_NOT_FOUND"
    ) {
      status = 404;
    }

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      }
    );
  }
}