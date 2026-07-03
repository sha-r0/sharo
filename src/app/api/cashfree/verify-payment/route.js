import { NextResponse } from "next/server";
import { Cashfree, CFEnvironment } from "cashfree-pg";
import { completeRegistration } from "@/lib/server/registrationService";

// Cashfree Configuration
Cashfree.XClientId = process.env.CASHFREE_CLIENT_ID;
Cashfree.XClientSecret = process.env.CASHFREE_CLIENT_SECRET;

Cashfree.XEnvironment =
  process.env.CASHFREE_ENV === "PRODUCTION"
    ? CFEnvironment.PRODUCTION
    : CFEnvironment.SANDBOX;

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
    // Verify Payment from Cashfree
    // =====================================

    const response = await Cashfree.PGOrderFetchPayments(
      "2025-01-01",
      orderId
    );

    const payments = response.data || [];

    if (payments.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Payment not found.",
      });
    }

    const payment = payments.find(
      (item) => item.payment_status === "SUCCESS"
    );

    if (!payment) {
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
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    
      paymentStatus: payment.payment_status,
    
      orderId: payment.order_id,
    
      cfPaymentId: payment.cf_payment_id,
    
      amount: payment.payment_amount,
    
      companyId: registration.companyId,
    
      uid: registration.uid,
    
      customToken: registration.customToken,
    
      message: "Registration completed successfully.",
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          "Verification Failed",
      },
      {
        status: 500,
      }
    );

  }
}