import {
  adminAuth,
  adminDb,
} from "@/lib/firebase-admin";

import {
  ALL_PERMISSIONS,
  calculateEffectivePermissions,
  normalizeRoleId,
  permissionsForRole,
} from "@/app/allservice/rbac/permissionCatalog";

import {
  resolveEmployeeAuthUid,
  resolveEmployeeLoginEnabled,
  resolveEmployeeRoleId,
  resolveEmployeeStatus,
  resolvePermissionOverrides,
} from "@/app/allservice/rbac/employeeAuth";

/* ==========================================================
   Bearer Token
========================================================== */

function getBearerToken(request) {
  const header =
    request.headers.get(
      "authorization"
    ) || "";

  if (
    !header.startsWith(
      "Bearer "
    )
  ) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const token =
    header
      .slice(7)
      .trim();

  if (!token) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  return token;
}

/* ==========================================================
   Company Active
========================================================== */

function companyIsActive(
  company = {}
) {
  return (
    String(
      company.serviceStatus ||
        "active"
    )
      .trim()
      .toLowerCase() ===
    "active"
  );
}

/* ==========================================================
   Root Membership
========================================================== */

async function loadRootMembership(
  uid
) {
  /*
   * Fast/current structure:
   * Usermanagement/{uid}
   */
  const directRef =
    adminDb
      .collection(
        "Usermanagement"
      )
      .doc(uid);

  const directSnap =
    await directRef.get();

  if (
    directSnap.exists
  ) {
    return {
      id:
        directSnap.id,

      ref:
        directSnap.ref,

      data:
        directSnap.data() ||
        {},
    };
  }

  /*
   * Legacy fallback.
   */
  const querySnap =
    await adminDb
      .collection(
        "Usermanagement"
      )
      .where(
        "uid",
        "==",
        uid
      )
      .limit(1)
      .get();

  if (
    querySnap.empty
  ) {
    return null;
  }

  const document =
    querySnap.docs[0];

  return {
    id:
      document.id,

    ref:
      document.ref,

    data:
      document.data() ||
      {},
  };
}

/* ==========================================================
   Owner Company
========================================================== */

async function loadOwnerCompany(
  token
) {
  /*
   * Fast path:
   * companyId already exists in token.
   */
  if (token.companyId) {
    const companyRef =
      adminDb
        .collection(
          "Companies"
        )
        .doc(
          String(
            token.companyId
          )
        );

    const snap =
      await companyRef.get();

    if (
      snap.exists
    ) {
      const company =
        snap.data() ||
        {};

      if (
        company.ownerUid ===
        token.uid
      ) {
        return {
          companyId:
            snap.id,

          company,

          companyRef,
        };
      }
    }
  }

  /*
   * Owner fallback for older tokens.
   */
  const snapshot =
    await adminDb
      .collection(
        "Companies"
      )
      .where(
        "ownerUid",
        "==",
        token.uid
      )
      .limit(1)
      .get();

  if (
    snapshot.empty
  ) {
    return null;
  }

  const document =
    snapshot.docs[0];

  return {
    companyId:
      document.id,

    company:
      document.data() ||
      {},

    companyRef:
      document.ref,
  };
}

/* ==========================================================
   Nested Employee
========================================================== */

async function loadEmployee({
  companyRef,
  uid,
  token,
  rootUser,
}) {
  const employeeFirestoreId =
    token.companyEmployeeId ||
    token.employeeFirestoreId ||
    rootUser?.companyEmployeeId ||
    rootUser?.employeeFirestoreId ||
    null;

  /*
   * Fast path:
   * use known nested document ID.
   */
  if (
    employeeFirestoreId
  ) {
    const ref =
      companyRef
        .collection(
          "Usermanagement"
        )
        .doc(
          String(
            employeeFirestoreId
          )
        );

    const snapshot =
      await ref.get();

    if (
      snapshot.exists
    ) {
      const employee =
        snapshot.data() ||
        {};

      if (
        resolveEmployeeAuthUid(
          employee
        ) === uid
      ) {
        return {
          employee,

          employeeRef:
            ref,

          employeeFirestoreId:
            snapshot.id,
        };
      }
    }
  }

  /*
   * Current authUid fallback.
   */
  const accessQuery =
    await companyRef
      .collection(
        "Usermanagement"
      )
      .where(
        "access.authUid",
        "==",
        uid
      )
      .limit(1)
      .get();

  if (
    !accessQuery.empty
  ) {
    const document =
      accessQuery.docs[0];

    return {
      employee:
        document.data() ||
        {},

      employeeRef:
        document.ref,

      employeeFirestoreId:
        document.id,
    };
  }

  /*
   * Legacy authUid fallback.
   */
  const legacyQuery =
    await companyRef
      .collection(
        "Usermanagement"
      )
      .where(
        "authUid",
        "==",
        uid
      )
      .limit(1)
      .get();

  if (
    legacyQuery.empty
  ) {
    return null;
  }

  const document =
    legacyQuery.docs[0];

  return {
    employee:
      document.data() ||
      {},

    employeeRef:
      document.ref,

    employeeFirestoreId:
      document.id,
  };
}

/* ==========================================================
   Authorize Company Request
========================================================== */

