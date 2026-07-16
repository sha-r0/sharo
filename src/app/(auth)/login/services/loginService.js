"use client";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut,
} from "firebase/auth";

import {
  collection,
  query,
  where,
  getDocs,
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

    const userSnap = await getDocs(

      query(

        collection(db, "Usermanagement"),

        where("uid", "==", uid)

      )

    );

    if (userSnap.empty) {

      await signOut(auth);

      return {

        success: false,

        message:
          "User record not found.",

      };

    }

    const user = {

      id: userSnap.docs[0].id,

      ...userSnap.docs[0].data(),

    };

    // ==========================================
    // Load Company
    // ==========================================

    const companySnap = await getDoc(

      doc(

        db,

        "Companies",

        user.companyId

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

    const token = await credential.user.getIdTokenResult(true);
    const companyEmployeeId = token.claims.companyEmployeeId || user.companyEmployeeId;
    let employee = null;
    if (companyEmployeeId) {
      const employeeSnap = await getDoc(doc(db, "Companies", user.companyId, "Usermanagement", companyEmployeeId));
      if (employeeSnap.exists()) employee = { id: employeeSnap.id, ...employeeSnap.data() };
    }
    const roleId = employee?.access?.roleId || token.claims.roleId || user.role || "employee";
    const roleSnap = await getDoc(doc(db, "Companies", user.companyId, "Roles", String(roleId).toLowerCase().replace(/[^a-z0-9]+/g, "_")));
    const access = resolveAccess({ currentUser: { ...user, uid }, employee, company, role: roleSnap.exists() ? roleSnap.data() : null });

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
