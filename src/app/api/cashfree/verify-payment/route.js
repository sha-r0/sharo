import { NextResponse } from "next/server";
import { Cashfree, CFEnvironment } from "cashfree-pg";

// Configure SDK
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
          message: "Order ID missing",
        },
        { status: 400 }
      );
    }

    // Fetch all payments for this order
    const response = await Cashfree.PGOrderFetchPayments(
      "2025-01-01",
      orderId
    );

    const payments = response.data || [];

    if (payments.length === 0) {
      return NextResponse.json({
        success: false,
        message: "Payment not found",
      });
    }

    // Find successful payment
    const successPayment = payments.find(
      (payment) => payment.payment_status === "SUCCESS"
    );

    if (!successPayment) {
      return NextResponse.json({
        success: false,
        message: "Payment not completed",
      });
    }

    /*
    ====================================================

    NEXT STEP

    Create Company

    await createCompany(...)

    ====================================================
    */

    return NextResponse.json({
      success: true,
      paymentStatus: successPayment.payment_status,
      orderId: successPayment.order_id,
      cfPaymentId: successPayment.cf_payment_id,
      amount: successPayment.payment_amount,
      message: "Payment Verified",
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