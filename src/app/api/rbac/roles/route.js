import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";

import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_LEVELS,
  calculateEffectivePermissions,
  normalizeRoleId,
} from "@/app/allservice/rbac/permissionCatalog";

import { resolvePermissionOverrides } from "@/app/allservice/rbac/employeeAuth";

import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";

/* ==========================================
    Helpers
========================================== */

function normalizePermissions(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter((key) =>
        ALL_PERMISSIONS.includes(key)
      )
    ),
  ];
}

function normalizeAssignableRoles(
  roles,
  level
) {
  if (!Array.isArray(roles)) {
    return [];
  }

  return [
    ...new Set(
      roles
        .map(normalizeRoleId)
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
    PUT — Create / Update Role
========================================== */

export async function PUT(request) {
  try {
    /* ======================================
        Authorization
    ====================================== */

    const context =
      await authorizeCompanyRequest(
        request
      );

    if (!context?.isOwner) {
      throw new Error(
        "FORBIDDEN"
      );
    }

    const {
      token,
      companyId,
    } = context;

    if (
      !token?.uid ||
      !companyId
    ) {
      throw new Error(
        "UNAUTHENTICATED"
      );
    }

    /*
     * Keep this company check for now.
     *
     * We can remove the extra company read
     * later only after verifying exactly
     * what authorizeCompanyRequest already
     * validates/returns.
     */
    const companyRef =
      adminDb
        .collection("Companies")
        .doc(companyId);

    const companySnap =
      await companyRef.get();

    if (
      !companySnap.exists
    ) {
      throw new Error(
        "COMPANY_NOT_FOUND"
      );
    }

    const company =
      companySnap.data() || {};

    if (
      company.ownerUid !==
      token.uid
    ) {
      throw new Error(
        "FORBIDDEN"
      );
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

    /* ======================================
        Input
    ====================================== */

    const input =
      await request.json();

    const name =
      String(
        input?.name || ""
      ).trim();

    if (!name) {
      throw new Error(
        "ROLE_NAME_REQUIRED"
      );
    }

    const id =
      normalizeRoleId(
        input?.id || name
      );

    if (!id) {
      throw new Error(
        "INVALID_ROLE_ID"
      );
    }

    if (id === "owner") {
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
      !Number.isFinite(level) ||
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
        .collection("Roles")
        .doc(id);

    const before =
      await roleRef.get();

    const beforeData =
      before.exists
        ? before.data() || {}
        : null;

    /* ======================================
        Save Role
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
       * Only known built-in roles
       * are treated as system roles.
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
          input?.canManagePermissions
        ),

      updatedBy:
        token.uid,

      updatedAt:
        FieldValue.serverTimestamp(),

      createdAt:
        beforeData?.createdAt ||
        FieldValue.serverTimestamp(),
    };

    await roleRef.set(
      roleData,
      {
        merge: true,
      }
    );

    /* ======================================
        Update Employees Using Role

        This is required because SHARO
        currently stores effectivePermissions
        on employee documents.
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

    /*
     * Firestore batch max is 500.
     * 400 keeps safe headroom.
     */
    const BATCH_SIZE = 400;

    for (
      let offset = 0;
      offset <
      usersSnapshot.docs.length;
      offset += BATCH_SIZE
    ) {
      const batch =
        adminDb.batch();

      const chunk =
        usersSnapshot.docs.slice(
          offset,
          offset +
            BATCH_SIZE
        );

      for (const user of chunk) {
        const userData =
          user.data() || {};

        const overrides =
          resolvePermissionOverrides(
            userData
          );

        const effectivePermissions =
          calculateEffectivePermissions({
            rolePermissions:
              permissions,

            grantedPermissions:
              overrides.grant,

            deniedPermissions:
              overrides.deny,
          });

        batch.update(
          user.ref,
          {
            "access.effectivePermissions":
              effectivePermissions,

            "access.permissionsUpdatedAt":
              FieldValue.serverTimestamp(),
          }
        );
      }

      await batch.commit();
    }

    /* ======================================
        Audit Log

        Server is the ONLY source for this
        role-change audit entry.
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
                  Array.isArray(
                    beforeData.permissions
                  )
                    ? beforeData.permissions
                    : [],

                level:
                  beforeData.level ??
                  null,
              }
            : null,

        after: {
          roleId: id,

          permissions,

          level,
        },

        metadata: {
          roleName:
            name,

          affectedUsers:
            usersSnapshot.size,

          permissionCount:
            permissions.length,
        },

        createdAt:
          FieldValue.serverTimestamp(),
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
          roleData.description,

        level,

        system:
          roleData.system,

        isActive:
          roleData.isActive,

        permissions,

        canAssignRoles,

        canManagePermissions:
          roleData.canManagePermissions,
      },

      affectedUsers:
        usersSnapshot.size,
    });
  } catch (error) {
    console.error(
      "[RBAC Roles] Update failed",
      {
        code:
          error?.message ||
          "ROLE_UPDATE_FAILED",
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
      "FORBIDDEN"
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