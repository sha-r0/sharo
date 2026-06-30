"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function PaymentSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState("Verifying Payment...");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      const orderId = searchParams.get("order_id");

      if (!orderId) {
        setLoading(false);
        setStatus("Invalid payment request.");
        return;
      }

      try {
        const response = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId,
          }),
        });

        const result = await response.json();

        if (!result.success) {
          setLoading(false);
          setStatus(result.message || "Payment verification failed.");
          return;
        }

        setStatus("Payment Successful!");

        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);

      } catch (error) {
        console.error(error);
        setStatus("Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white shadow-lg rounded-xl p-10 w-full max-w-md text-center">

        {loading ? (
          <div className="space-y-4">
            <div className="animate-spin h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />
            <h2 className="text-xl font-semibold">
              Verifying Payment...
            </h2>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold">
              {status}
            </h2>

            {status === "Payment Successful!" ? (
              <p className="mt-4 text-gray-500">
                Redirecting...
              </p>
            ) : (
              <button
                onClick={() => router.push("/signup")}
                className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg"
              >
                Try Again
              </button>
            )}
          </>
        )}

      </div>

    </div>
  );
}