export async function authorizeCompanyRequest(
  request
) {
  /* ======================================
     Verify Firebase Token
  ====================================== */

  const bearerToken =
    getBearerToken(
      request
    );

  let token;

  try {
    token =
      await adminAuth.verifyIdToken(
        bearerToken,
        true
      );
  } catch {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  const uid =
    token?.uid;

  if (!uid) {
    throw new Error(
      "UNAUTHENTICATED"
    );
  }

  /* ========================================================
     OWNER

     Ownership is authoritative ONLY when
     Companies/{companyId}.ownerUid === Firebase UID.
  ======================================================== */

  const ownerResult =
    await loadOwnerCompany(
      token
    );

  if (ownerResult) {
    if (
      !companyIsActive(
        ownerResult.company
      )
    ) {
      throw new Error(
        "COMPANY_INACTIVE"
      );
    }

    return {
      token,

      uid,

      companyId:
        ownerResult.companyId,

      company:
        ownerResult.company,

      companyRef:
        ownerResult.companyRef,

      isOwner:
        true,

      employee:
        null,

      employeeRef:
        null,

      employeeFirestoreId:
        null,

      rootUser:
        null,

      rootUserRef:
        null,

      rootUserId:
        null,

      roleId:
        "owner",

      permissions:
        [...ALL_PERMISSIONS],
    };
  }

  /* ========================================================
     EMPLOYEE ROOT MEMBERSHIP
  ======================================================== */

  const rootResult =
    await loadRootMembership(
      uid
    );

  if (!rootResult) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  const rootUser =
    rootResult.data;

  const companyId =
    String(
      rootUser.companyId ||
        token.companyId ||
        ""
    ).trim();

  if (!companyId) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  /* ======================================
     Root Account State
  ====================================== */

  const rootStatus =
    String(
      rootUser.status ||
        "active"
    )
      .trim()
      .toLowerCase();

  if (
    ![
      "active",
      "enabled",
    ].includes(
      rootStatus
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  /* ======================================
     Company
  ====================================== */

  const companyRef =
    adminDb
      .collection(
        "Companies"
      )
      .doc(
        companyId
      );

  const companySnapshot =
    await companyRef.get();

  if (
    !companySnapshot.exists
  ) {
    throw new Error(
      "COMPANY_NOT_FOUND"
    );
  }

  const company =
    companySnapshot.data() ||
    {};

  if (
    !companyIsActive(
      company
    )
  ) {
    throw new Error(
      "COMPANY_INACTIVE"
    );
  }

  /* ======================================
     Employee
  ====================================== */

  const employeeResult =
    await loadEmployee({
      companyRef,

      uid,

      token,

      rootUser,
    });

  if (
    !employeeResult
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  const {
    employee,
    employeeRef,
    employeeFirestoreId,
  } = employeeResult;

  /* ======================================
     UID Link
  ====================================== */

  if (
    resolveEmployeeAuthUid(
      employee
    ) !== uid
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  /* ======================================
     Employee Login State
  ====================================== */

  if (
    !resolveEmployeeLoginEnabled(
      employee
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  const employeeStatus =
    resolveEmployeeStatus(
      employee
    );

  if (
    ![
      "active",
      "enabled",
    ].includes(
      String(
        employeeStatus ||
          ""
      ).toLowerCase()
    )
  ) {
    throw new Error(
      "FORBIDDEN"
    );
  }

  /* ======================================
     Role
  ====================================== */

  let roleId =
    normalizeRoleId(
      resolveEmployeeRoleId(
        employee,
        rootUser
      )
    );

  /*
   * Never allow employee data to promote
   * itself to owner.
   */
  if (
    roleId ===
    "owner"
  ) {
    roleId =
      "employee";
  }

  /* ======================================
     Permissions
  ====================================== */

  const storedPermissions =
    employee?.access
      ?.effectivePermissions;

  let permissions;

  if (
    Array.isArray(
      storedPermissions
    )
  ) {
    permissions = [
      ...new Set(
        storedPermissions.filter(
          (permission) =>
            ALL_PERMISSIONS.includes(
              permission
            )
        )
      ),
    ];
  } else {
    const overrides =
      resolvePermissionOverrides(
        employee
      );

    permissions =
      calculateEffectivePermissions({
        rolePermissions:
          permissionsForRole(
            roleId
          ),

        grantedPermissions:
          overrides.grant,

        deniedPermissions:
          overrides.deny,
      });
  }

  /* ======================================
     Authorized Context
  ====================================== */

  return {
    token,

    uid,

    companyId,

    company,

    companyRef,

    isOwner:
      false,

    employee,

    employeeRef,

    employeeFirestoreId,

    rootUser,

    rootUserRef:
      rootResult.ref,

    rootUserId:
      rootResult.id,

    roleId,

    permissions,
  };
}

/* =========================================================
   Require Company Permission
========================================================= */

export function requireCompanyPermission(
  context,
  ...requiredPermissions
) {
  if (!context) {
    throw new Error("UNAUTHENTICATED");
  }

  /*
   * The verified company owner always has full access.
   * Ownership was already validated by authorizeCompanyRequest().
   */
  if (context.isOwner) {
    return true;
  }

  const permissions = Array.isArray(
    context.permissions
  )
    ? context.permissions
    : [];

  const required = requiredPermissions
    .flat()
    .filter(Boolean);

  /*
   * Authentication alone is enough when a route
   * does not supply a permission requirement.
   */
  if (!required.length) {
    return true;
  }

  /*
   * Multiple permissions mean OR access.
   *
   * Example:
   * requireCompanyPermission(
   *   context,
   *   "projects.create",
   *   "projects.manage"
   * )
   *
   * Either permission allows the operation.
   */
  const allowed = required.some(
    (permission) =>
      permissions.includes(permission)
  );

  if (!allowed) {
    throw new Error("FORBIDDEN");
  }

  return true;
}