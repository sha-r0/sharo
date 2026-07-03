import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export async function POST(req) {
  try {
    const {
      companyEmail,
      adminEmail,
      corporateId,
    } = await req.json();

    if (!companyEmail || !adminEmail || !corporateId) {
      return NextResponse.json(
        {
          success: false,
          message: "Required fields missing.",
        },
        { status: 400 }
      );
    }

    // -----------------------------
    // Check Firebase Auth
    // -----------------------------
    try {
      await adminAuth.getUserByEmail(adminEmail);

      return NextResponse.json({
        success: false,
        message: "Admin email is already registered.",
      });

    } catch (error) {
      if (error.code !== "auth/user-not-found") {
        throw error;
      }
    }

    // -----------------------------
    // Check Company Email
    // -----------------------------
    const companyEmailSnap = await adminDb
      .collection("Companies")
      .where("companyEmail", "==", companyEmail)
      .limit(1)
      .get();

    if (!companyEmailSnap.empty) {
      return NextResponse.json({
        success: false,
        message: "Company email already exists.",
      });
    }

    // -----------------------------
    // Check Corporate ID
    // -----------------------------
    const corporateSnap = await adminDb
      .collection("Companies")
      .where("corporateId", "==", corporateId)
      .limit(1)
      .get();

    if (!corporateSnap.empty) {
      return NextResponse.json({
        success: false,
        message: "Corporate ID already exists.",
      });
    }

    // -----------------------------
    // Check Pending Registration
    // -----------------------------
    const pendingSnap = await adminDb
      .collection("PendingRegistrations")
      .where("admin.adminEmail", "==", adminEmail)
      .limit(1)
      .get();

    if (!pendingSnap.empty) {
      return NextResponse.json({
        success: false,
        message:
          "A pending registration already exists for this email.",
      });
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    console.error("VALIDATE API ERROR");
    console.error(error);
  
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        code: error.code,
      },
      {
        status: 500,
      }
    );
  }
}