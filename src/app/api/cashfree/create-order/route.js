import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { savePendingRegistration, validatePendingRegistration } from "@/lib/server/pendingRegistrationService";
import { findSignupResume, resumeSignupOrder } from "@/lib/server/signupResumeService";

export const runtime = "nodejs";
const newOrderId = () => `SHARO_${uuid().replace(/-/g, "")}`;
const cashfreeUrl = () => process.env.CASHFREE_ENV === "PRODUCTION"
  ? "https://api.cashfree.com/pg/orders" : "https://sandbox.cashfree.com/pg/orders";
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function fetchOrder(orderId) {
  const response = await fetch(`${cashfreeUrl()}/${orderId}`, {
    headers: {
      "x-client-id": process.env.CASHFREE_CLIENT_ID,
      "x-client-secret": process.env.CASHFREE_CLIENT_SECRET,
      "x-api-version": "2023-08-01",
    }, cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to check payment status.");
  const order = await response.json();
  if (order.order_id !== orderId) throw new Error("Unexpected payment order.");
  return order;
}

async function createCashfreeOrder(orderId, formData, newPendingRef) {
  const { companyName, companyEmail, phone } = formData;
  const amount = 1; // Preserve existing Cashfree charge; pricing is outside this change.
  const CASHFREE_URL = cashfreeUrl();

  const response = await fetch(CASHFREE_URL, {
    method: "POST",

    headers: {
      accept: "application/json",
      "content-type": "application/json",

      "x-client-id": process.env.CASHFREE_CLIENT_ID,

      "x-client-secret":
        process.env.CASHFREE_CLIENT_SECRET,

      "x-api-version": "2023-08-01",
      "x-idempotency-key": orderId.slice(6).replace(/^(........)(....)(....)(....)(............)$/, "$1-$2-$3-$4-$5"),
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
    if (newPendingRef && response.status >= 400 && response.status < 500) {
      await newPendingRef.delete();
    }
    throw new Error("Unable to create payment order.");
  }

  if (typeof result.payment_session_id !== "string" || !result.payment_session_id.trim()) {
    throw new Error("Missing Cashfree payment session.");
  }

  return {
    success: true,

    orderId,

    amount,

    paymentSessionId:
      result.payment_session_id,

    cfOrderId:
      result.cf_order_id,
  };

}

export async function POST(req) {
  try {
    let formData;
    try { formData = await req.json(); } catch { return json({ success: false, message: "Invalid signup request." }, 400); }
    if (!formData || typeof formData.adminEmail !== "string") return json({ success: false, message: "Invalid signup request." }, 400);
    // Repeat ownership/completion checks here; callers can bypass client validation.
    const pending = await findSignupResume(formData);
    if (pending) {
      if (!pending.ref) return json(pending.response, pending.response.success ? 200 : 403);
      return json(await resumeSignupOrder(pending, { fetchOrder, createOrder: createCashfreeOrder, newOrderId }));
    }
    const error = validatePendingRegistration(formData);
    if (error) return json({ success: false, message: error }, 400);
    const orderId = newOrderId();
    const ref = await savePendingRegistration(orderId, formData);
    return json(await createCashfreeOrder(orderId, formData, ref));
  } catch {
    return json({ success: false, message: "Unable to start registration. Please try again." }, 500);
  }
}
