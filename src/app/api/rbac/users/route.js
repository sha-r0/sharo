import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_LEVELS,
  calculateEffectivePermissions,
  permissionsForRole,
  normalizeRoleId,
} from "@/app/allservice/rbac/permissionCatalog";
import { buildEmployeeLoginEmail, resolveEmployeeAuthUid, resolveEmployeeRoleId, resolvePermissionOverrides } from "@/app/allservice/rbac/employeeAuth";

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

const validPermissions = (values) => [...new Set((Array.isArray(values) ? values : []).filter((value) => ALL_PERMISSIONS.includes(value)))];

async function loadRole(companyId, roleId) {
  const normalized = normalizeRoleId(roleId);
  const snap = await adminDb.collection("Companies").doc(companyId).collection("Roles").doc(normalized).get();
  const data = snap.exists ? snap.data() : null;
  const permissions = data?.permissions || permissionsForRole(normalized);
  if (!data && !permissions.length) throw new Error("ROLE_NOT_FOUND");
  return { id: normalized, ...(data || {}), level: Number(data?.level ?? DEFAULT_ROLE_LEVELS[normalized] ?? 10), permissions: validPermissions(permissions) };
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

  let callerEmployee = null;
  let callerPermissions = owner ? ALL_PERMISSIONS : [];
  let callerRole = owner ? { id: "owner", level: 100 } : null;
  if (!owner) {
    let employees = await adminDb
      .collection("Companies")
      .doc(companyId)
      .collection("Usermanagement")
      .where("access.authUid", "==", token.uid)
      .limit(1)
      .get();
    if (employees.empty) employees = await adminDb.collection("Companies").doc(companyId).collection("Usermanagement").where("authUid", "==", token.uid).limit(1).get();
    if (employees.empty) throw new Error("FORBIDDEN");
    callerEmployee = { id: employees.docs[0].id, ...employees.docs[0].data() };
    if (callerEmployee.access?.loginEnabled === false || String(callerEmployee.access?.status || callerEmployee.status || callerEmployee.employment?.status || "active").toLowerCase() !== "active") throw new Error("FORBIDDEN");
    callerRole = await loadRole(companyId, resolveEmployeeRoleId(callerEmployee, caller));
    const overrides = resolvePermissionOverrides(callerEmployee);
    callerPermissions = calculateEffectivePermissions({ rolePermissions: callerRole.permissions, grantedPermissions: overrides.grant, deniedPermissions: overrides.deny });
  }

  if (String(company.serviceStatus || "active").toLowerCase() !== "active") throw new Error("COMPANY_INACTIVE");

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

function requirePermission(context, permission) { if (!context.owner && !context.callerPermissions.includes(permission)) throw new Error("FORBIDDEN"); }

function validateTarget(context, target, targetRole) {
  if (targetRole.id === "owner") throw new Error("OWNER_PROTECTED");
  if (!context.owner && targetRole.level >= context.callerRole.level) throw new Error("ROLE_HIERARCHY_VIOLATION");
  if (context.callerRole.id === "team_leader") {
    const actorTeam = context.callerEmployee?.reporting?.teamId || context.callerEmployee?.employment?.teamId;
    const targetTeam = target?.reporting?.teamId || target?.employment?.teamId;
    if (!actorTeam || actorTeam !== targetTeam) throw new Error("TEAM_BOUNDARY_VIOLATION");
  }
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
    requirePermission(context, "employee.create");
    requirePermission(context, "employee.manage");

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
    const loginEmail = buildEmployeeLoginEmail(corporateId, employeeId);

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

    const roleId = normalizeRoleId(employeeData.access?.roleId || employeeData.roleId || employeeData.employment?.role);
    const role = await loadRole(context.companyId, roleId);
    validateTarget(context, employeeData, role);
    const requestedOverrides = resolvePermissionOverrides(employeeData);
    const grant = validPermissions(requestedOverrides.grant);
    const deny = validPermissions(requestedOverrides.deny);
    if (!context.owner && grant.some((permission) => !context.callerPermissions.includes(permission))) throw new Error("PERMISSION_ESCALATION");
    if (context.callerRole.id === "team_leader" && grant.some((permission) => permission.endsWith(".manage"))) throw new Error("PERMISSION_ESCALATION");
    const permissionOverrides = { grant, deny };
    const permissions = calculateEffectivePermissions({ rolePermissions: role.permissions, grantedPermissions: grant, deniedPermissions: deny });

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
      type: "employee.account-created",

      actorId: context.token.uid,
      targetUserId: authUser.uid,
      targetEmployeeId: input.employeeFirestoreId,

      metadata: {
        roleId,
        employeeId,
        permissionCount: permissions.length,
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

    requirePermission(context, input.action === "role" ? "employee.manage" : "employee.manage");

    let employeeRef = null;
    let employeeData = null;
    if (input.employeeFirestoreId) {
      employeeRef = adminDb.collection("Companies").doc(context.companyId).collection("Usermanagement").doc(input.employeeFirestoreId);
      const targetSnap = await employeeRef.get();
      if (!targetSnap.exists) throw new Error("EMPLOYEE_NOT_FOUND");
      employeeData = targetSnap.data() || {};
      const currentTargetRole = await loadRole(context.companyId, resolveEmployeeRoleId(employeeData));
      validateTarget(context, employeeData, currentTargetRole);
      const storedUid = resolveEmployeeAuthUid(employeeData);
      if (input.targetUid && storedUid && input.targetUid !== storedUid) throw new Error("TARGET_MISMATCH");
      input.targetUid = storedUid || input.targetUid;
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
      !["reset-password", "enable", "role"].includes(input.action) &&
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

    if (input.action === "enable") {
      if (!input.targetUid) throw new Error("TARGET_UID_REQUIRED");
      await adminAuth.updateUser(input.targetUid, { disabled: false });
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
      const role = await loadRole(context.companyId, roleId);
      validateTarget(context, employeeData, role);

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
      const updates = {
        "access.updatedAt": FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (["disable", "lock"].includes(input.action)) {
        updates["access.status"] =
          input.action === "lock" ? "locked" : "inactive";
        updates["access.loginEnabled"] = false;
      }

      if (["unlock", "enable"].includes(input.action)) {
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
        const role = await loadRole(context.companyId, roleId);
        const requested = input.permissionOverrides || resolvePermissionOverrides(employeeData);
        const grant = validPermissions(requested.grant);
        const deny = validPermissions(requested.deny);
        if (!context.owner && grant.some((permission) => !context.callerPermissions.includes(permission))) throw new Error("PERMISSION_ESCALATION");
        if (context.callerRole.id === "team_leader" && grant.some((permission) => permission.endsWith(".manage"))) throw new Error("PERMISSION_ESCALATION");

        updates["access.roleId"] = roleId;

        updates["access.effectivePermissions"] = calculateEffectivePermissions({ rolePermissions: role.permissions, grantedPermissions: grant, deniedPermissions: deny });

        updates["access.permissionOverrides"] = { grant, deny };
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
        type: input.action === "role" ? "employee.role-changed" : `employee.account-${input.action === "disable" ? "disabled" : input.action === "enable" || input.action === "unlock" ? "enabled" : input.action}`,

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
