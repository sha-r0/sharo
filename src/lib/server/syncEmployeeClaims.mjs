// Shared by login bootstrap and administrative claims repair.

/* ==========================================================
   Helpers
========================================================== */

function resolveRoleId(employee) {
  return (
    employee?.access?.roleId ||
    employee?.roleId ||
    employee?.employment?.role ||
    "employee"
  );
}

function validateIdentity({
  uid,
  companyId,
  employeeFirestoreId,
  employee,
}) {
  if (
    !uid ||
    !companyId ||
    !employeeFirestoreId
  ) {
    throw new Error(
      "INVALID_EMPLOYEE_IDENTITY"
    );
  }

  const linkedUid =
    employee?.access?.authUid ||
    employee?.authUid;

  if (
    !linkedUid ||
    linkedUid !== uid
  ) {
    throw new Error(
      "UID_MISMATCH"
    );
  }
}

function expectedClaims({
  companyId,
  employeeFirestoreId,
  employee,
}) {
  return {
    companyId,

    companyEmployeeId:
      employeeFirestoreId,

    roleId:
      resolveRoleId(
        employee
      ),

    accountType:
      "employee",
  };
}

function claimsMatch(
  claims,
  expected
) {
  return Object.entries(
    expected
  ).every(
    ([key, value]) =>
      claims?.[key] ===
      value
  );
}

/* ==========================================================
   Sync Employee Claims
========================================================== */

export async function syncEmployeeClaims(
  adminAuth,
  {
    uid,

    companyId,

    employeeFirestoreId,

    employee,

    /*
     * Optional optimization:
     *
     * When the caller already has the Firebase
     * Auth user (for example immediately after
     * createUser), pass it here so we avoid
     * another adminAuth.getUser() network call.
     */
    authUser:
      suppliedAuthUser = null,
  }
) {
  validateIdentity({
    uid,

    companyId,

    employeeFirestoreId,

    employee,
  });

  const authUser =
    suppliedAuthUser ||
    (await adminAuth.getUser(
      uid
    ));

  if (
    authUser.uid !== uid
  ) {
    throw new Error(
      "UID_MISMATCH"
    );
  }

  if (
    authUser.disabled
  ) {
    throw Object.assign(
      new Error(
        "EMPLOYEE_DISABLED"
      ),
      {
        code:
          "auth/user-disabled",
      }
    );
  }

  const expected =
    expectedClaims({
      companyId,

      employeeFirestoreId,

      employee,
    });

  const claims = {
    ...(authUser.customClaims ||
      {}),

    ...expected,

    /*
     * Changing this forces existing clients
     * to recognize that their permission
     * state is newer.
     */
    permissionsVersion:
      Date.now(),
  };

  await adminAuth.setCustomUserClaims(
    uid,
    claims
  );

  return {
    authUser,

    claims,
  };
}

/* ==========================================================
   Ensure Employee Claims

   Reads Firebase Auth once.

   If claims are already correct:
   → no claim write

   If they need repair:
   → reuse the Auth user already loaded
   → no second getUser()
========================================================== */

export async function ensureEmployeeClaims(
  adminAuth,
  identity,
  token = {}
) {
  validateIdentity(
    identity
  );

  const user =
    await adminAuth.getUser(
      identity.uid
    );

  if (user.disabled) {
    throw Object.assign(
      new Error(
        "EMPLOYEE_DISABLED"
      ),
      {
        code:
          "auth/user-disabled",
      }
    );
  }

  const expected =
    expectedClaims(
      identity
    );

  let claims =
    user.customClaims || {};

  const identityMismatch =
    !claimsMatch(
      claims,
      expected
    );

  const invalidVersion =
    !Number.isSafeInteger(
      claims.permissionsVersion
    ) ||
    claims.permissionsVersion <=
      0;

  if (
    identityMismatch ||
    invalidVersion
  ) {
    const result =
      await syncEmployeeClaims(
        adminAuth,
        {
          ...identity,

          /*
           * Critical optimization:
           * syncEmployeeClaims does NOT
           * call getUser again.
           */
          authUser:
            user,
        }
      );

    claims =
      result.claims;
  }

  /*
   * true = current ID token needs refresh.
   *
   * This does not write anything itself.
   */
  return (
    !claimsMatch(
      token,
      expected
    ) ||
    token.permissionsVersion !==
      claims.permissionsVersion
  );
}