/* ==========================================================
   Corporate ID
========================================================== */

export function normalizeCorporateId(
  value
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

/* ==========================================================
   Employee ID
========================================================== */

export function normalizeEmployeeId(
  value
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9_-]/g,
      ""
    );
}

/* ==========================================================
   Canonical Employee ID

   00000007 -> 7
   ABC_01   -> abc_01
========================================================== */

export function canonicalEmployeeId(
  value
) {
  const normalized =
    normalizeEmployeeId(
      value
    );

  if (!normalized) {
    return "";
  }

  return /^\d+$/.test(
    normalized
  )
    ? normalized.replace(
        /^0+(?=\d)/,
        ""
      )
    : normalized;
}

/* ==========================================================
   Match Employee Identifier
========================================================== */

export function employeeMatchesIdentifier(
  employee = {},
  requestedId
) {
  const requested =
    normalizeEmployeeId(
      requestedId
    );

  if (!requested) {
    return false;
  }

  const canonicalRequested =
    canonicalEmployeeId(
      requested
    );

  const identifiers = [
    employee?.employeeId,

    employee?.login
      ?.employeeId,
  ]
    .map(
      normalizeEmployeeId
    )
    .filter(Boolean);

  if (
    identifiers.includes(
      requested
    )
  ) {
    return true;
  }

  return identifiers.some(
    (identifier) =>
      canonicalEmployeeId(
        identifier
      ) ===
      canonicalRequested
  );
}

/* ==========================================================
   Internal Firebase Login Email
========================================================== */

export function buildEmployeeLoginEmail(
  corporateId,
  employeeId
) {
  const companyPart =
    normalizeCorporateId(
      corporateId
    );

  const employeePart =
    normalizeEmployeeId(
      employeeId
    );

  if (
    !companyPart ||
    !employeePart
  ) {
    throw new Error(
      "Corporate ID and Employee ID are required."
    );
  }

  return `${companyPart}.${employeePart}@auth.sharo.in`;
}

/* ==========================================================
   Auth UID
========================================================== */

export function resolveEmployeeAuthUid(
  employee = {}
) {
  return (
    employee?.access
      ?.authUid ||
    employee?.authUid ||
    null
  );
}

/* ==========================================================
   Role ID
========================================================== */

export function resolveEmployeeRoleId(
  employee = {},
  currentUser = {}
) {
  return (
    employee?.access
      ?.roleId ||
    employee?.roleId ||
    employee?.employment
      ?.role ||
    currentUser?.role ||
    "employee"
  );
}

/* ==========================================================
   Permission Overrides
========================================================== */

export function resolvePermissionOverrides(
  employee = {}
) {
  const overrides =
    employee?.access
      ?.permissionOverrides ||
    employee
      ?.permissionOverrides ||
    {};

  const grant =
    Array.isArray(
      overrides.grant
    )
      ? [
          ...new Set(
            overrides.grant.filter(
              Boolean
            )
          ),
        ]
      : [];

  const deny =
    Array.isArray(
      overrides.deny
    )
      ? [
          ...new Set(
            overrides.deny.filter(
              Boolean
            )
          ),
        ]
      : [];

  return {
    grant,
    deny,
  };
}

/* ==========================================================
   Login Enabled

   IMPORTANT:
   If no explicit setting exists, the presence of an
   Auth UID is the safest legacy fallback.

   No Auth UID = no actual Firebase login account.
========================================================== */

export function resolveEmployeeLoginEnabled(
  employee = {}
) {
  if (
    typeof employee?.access
      ?.loginEnabled ===
    "boolean"
  ) {
    return employee.access
      .loginEnabled;
  }

  if (
    typeof employee
      ?.loginEnabled ===
    "boolean"
  ) {
    return employee
      .loginEnabled;
  }

  return Boolean(
    resolveEmployeeAuthUid(
      employee
    )
  );
}

/* ==========================================================
   Normalize Status
========================================================== */

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/* ==========================================================
   Employee Status

   Restrictive states win.

   Example:
   access.status = active
   employment.status = inactive

   Result = inactive
========================================================== */

export function resolveEmployeeStatus(
  employee = {}
) {
  const accessStatus =
    normalizeStatus(
      employee?.access
        ?.status
    );

  const legacyStatus =
    normalizeStatus(
      employee?.status
    );

  const employmentStatus =
    normalizeStatus(
      employee?.employment
        ?.status
    );

  /*
   * Locked should remain distinguishable
   * from normal inactive.
   */
  if (
    accessStatus ===
    "locked"
  ) {
    return "locked";
  }

  /*
   * Any explicit inactive/disabled state
   * must take priority over an old "active"
   * value somewhere else in the record.
   */
  const statuses = [
    accessStatus,
    legacyStatus,
    employmentStatus,
  ];

  if (
    statuses.some(
      (status) =>
        [
          "inactive",
          "disabled",
          "deactivated",
        ].includes(
          status
        )
    )
  ) {
    return "inactive";
  }

  if (
    statuses.some(
      (status) =>
        status ===
        "suspended"
    )
  ) {
    return "suspended";
  }

  if (
    statuses.some(
      (status) =>
        [
          "active",
          "enabled",
        ].includes(
          status
        )
    )
  ) {
    return "active";
  }

  /*
   * A record with no usable status is treated as
   * active only when it has a real login account.
   */
  return resolveEmployeeAuthUid(
    employee
  )
    ? "active"
    : "inactive";
}

/* ==========================================================
   Is Active Employee
========================================================== */

export function isActiveEmployee(
  employee = {}
) {
  const loginEnabled =
    resolveEmployeeLoginEnabled(
      employee
    );

  const status =
    resolveEmployeeStatus(
      employee
    );

  const employmentStatus =
    normalizeStatus(
      employee?.employment
        ?.status ||
        "active"
    );

  const employmentActive =
    ![
      "inactive",
      "disabled",
      "deactivated",
      "suspended",
    ].includes(
      employmentStatus
    );

  return Boolean(
    loginEnabled &&
      status ===
        "active" &&
      employmentActive
  );
}