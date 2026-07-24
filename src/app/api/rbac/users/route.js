import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  permissionsForRole,
  normalizeRoleId,
} from "@/app/allservice/rbac/permissionCatalog";

const PLAN_LIMITS = {
  starter: 5,
  basic: 5,
  professional: 25,
  pro: 25,
  enterprise: Infinity,
};

/* =====================================================
   Helpers
===================================================== */

function createLoginEmail(corporateId, employeeId) {
  const safeCorporateId = String(corporateId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const safeEmployeeId = String(employeeId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!safeCorporateId || !safeEmployeeId) {
    throw new Error("LOGIN_IDENTIFIER_MISSING");
  }

  return `${safeCorporateId}.${safeEmployeeId}@auth.sharo.in`;
}

async function authorize(request) {
  const header = request.headers.get("authorization") || "";

  if (!header.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED");
  }

  const idToken = header.slice(7);

  const token = await adminAuth.verifyIdToken(idToken, true);

  const users = await adminDb
    .collection("Usermanagement")
    .where("uid", "==", token.uid)
    .limit(1)
    .get();

  if (users.empty) {
    throw new Error("UNAUTHENTICATED");
  }

  const callerDocument = users.docs[0];

  const caller = {
    id: callerDocument.id,
    ...callerDocument.data(),
    uid: token.uid,
  };

  const companyId = caller.companyId || token.companyId;

  if (!companyId) {
    throw new Error("COMPANY_NOT_FOUND");
  }

  const companyDoc = await adminDb
    .collection("Companies")
    .doc(companyId)
    .get();

  if (!companyDoc.exists) {
    throw new Error("COMPANY_NOT_FOUND");
  }

  const company = {
    id: companyDoc.id,
    ...companyDoc.data(),
  };

  const owner =
    company.ownerUid === token.uid ||
    String(caller.role || "").toLowerCase() === "owner" ||
    String(caller.email || "").toLowerCase() ===
      String(company.ownerEmail || "").toLowerCase();

  if (!owner) {
    const employees = await adminDb
      .collection("Companies")
      .doc(companyId)
      .collection("Usermanagement")
      .where("access.authUid", "==", token.uid)
      .limit(1)
      .get();

    const permissions = employees.empty
      ? []
      : employees.docs[0].data().access?.effectivePermissions || [];

    if (!permissions.includes("employee.manage")) {
      throw new Error("FORBIDDEN");
    }
  }

  return {
    token,
    caller,
    company,
    companyId,
    owner,
  };
}

function responseError(error) {
  const code = error?.message || "UNKNOWN_ERROR";

  const status =
    code === "UNAUTHENTICATED"
      ? 401
      : code === "FORBIDDEN"
        ? 403
        : code === "LIMIT_REACHED"
          ? 409
          : code === "EMAIL_EXISTS"
            ? 409
            : 400;

  return NextResponse.json(
    {
      error: code,
    },
    {
      status,
    },
  );
}

/* =====================================================
   Create Employee Login Account
===================================================== */

export async function POST(request) {
  let createdUid = null;

  try {
    const context = await authorize(request);
    const input = await request.json();

    if (!input.employeeFirestoreId) {
      throw new Error("EMPLOYEE_ID_REQUIRED");
    }

    if (!input.password) {
      throw new Error("PASSWORD_REQUIRED");
    }

    const employeeRef = adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("Usermanagement")
      .doc(input.employeeFirestoreId);

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const employeeData = employeeDoc.data() || {};

    const employeeId = String(
      employeeData.employeeId || employeeData.login?.employeeId || "",
    ).trim();

    const corporateId = String(
      context.company.corporateId || context.company.companyCode || "",
    )
      .trim()
      .toLowerCase();

    if (!employeeId) {
      throw new Error("EMPLOYEE_ID_MISSING");
    }

    if (!corporateId) {
      throw new Error("CORPORATE_ID_MISSING");
    }

    /*
     * This email is used internally by Firebase Authentication.
     * The employee never needs to see or enter it.
     */
    const loginEmail = createLoginEmail(corporateId, employeeId);

    /* =================================================
       Check employee subscription limit
    ================================================= */

    const employees = await adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("Usermanagement")
      .get();

    const activeEmployeeCount = employees.docs.filter((document) => {
      const employee = document.data();

      const employmentStatus = String(
        employee.employment?.status || "active",
      ).toLowerCase();

      return employmentStatus !== "inactive";
    }).length;

    const planName = String(context.company.plan || "").toLowerCase();

    const planLimit =
      PLAN_LIMITS[planName] ??
      (Number(context.company.employeeCount || 0) || Infinity);

    const configuredLimit = Number(
      context.company.employeeLimit ||
        context.company.employeeCount ||
        planLimit,
    );

    const limit =
      planName === "enterprise"
        ? Infinity
        : Math.min(
            configuredLimit || planLimit,
            planLimit || configuredLimit,
          );

    if (activeEmployeeCount > limit) {
      throw new Error("LIMIT_REACHED");
    }

    /* =================================================
       Role and permissions
    ================================================= */

    const roleId = normalizeRoleId(input.roleId);

    const permissions = input.permissions?.length
      ? input.permissions
      : permissionsForRole(roleId);

    const permissionOverrides = input.permissionOverrides || {
      grant: [],
      deny: [],
    };

    /* =================================================
       Normalize phone number
    ================================================= */

    const rawPhoneNumber = String(input.phoneNumber || "").trim();

    const phoneNumber = /^\+[1-9]\d{7,14}$/.test(rawPhoneNumber)
      ? rawPhoneNumber
      : /^\d{10}$/.test(rawPhoneNumber)
        ? `+91${rawPhoneNumber}`
        : undefined;

    /* =================================================
       Prevent duplicate Firebase login
    ================================================= */

    try {
      await adminAuth.getUserByEmail(loginEmail);
      throw new Error("LOGIN_ACCOUNT_ALREADY_EXISTS");
    } catch (error) {
      if (error.message === "LOGIN_ACCOUNT_ALREADY_EXISTS") {
        throw error;
      }

      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    /* =================================================
       Create Firebase Authentication user
    ================================================= */

    const authUser = await adminAuth.createUser({
      email: loginEmail,
      password: input.password,
      displayName:
        input.displayName ||
        employeeData.personalInfo?.fullName ||
        employeeId,
      phoneNumber,
      disabled: false,
    });

    createdUid = authUser.uid;

    /* =================================================
       Set Firebase custom claims
    ================================================= */

    await adminAuth.setCustomUserClaims(authUser.uid, {
      companyId: context.companyId,
      companyEmployeeId: input.employeeFirestoreId,
      roleId,
      permissionsVersion: Date.now(),
    });

    /* =================================================
       Save login and access records
    ================================================= */

    const batch = adminDb.batch();

    const rootUserRef = adminDb
      .collection("Usermanagement")
      .doc(authUser.uid);

    const personalEmail = String(
      employeeData.personalInfo?.email || input.email || "",
    )
      .trim()
      .toLowerCase();

    batch.set(
      rootUserRef,
      {
        uid: authUser.uid,

        companyId: context.companyId,
        companyEmployeeId: input.employeeFirestoreId,

        corporateId,
        employeeId,

        /*
         * Internal Firebase Authentication email.
         */
        loginEmail,

        /*
         * Actual employee communication email.
         */
        email: personalEmail,

        role: roleId,
        status: "active",

        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    batch.set(
      employeeRef,
      {
        access: {
          authUid: authUser.uid,
          loginEnabled: true,
          roleId,
          status: "active",

          requirePasswordChange:
            input.requirePasswordChange !== false,

          policyAccepted: false,

          effectivePermissions: permissions,

          permissionOverrides,
        },

        login: {
          corporateId,
          employeeId,
          loginEmail,

          lastLogin: null,

          temporaryPasswordSet:
            input.requirePasswordChange !== false,
        },

        updatedAt: FieldValue.serverTimestamp(),
      },
      {
        merge: true,
      },
    );

    const activityLogRef = adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("ActivityLogs")
      .doc();

    batch.set(activityLogRef, {
      type: "user.created",

      actorId: context.token.uid,
      targetUserId: authUser.uid,
      targetEmployeeId: input.employeeFirestoreId,

      metadata: {
        roleId,
        employeeId,
        loginEmail,
      },

      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      uid: authUser.uid,
      employeeId,
      loginEmail,
    });
  } catch (error) {
    /*
     * If Firebase Auth user was created but Firestore saving failed,
     * delete the Firebase account to avoid an incomplete account.
     */
    if (createdUid) {
      await adminAuth.deleteUser(createdUid).catch(() => {});
    }

    console.error("RBAC user creation failed:", error);

    return responseError(error);
  }
}

/* =====================================================
   Update Employee Login Account
===================================================== */

export async function PATCH(request) {
  try {
    const context = await authorize(request);
    const input = await request.json();

    if (!input.action) {
      throw new Error("ACTION_REQUIRED");
    }

    const protectedActions = [
      "disable",
      "lock",
      "delete",
      "revoke",
    ];

    if (
      input.targetUid === context.company.ownerUid &&
      protectedActions.includes(input.action)
    ) {
      throw new Error("OWNER_PROTECTED");
    }

    if (
      input.targetUid === context.token.uid &&
      ["disable", "lock", "delete"].includes(input.action)
    ) {
      throw new Error("SELF_PROTECTED");
    }

    if (
      input.action !== "reset-password" &&
      !input.targetUid
    ) {
      throw new Error("TARGET_UID_REQUIRED");
    }

    /* =================================================
       Firebase Authentication actions
    ================================================= */

    if (input.action === "revoke") {
      await adminAuth.revokeRefreshTokens(input.targetUid);
    }

    if (["disable", "lock"].includes(input.action)) {
      await adminAuth.updateUser(input.targetUid, {
        disabled: true,
      });
    
      await adminAuth.revokeRefreshTokens(input.targetUid);
    }

    if (input.action === "unlock") {
      await adminAuth.updateUser(input.targetUid, {
        disabled: false,
      });
    }

    if (input.action === "delete") {
      await adminAuth.deleteUser(input.targetUid);
    }

    /*
     * Generate password reset link using the Firebase account's
     * internal login email instead of the personal email.
     */
    if (input.action === "reset-password") {
      let loginEmail = String(input.loginEmail || "").trim();

      if (!loginEmail && input.targetUid) {
        const authUser = await adminAuth.getUser(input.targetUid);
        loginEmail = authUser.email || "";
      }

      if (!loginEmail) {
        throw new Error("LOGIN_EMAIL_REQUIRED");
      }

      const resetLink =
        await adminAuth.generatePasswordResetLink(loginEmail);

      return NextResponse.json({
        success: true,
        resetLink,
      });
    }

    if (input.action === "role") {
      const roleId = normalizeRoleId(input.roleId);

      await adminAuth.setCustomUserClaims(input.targetUid, {
        companyId: context.companyId,
        companyEmployeeId: input.employeeFirestoreId,
        roleId,
        permissionsVersion: Date.now(),
      });
    }

    /* =================================================
       Update employee Firestore document
    ================================================= */

    if (input.employeeFirestoreId) {
      const employeeRef = adminDb
        .collection("Companies")
        .doc(context.companyId)
        .collection("Usermanagement")
        .doc(input.employeeFirestoreId);

      const updates = {
        "access.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (["disable", "lock"].includes(input.action)) {
        updates["access.status"] =
          input.action === "lock" ? "locked" : "inactive";
      }

      if (input.action === "unlock") {
        updates["access.status"] = "active";
        updates["access.loginEnabled"] = true;
      }

      if (input.action === "delete") {
        updates["access.status"] = "inactive";
        updates["access.loginEnabled"] = false;
        updates["access.authUid"] = null;
      }

      if (input.action === "role") {
        const roleId = normalizeRoleId(input.roleId);

        updates["access.roleId"] = roleId;

        updates["access.effectivePermissions"] =
          input.permissions || permissionsForRole(roleId);

        updates["access.permissionOverrides"] =
          input.permissionOverrides || {
            grant: [],
            deny: [],
          };
      }

      if (input.action === "expire-password") {
        updates["access.requirePasswordChange"] = true;
        updates["login.temporaryPasswordSet"] = true;
      }

      await employeeRef.update(updates);
    }

    /* =================================================
       Activity log
    ================================================= */

    await adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("ActivityLogs")
      .add({
        type: `user.${input.action}`,

        actorId: context.token.uid,
        targetUserId: input.targetUid || null,
        targetEmployeeId:
          input.employeeFirestoreId || null,

        metadata: input.metadata || {},

        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("RBAC user action failed:", error);

    return responseError(error);
  }
}