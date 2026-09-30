import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { findSignupResume } from "@/lib/server/signupResumeService";

export async function POST(req) {
  try {
    const {
      companyEmail,
      adminEmail,
      corporateId,
      password,
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

    const pending = await findSignupResume({ adminEmail, password });
    if (pending) return NextResponse.json(pending.response, { headers: { "Cache-Control": "no-store" } });

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

    return NextResponse.json({
      success: true,
    });

  } catch (error) {

    console.error("VALIDATE API ERROR");
    console.error(error);
  
    return NextResponse.json(
      {
        success: false,
        message: "Unable to validate signup. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}