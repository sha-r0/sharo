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

      redirectTo:
        company.workspaceCompleted
          ? "/manager"
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