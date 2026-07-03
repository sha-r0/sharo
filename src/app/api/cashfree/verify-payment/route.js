import { NextResponse } from "next/server";
import { completeRegistration } from "@/lib/server/registrationService";

export async function POST(req) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "Order ID missing.",
        },
        { status: 400 }
      );
    }

    // =====================================
    // Verify Payment from Cashfree REST API
    // =====================================

    const CASHFREE_URL =
      process.env.CASHFREE_ENV === "PRODUCTION"
        ? `https://api.cashfree.com/pg/orders/${orderId}`
        : `https://sandbox.cashfree.com/pg/orders/${orderId}`;

    const cashfreeResponse = await fetch(CASHFREE_URL, {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-client-id": process.env.CASHFREE_CLIENT_ID,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
        "x-api-version": "2023-08-01",
      },
      cache: "no-store",
    });

    const order = await cashfreeResponse.json();

    if (!cashfreeResponse.ok) {
      console.error("Cashfree Error:", order);

      return NextResponse.json(
        {
          success: false,
          message: order.message || "Unable to verify payment.",
        },
        { status: cashfreeResponse.status }
      );
    }

    // =====================================
    // Check Payment Status
    // =====================================

    if (order.order_status !== "PAID") {
      return NextResponse.json({
        success: false,
        message: "Payment not completed.",
      });
    }

    // =====================================
    // Complete Registration
    // =====================================

    const registration = await completeRegistration(orderId);

    if (!registration.success) {
      return NextResponse.json(
        {
          success: false,
          message: registration.message,
        },
        { status: 500 }
      );
    }

    // =====================================
    // Success
    // =====================================

    return NextResponse.json({
      success: true,

      paymentStatus: order.order_status,

      orderId: order.order_id,

      cfOrderId: order.cf_order_id,

      amount: order.order_amount,

      companyId: registration.companyId,

      uid: registration.uid,

      customToken: registration.customToken,

      message: "Registration completed successfully.",
    });

  } catch (error) {

    console.error("VERIFY PAYMENT ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message || "Verification Failed",
      },
      { status: 500 }
    );
  }
}