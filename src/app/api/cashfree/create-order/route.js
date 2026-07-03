import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

const PLAN_PRICE = {
  starter: 49,
  professional: 59,
  enterprise: 99,
};

export async function POST(req) {
  try {
    const formData = await req.json();

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
            `${process.env.NEXT_PUBLIC_APP_URL}` +
            `/payment/success?order_id={order_id}`,
        },

        order_note: "SHARO Workspace",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
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
        message: err.message,
      },
      {
        status: 500,
      }
    );
  }
}