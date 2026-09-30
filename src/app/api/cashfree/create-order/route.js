import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

import { savePendingRegistration, validatePendingRegistration } from "@/lib/server/pendingRegistrationService";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    let formData;
    try {
      formData = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Invalid signup request." }, { status: 400 });
    }
    const validationError = validatePendingRegistration(formData);
    if (validationError) {
      return NextResponse.json({ success: false, message: validationError }, { status: 400 });
    }

    const {
      companyName,
      companyEmail,
      phone,
      subscription,
    } = formData;

    // -----------------------------
    // Validation
    // -----------------------------

    if (!companyName)
      return NextResponse.json(
        { success: false, message: "Company name is required" },
        { status: 400 }
      );

    if (!companyEmail)
      return NextResponse.json(
        { success: false, message: "Company email is required" },
        { status: 400 }
      );

    if (!phone)
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );

    if (!subscription)
      return NextResponse.json(
        { success: false, message: "Subscription missing" },
        { status: 400 }
      );

    //------------------------------------
    // Server Side Amount Calculation
    //------------------------------------

    // const price = PLAN_PRICE[subscription.plan];

    // Testing only
    const price = 1;

    if (!price)
      return NextResponse.json(
        { success: false, message: "Invalid Plan" },
        { status: 400 }
      );

    let amount = price * subscription.employeeCount;

    if (subscription.billingType === "yearly") {
      amount = amount * 12;
      amount = amount * 0.85; // 15% Discount
    }

    // amount = Number(amount.toFixed(2));
    amount = 1;

    //------------------------------------
    // Prevent Amount Tampering
    //------------------------------------

    // if (
    //   subscription.amount &&
    //   Number(subscription.amount) !== amount
    // ) {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       message: "Amount mismatch",
    //     },
    //     { status: 400 }
    //   );
    // }

    //------------------------------------
    // Create Cashfree Order
    //------------------------------------

    const orderId = `SHARO_${uuid().replace(/-/g, "")}`;

    // Persist first: never create a payment order without its registration.
    const pendingRef = await savePendingRegistration(orderId, formData);

    const CASHFREE_URL =
      process.env.CASHFREE_ENV === "PRODUCTION"
        ? "https://api.cashfree.com/pg/orders"
        : "https://sandbox.cashfree.com/pg/orders";

    const response = await fetch(CASHFREE_URL, {
      method: "POST",

      headers: {
        accept: "application/json",
        "content-type": "application/json",

        "x-client-id": process.env.CASHFREE_CLIENT_ID,

        "x-client-secret":
          process.env.CASHFREE_CLIENT_SECRET,

        "x-api-version": "2023-08-01",
      },

      body: JSON.stringify({
        order_id: orderId,

        order_amount: amount,

        order_currency: "INR",

        customer_details: {
          customer_id: orderId,

          customer_name: companyName,

          customer_email: companyEmail,

          customer_phone: phone,
        },

        order_meta: {
          return_url:
            `${process.env.NEXT_PUBLIC_APP_URL}/signup/success?order_id={order_id}`,
        },

        order_note: "SHARO Workspace",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Only remove on a definite rejection. Keep the record on ambiguous
      // network/5xx failures because Cashfree may have accepted the order.
      if (response.status >= 400 && response.status < 500) {
        await pendingRef.delete();
      }
      console.error(result);

      return NextResponse.json(
        {
          success: false,
          message:
            result.message ||
            "Unable to create order",
          error: result,
        },
        {
          status: response.status,
        }
      );
    }

    if (typeof result.payment_session_id !== "string" || !result.payment_session_id.trim()) {
      throw new Error("Missing Cashfree payment session.");
    }

    return NextResponse.json({
      success: true,

      orderId,

      amount,

      paymentSessionId:
        result.payment_session_id,

      cfOrderId:
        result.cf_order_id,
    });

  } catch (err) {

    console.error(err);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to start registration. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}