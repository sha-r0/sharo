"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase";

function PaymentSuccessContent() {
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

        setStatus("Verifying payment...");

        const response = await fetch("/api/cashfree/verify-payment", {
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

          setStatus(result.message);

          return;

        }

        // ===============================
        // Sign In Using Custom Token
        // ===============================

        setStatus("Signing you in...");

        await signInWithCustomToken(
          auth,
          result.customToken
        );
        setLoading(false);

        setStatus("Registration Completed");

        setTimeout(() => {

          router.push("/workspace-creating");

        }, 1000);

      } catch (error) {

        console.error(error);

        setLoading(false);

        setStatus("Something went wrong.");

      }

    };

    verifyPayment();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white shadow-lg rounded-xl p-10 w-full max-w-md text-center">

        {loading ? (
          <div className="space-y-6">

            <div className="animate-spin h-12 w-12 rounded-full border-4 border-blue-600 border-t-transparent mx-auto" />

            <h2 className="text-xl font-semibold">
              {status}
            </h2>

            <div className="w-full bg-gray-200 rounded-full h-2">

              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{
                  width:
                    status === "Verifying payment..."
                      ? "30%"
                      : status === "Signing you in..."
                        ? "80%"
                        : "100%",
                }}
              />

            </div>

          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold">
              {status}
            </h2>

            {status === "Registration Completed" ? (
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

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}