import { load } from "@cashfreepayments/cashfree-js";

let cashfree;

async function initializeCashfree() {
  if (!cashfree) {
    cashfree = await load({
      mode: "production",
    });
  }

  return cashfree;
}

// Create Order
export async function createOrder(formData) {
  const response = await fetch("/api/cashfree/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  console.log(response.data);

  const result = await response.json();

  console.log("Create Order:", result);

  if (!result.success) {
    throw new Error(result.message);
  }

  return result;
}

// Open Cashfree Checkout
export async function openCheckout(paymentSessionId) {
  console.log("Payment Session:", paymentSessionId);

  const cashfree = await initializeCashfree();

  return cashfree.checkout({
    paymentSessionId,
    redirectTarget: "_self",
  });
}