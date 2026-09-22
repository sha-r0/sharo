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
import { buildEmployeeLoginEmail, canonicalEmployeeId, resolveEmployeeAuthUid, resolveEmployeeRoleId, resolvePermissionOverrides } from "@/app/allservice/rbac/employeeAuth";
import { authorizeCompanyRequest } from "@/lib/server/authorizeCompanyRequest";
import { mergeEmployeeStatutory } from "@/app/allservice/employee/employeeStatutory";

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
  const authorized = await authorizeCompanyRequest(request);
  const { token, companyId } = authorized;
  const company = { id: companyId, ...authorized.company };
  const owner = authorized.isOwner;
  const caller = owner
    ? { id: token.uid, uid: token.uid, companyId, role: "owner" }
    : { ...authorized.employee, uid: token.uid, companyId };

  let callerEmployee = null;
  let callerPermissions = owner ? ALL_PERMISSIONS : [];
  let callerRole = owner ? { id: "owner", level: 100 } : null;
  if (!owner) {
    callerEmployee = authorized.employee;
    callerRole = await loadRole(companyId, resolveEmployeeRoleId(callerEmployee, caller));
    callerPermissions = authorized.permissions;
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

function requiredText(value, code) {
  const text = String(value || "").trim();
  if (!text) throw new Error(code);
  return text;
}

function employeeProfileUpdates(profile, existing, isCreate = false) {
  const firstName = requiredText(profile?.personalInfo?.firstName, "FIRST_NAME_REQUIRED");
  const lastName = requiredText(profile?.personalInfo?.lastName, "LAST_NAME_REQUIRED");
  const email = requiredText(profile?.personalInfo?.email, "EMAIL_REQUIRED").toLowerCase();
  const phone = requiredText(profile?.personalInfo?.phone, "PHONE_REQUIRED");
  const department = requiredText(profile?.employment?.department, "DEPARTMENT_REQUIRED");
  const designation = requiredText(profile?.employment?.designation, "DESIGNATION_REQUIRED");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("EMAIL_INVALID");
  if (!/^[6-9]\d{9}$/.test(phone)) throw new Error("PHONE_INVALID");

  const employment = {
    ...(profile.employment || {}),
    department,
    designation,
    status: existing.employment?.status || "Active",
  };

  return {
    personalInfo: {
      ...(profile.personalInfo || {}),
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      email,
      phone,
    },
    employment,
    reporting: profile.reporting || {},
    ...mergeEmployeeStatutory(profile, isCreate ? null : existing),
    bankDetails: profile.bankDetails || {},
    address: profile.address || {},
    documents: profile.documents || {},
    search: {
      fullName: `${firstName} ${lastName}`.trim().toLowerCase(),
      email,
      phone,
      department: department.toLowerCase(),
      designation: designation.toLowerCase(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/* =====================================================
   Update Employee Profile
===================================================== */

export async function PUT(request) {
  try {
    const context = await authorize(request);
    const input = await request.json();
    requirePermission(context, "employee.edit");

    const employeeFirestoreId = requiredText(input.employeeFirestoreId, "EMPLOYEE_ID_REQUIRED");
    const employeeRef = adminDb.collection("Companies").doc(context.companyId).collection("Usermanagement").doc(employeeFirestoreId);
    const targetSnapshot = await employeeRef.get();
    if (!targetSnapshot.exists) throw new Error("EMPLOYEE_NOT_FOUND");

    const existing = targetSnapshot.data() || {};
    const currentRole = await loadRole(context.companyId, resolveEmployeeRoleId(existing));
    validateTarget(context, existing, currentRole);

    const updates = employeeProfileUpdates(input.profile, existing);
    const duplicateEmail = await employeeRef.parent.where("personalInfo.email", "==", updates.personalInfo.email).get();
    if (duplicateEmail.docs.some((document) => document.id !== employeeFirestoreId)) throw new Error("EMAIL_EXISTS");
    const duplicatePhone = await employeeRef.parent.where("personalInfo.phone", "==", updates.personalInfo.phone).get();
    if (duplicatePhone.docs.some((document) => document.id !== employeeFirestoreId)) throw new Error("PHONE_EXISTS");
    const requestedAccess = input.access || {};
    const requestedRoleId = normalizeRoleId(requestedAccess.roleId || currentRole.id);
    const requestedLoginEnabled = requestedAccess.loginEnabled !== false;
    const currentLoginEnabled = existing.access?.loginEnabled !== false;
    const requestedOverrides = {
      grant: validPermissions(requestedAccess.permissionOverrides?.grant),
      deny: validPermissions(requestedAccess.permissionOverrides?.deny),
    };
    const currentOverrides = resolvePermissionOverrides(existing);
    const accessChanged = requestedRoleId !== currentRole.id
      || requestedLoginEnabled !== currentLoginEnabled
      || JSON.stringify(requestedOverrides) !== JSON.stringify(currentOverrides);

    const authUid = resolveEmployeeAuthUid(existing);
    if (accessChanged) {
      requirePermission(context, "employee.manage");
      const requestedRole = await loadRole(context.companyId, requestedRoleId);
      validateTarget(context, existing, requestedRole);
      if (!context.owner && requestedOverrides.grant.some((permission) => !context.callerPermissions.includes(permission))) throw new Error("PERMISSION_ESCALATION");
      if (context.callerRole.id === "team_leader" && requestedOverrides.grant.some((permission) => permission.endsWith(".manage"))) throw new Error("PERMISSION_ESCALATION");
      const effectivePermissions = calculateEffectivePermissions({
        rolePermissions: requestedRole.permissions,
        grantedPermissions: requestedOverrides.grant,
        deniedPermissions: requestedOverrides.deny,
      });
      updates["access.roleId"] = requestedRoleId;
      updates["access.permissionOverrides"] = requestedOverrides;
      updates["access.effectivePermissions"] = effectivePermissions;
      updates["access.loginEnabled"] = requestedLoginEnabled;
      updates["access.status"] = requestedLoginEnabled ? "active" : "inactive";

      if (authUid) {
        await adminAuth.updateUser(authUid, { disabled: !requestedLoginEnabled });
        await adminAuth.setCustomUserClaims(authUid, {
          companyId: context.companyId,
          companyEmployeeId: employeeFirestoreId,
          roleId: requestedRoleId,
          permissionsVersion: Date.now(),
        });
        if (!requestedLoginEnabled) await adminAuth.revokeRefreshTokens(authUid);
      }
    }

    const logRef = adminDb.collection("Companies").doc(context.companyId).collection("ActivityLogs").doc();
    const batch = adminDb.batch();
    batch.update(employeeRef, updates);
    batch.set(logRef, {
      type: "employee.profile-updated",
      actorId: context.token.uid,
      targetUserId: authUid || null,
      targetEmployeeId: employeeFirestoreId,
      metadata: { accessChanged },
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Employee profile update failed:", error);
    return responseError(error);
  }
}

/* =====================================================
   Create Employee Login Account
===================================================== */

export async function POST(request) {
  let createdUid = null;
  let createdEmployeeRef = null;

  try {
    const context = await authorize(request);
    const input = await request.json();

    if (!input.employeeFirestoreId) {
      throw new Error("EMPLOYEE_ID_REQUIRED");
    }

    if (input.loginEnabled !== false && !input.password) {
      throw new Error("PASSWORD_REQUIRED");
    }

    const employeeRef = adminDb
      .collection("Companies")
      .doc(context.companyId)
      .collection("Usermanagement")
      .doc(input.employeeFirestoreId);

    if (input.profile) {
      requirePermission(context, "employee.create");
      requirePermission(context, "employee.manage");

      const existingRequest = await employeeRef.get();
      if (existingRequest.exists) {
        const existingData = existingRequest.data() || {};
        if (existingData.createdBy !== context.token.uid) throw new Error("EMPLOYEE_REQUEST_CONFLICT");
        return NextResponse.json({
          success: true,
          employeeId: existingData.employeeId,
          employeeFirestoreId: employeeRef.id,
          idempotent: true,
        });
      }

      const employeesSnapshot = await employeeRef.parent.get();
      const activeEmployeeCount = employeesSnapshot.docs.filter((document) => String(document.data().employment?.status || "active").toLowerCase() !== "inactive").length;
      const planName = String(context.company.plan || "").toLowerCase();
      const planLimit = PLAN_LIMITS[planName] ?? (Number(context.company.employeeCount || 0) || Infinity);
      const configuredLimit = Number(context.company.employeeLimit || context.company.employeeCount || planLimit);
      const employeeLimit = planName === "enterprise" ? Infinity : Math.min(configuredLimit || planLimit, planLimit || configuredLimit);
      if (activeEmployeeCount >= employeeLimit) throw new Error("LIMIT_REACHED");

      const profileEmail = String(input.profile.personalInfo?.email || "").trim().toLowerCase();
      const profilePhone = String(input.profile.personalInfo?.phone || "").trim();
      if (employeesSnapshot.docs.some((document) => String(document.data().personalInfo?.email || "").trim().toLowerCase() === profileEmail)) throw new Error("EMAIL_EXISTS");
      if (employeesSnapshot.docs.some((document) => String(document.data().personalInfo?.phone || "").trim() === profilePhone)) throw new Error("PHONE_EXISTS");

      const usedEmployeeIds = new Set(employeesSnapshot.docs.map((document) => {
        const raw = String(document.data().employeeId || document.data().login?.employeeId || "").trim();
        return canonicalEmployeeId(raw);
      }).filter(Boolean));
      const roleId = normalizeRoleId(input.access?.roleId || input.profile.employment?.role || "employee");
      const role = await loadRole(context.companyId, roleId);
      validateTarget(context, input.profile, role);
      const requestedOverrides = {
        grant: validPermissions(input.access?.permissionOverrides?.grant),
        deny: validPermissions(input.access?.permissionOverrides?.deny),
      };
      if (!context.owner && requestedOverrides.grant.some((permission) => !context.callerPermissions.includes(permission))) throw new Error("PERMISSION_ESCALATION");
      const effectivePermissions = calculateEffectivePermissions({ rolePermissions: role.permissions, grantedPermissions: requestedOverrides.grant, deniedPermissions: requestedOverrides.deny });
      const companyRef = adminDb.collection("Companies").doc(context.companyId);

      await adminDb.runTransaction(async (transaction) => {
        const companySnapshot = await transaction.get(companyRef);
        if (!companySnapshot.exists) throw new Error("COMPANY_NOT_FOUND");
        let nextEmployeeNumber = Number(companySnapshot.data().nextEmployeeNumber || 1);
        while (usedEmployeeIds.has(String(nextEmployeeNumber))) nextEmployeeNumber += 1;
        const employeeId = String(nextEmployeeNumber).padStart(8, "0");
        const profile = employeeProfileUpdates(input.profile, {}, true);
        transaction.create(employeeRef, {
          ...profile,
          employeeId,
          companyId: context.companyId,
          firestoreId: input.employeeFirestoreId,
          createdBy: context.token.uid,
          employment: { ...profile.employment, roleId },
          login: { employeeId, temporaryPasswordSet: false, lastLogin: null },
          access: {
            authUid: null,
            loginEnabled: false,
            roleId,
            status: "active",
            requirePasswordChange: input.requirePasswordChange !== false,
            policyAccepted: false,
            effectivePermissions,
            permissionOverrides: requestedOverrides,
          },
          createdAt: FieldValue.serverTimestamp(),
        });
        transaction.update(companyRef, { nextEmployeeNumber: nextEmployeeNumber + 1 });
      });
      createdEmployeeRef = employeeRef;
    }

    const employeeDoc = await employeeRef.get();

    if (!employeeDoc.exists) {
      throw new Error("EMPLOYEE_NOT_FOUND");
    }

    const employeeData = employeeDoc.data() || {};
    if (input.loginEnabled === false) {
      return NextResponse.json({ success: true, employeeId: employeeData.employeeId, employeeFirestoreId: employeeRef.id });
    }
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
    if (createdEmployeeRef) {
      await createdEmployeeRef.delete().catch(() => {});
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
      "deactivate",
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
      ["disable", "deactivate", "lock", "delete"].includes(input.action)
    ) {
      throw new Error("SELF_PROTECTED");
    }

    if (
      !["reset-password", "enable", "role", "deactivate"].includes(input.action) &&
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

    if (["disable", "deactivate", "lock"].includes(input.action) && input.targetUid) {
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

      if (["disable", "deactivate", "lock"].includes(input.action)) {
        updates["access.status"] =
          input.action === "lock" ? "locked" : "inactive";
        updates["access.loginEnabled"] = false;
        if (input.action === "deactivate") updates["employment.status"] = "Inactive";
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
        type: input.action === "role" ? "employee.role-changed" : input.action === "deactivate" ? "employee.deactivated" : `employee.account-${input.action === "disable" ? "disabled" : input.action === "enable" || input.action === "unlock" ? "enabled" : input.action}`,

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
