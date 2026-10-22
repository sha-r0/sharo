import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_LEVELS,
  calculateEffectivePermissions,
  permissionForPath,
  permissionsForRole,
  normalizeRoleId,
} from "./permissionCatalog.js";

import {
  resolveEmployeeLoginEnabled,
  resolveEmployeeRoleId,
  resolveEmployeeStatus,
  resolvePermissionOverrides,
} from "./employeeAuth.js";

/* ==========================================================
   Helpers
========================================================== */

function validPermissions(
  values
) {
  if (
    !Array.isArray(values)
  ) {
    return [];
  }

  const allowed =
    new Set(
      ALL_PERMISSIONS
    );

  return [
    ...new Set(
      values.filter(
        (permission) =>
          allowed.has(
            permission
          )
      )
    ),
  ];
}

/* ==========================================================
   Resolve Access
========================================================== */

export function resolveAccess({
  currentUser,
  employee,
  company,
  role,
}) {
  /*
   * Ownership must ONLY come from the trusted
   * company.ownerUid relationship.
   *
   * An editable employee/root-user role must
   * never be able to promote itself to owner.
   */
  const isOwner =
    Boolean(
      currentUser?.uid &&
      company?.ownerUid ===
        currentUser.uid
    );

  const requestedRoleId =
    normalizeRoleId(
      resolveEmployeeRoleId(
        employee,
        currentUser
      )
    );

  /*
   * An employee record claiming "owner"
   * is treated as a normal employee.
   */
  const roleId =
    isOwner
      ? "owner"
      : requestedRoleId ===
          "owner"
        ? "employee"
        : requestedRoleId;

  const overrides =
    resolvePermissionOverrides(
      employee
    );

  const safeGranted =
    validPermissions(
      overrides?.grant
    );

  const safeDenied =
    validPermissions(
      overrides?.deny
    );

  /* ======================================
     Base Role Permissions
  ====================================== */

  const suppliedRolePermissions =
    validPermissions(
      role?.permissions
    );

  const templatePermissions =
    validPermissions(
      permissionsForRole(
        roleId
      )
    );

  const basePermissions =
    suppliedRolePermissions.length
      ? suppliedRolePermissions
      : templatePermissions;

  /* ======================================
     Stored Effective Permissions
  ====================================== */

  const storedPermissions =
    employee?.access
      ?.effectivePermissions ??
    employee
      ?.effectivePermissions;

  const hasStoredPermissions =
    Array.isArray(
      storedPermissions
    );

  let permissions;

  if (isOwner) {
    permissions = [
      ...ALL_PERMISSIONS,
    ];
  } else if (
    hasStoredPermissions
  ) {
    /*
     * Firestore rules use
     * access.effectivePermissions.
     *
     * Prefer the server-maintained snapshot,
     * but sanitize it so stale/invalid permission
     * strings cannot survive indefinitely.
     */
    permissions =
      validPermissions(
        storedPermissions
      );
  } else {
    permissions =
      calculateEffectivePermissions({
        rolePermissions:
          basePermissions,

        grantedPermissions:
          safeGranted,

        deniedPermissions:
          safeDenied,
      });
  }

  /* ======================================
     Legacy Accounts Manager Compatibility

     Existing migrated accounts may have an old
     effectivePermissions snapshot that predates
     advance.delete.

     Keep compatibility until all employee
     permission snapshots have been refreshed.
  ====================================== */

  if (
    !isOwner &&
    roleId ===
      "accounts_manager" &&
    !safeDenied.includes(
      "advance.delete"
    ) &&
    !permissions.includes(
      "advance.delete"
    )
  ) {
    permissions = [
      ...permissions,
      "advance.delete",
    ];
  }

  permissions =
    validPermissions(
      permissions
    );

  /* ======================================
     Account State
  ====================================== */

  const accountType =
    isOwner
      ? "owner"
      : "employee";

      const status =
      isOwner
        ? "active"
        : resolveEmployeeStatus(
            employee
          );
    
    const loginEnabled =
      isOwner
        ? true
        : resolveEmployeeLoginEnabled(
            employee
          );

  const active =
    isOwner ||
    (
      loginEnabled &&
      [
        "active",
        "enabled",
      ].includes(
        String(
          status || ""
        ).toLowerCase()
      )
    );

  /* ======================================
     Role Level
  ====================================== */

  const roleLevel =
    isOwner
      ? 100
      : Number(
          role?.level ??
            DEFAULT_ROLE_LEVELS[
              roleId
            ] ??
            10
        );

  /* ======================================
     Result
  ====================================== */

  return {
    uid:
      currentUser?.uid ||
      null,

    companyId:
      company?.id ||
      company?.companyId ||
      null,

    employeeFirestoreId:
      isOwner
        ? null
        : employee?.id ||
          employee?.firestoreId ||
          null,

    employeeId:
      isOwner
        ? null
        : employee
            ?.employeeId ||
          employee
            ?.login
            ?.employeeId ||
          null,

    employeeName:
      isOwner
        ? company
            ?.ownerName ||
          company
            ?.companyName ||
          "Owner"
        : employee
            ?.personalInfo
            ?.fullName ||
          employee?.name ||
          "Employee",

    isOwner,

    isEmployee:
      !isOwner,

    accountType,

    roleId,

    roleLevel,

    permissions,

    status,

    loginEnabled,

    active,

    requirePasswordChange:
      !isOwner &&
      Boolean(
        employee?.access
          ?.requirePasswordChange ??
          employee
            ?.requirePasswordChange
      ),

    /*
     * Existing/legacy employees that have no
     * policyAccepted field remain compatible.
     *
     * New accounts explicitly store false until
     * acceptance.
     */
    policyAccepted:
      isOwner ||
      employee?.access
        ?.policyAccepted !==
        false,

    teamId:
      employee?.reporting
        ?.teamId ||
      employee?.employment
        ?.teamId ||
      null,

    reportsTo:
      employee?.reporting
        ?.reportsTo ||
      employee?.employment
        ?.reportsTo ||
      null,
  };
}

/* ==========================================================
   Permission Checks
========================================================== */

export function can(
  access,
  permission
) {
  if (
    access?.isOwner
  ) {
    return true;
  }

  if (!permission) {
    return true;
  }

  return Boolean(
    access?.permissions?.includes(
      permission
    )
  );
}

/* ==========================================================
   Route Access
========================================================== */

export function canAccessPath(
  access,
  pathname
) {
  if (!pathname) {
    return false;
  }

  return can(
    access,
    permissionForPath(
      pathname
    )
  );
}

/* ==========================================================
   Default Route
========================================================== */

export function defaultRouteForAccess(
  access
) {
  const routes = [
    "/manager",

    "/manager/userManagement",

    "/manager/Workforce/attendance",

    "/manager/performance",

    "/manager/projects",

    "/manager/expenses",

    "/manager/advance",

    "/manager/billing",

    "/manager/quotation-builder",

    "/manager/purchase-orders",

    "/manager/notifications",
  ];

  const allowed =
    routes.find(
      (route) =>
        canAccessPath(
          access,
          route
        )
    );

  /*
   * Preserve your existing fallback for now
   * because we have not inspected the router/
   * middleware that consumes this value.
   */
  return (
    allowed ||
    "/manager"
  );
}