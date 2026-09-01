"use client";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { defaultRouteForAccess, resolveAccess } from "@/app/allservice/rbac/AuthorizationService";

/* ==========================================================
   Login
========================================================== */

export async function login({
  companyId,
  email,
  password,
  rememberMe = true,
}) {

  try {

    // ==========================================
    // Remember Me
    // ==========================================

    await setPersistence(
      auth,
      rememberMe
        ? browserLocalPersistence
        : browserSessionPersistence
    );

    // ==========================================
    // Firebase Login
    // ==========================================

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

    const uid = credential.user.uid;

    // ==========================================
    // Load User
    // ==========================================

    const idToken = await credential.user.getIdToken();
    const identityResponse = await fetch("/api/rbac/session", {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (!identityResponse.ok) {

      await signOut(auth);

      return {

        success: false,

        message:
          "User record not found.",

      };

    }

    const identity = await identityResponse.json();

    // ==========================================
    // Load Company
    // ==========================================

    const companySnap = await getDoc(

      doc(

        db,

        "Companies",

        identity.companyId

      )

    );

    if (!companySnap.exists()) {

      await signOut(auth);

      return {

        success: false,

        message:
          "Company not found.",

      };

    }

    const company = {

      id: companySnap.id,

      ...companySnap.data(),

    };

    if (identity.isOwner && company.ownerUid !== uid) {
      await signOut(auth);
      return { success: false, message: "Company owner could not be verified." };
    }

    let user;
    if (identity.isOwner) {
      user = {
        id: uid,
        uid,
        companyId: identity.companyId,
        name: company.ownerName || credential.user.displayName || "Owner",
        email: company.ownerEmail || credential.user.email || null,
        phone: company.ownerPhone || null,
        role: "owner",
        accountType: "owner",
      };
    } else {
      const userSnap = await getDoc(doc(db, "Usermanagement", identity.rootUserId));
      if (!userSnap.exists() || userSnap.data()?.uid !== uid) {
        await signOut(auth);
        return { success: false, message: "User record not found." };
      }
      user = { id: userSnap.id, ...userSnap.data() };
    }

    const token = await credential.user.getIdTokenResult(true);
    const companyEmployeeId = identity.companyEmployeeId || token.claims.companyEmployeeId || user.companyEmployeeId;
    let employee = null;
    if (companyEmployeeId) {
      const employeeSnap = await getDoc(doc(db, "Companies", identity.companyId, "Usermanagement", companyEmployeeId));
      if (employeeSnap.exists()) employee = { id: employeeSnap.id, ...employeeSnap.data() };
    }
    const roleId = employee?.access?.roleId || token.claims.roleId || user.role || "employee";
    const roleSnap = identity.isOwner
      ? null
      : await getDoc(doc(db, "Companies", identity.companyId, "Roles", String(roleId).toLowerCase().replace(/[^a-z0-9]+/g, "_")));
    const access = resolveAccess({ currentUser: { ...user, uid }, employee, company, role: roleSnap?.exists() ? roleSnap.data() : null });

    if (!access.isOwner && !employee) {
      await signOut(auth);
      return { success: false, message: "Your employee login is not linked to this company. Contact the Company Owner." };
    }
    if (!access.loginEnabled || ["inactive", "suspended", "locked", "pending"].includes(String(access.status).toLowerCase())) {
      await signOut(auth);
      return { success: false, message: `This account is ${access.status}. Contact the Company Owner.` };
    }

    // ==========================================
    // Validate Company Code
    // ==========================================

    if (

      companyId.trim().toLowerCase() !==
      company.companyCode.toLowerCase()

    ) {

      await signOut(auth);

      return {

        success: false,

        message:
          "Invalid Company ID.",

      };

    }

    // ==========================================
    // Success
    // ==========================================

    return {

      success: true,

      user,

      company,
      access,

      redirectTo:
        company.workspaceCompleted
          ? defaultRouteForAccess(access)
          : "/workspace-creating",

    };

  }

  catch (error) {

    console.error(error);

    let message =
      "Unable to login.";

    switch (error.code) {

      case "auth/user-not-found":

      case "auth/invalid-credential":

      case "auth/wrong-password":

        message =
          "Invalid email or password.";

        break;

      case "auth/invalid-email":

        message =
          "Invalid email address.";

        break;

      case "auth/too-many-requests":

        message =
          "Too many attempts. Please try again later.";

        break;

      case "auth/network-request-failed":

        message =
          "Network connection lost.";

        break;

      default:

        message =
          error.message;

    }

    return {

      success: false,

      message,

    };

  }

}

export async function loginEmployee({ corporateId, employeeId, password, rememberMe = true }) {
  try {
    const resolution = await fetch("/api/rbac/login/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corporateId: corporateId.trim(), employeeId: employeeId.trim() }),
    });
    const resolved = await resolution.json();
    if (!resolution.ok) {
      const messages = { COMPANY_INACTIVE: "Your company account is currently inactive.", LOGIN_DISABLED: "Your login access is disabled. Contact your administrator.", EMPLOYEE_ID_AMBIGUOUS: "Employee ID configuration is ambiguous. Contact your administrator." };
      return { success: false, message: messages[resolved.error] || "Invalid Corporate ID, Employee ID or password." };
    }
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    const credential = await signInWithEmailAndPassword(auth, resolved.loginEmail, password);
    if (!resolved.expectedAuthUid || credential.user.uid !== resolved.expectedAuthUid) {
      const token = await credential.user.getIdToken();
      await fetch("/api/rbac/login/audit", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(resolved) }).catch(() => {});
      await signOut(auth);
      return { success: false, message: "Invalid Corporate ID, Employee ID or password." };
    }
    const token = await credential.user.getIdToken(true);
    const audit = await fetch("/api/rbac/login/audit", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(resolved) });
    if (!audit.ok) { await signOut(auth); return { success: false, message: "Invalid Corporate ID, Employee ID or password." }; }
    await credential.user.getIdToken(true);
    return { success: true, redirectTo: "/manager" };
  } catch (error) {
    if (auth.currentUser) await signOut(auth).catch(() => {});
    const message = error.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : error.code === "auth/network-request-failed" ? "Network connection lost." : "Invalid Corporate ID, Employee ID or password.";
    return { success: false, message };
  }
}
