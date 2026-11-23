"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * While a payment is being confirmed (e.g. waiting for Razorpay's webhook),
 * re-checks the booking every few seconds for up to two minutes.
 */
export function AwaitConfirmation() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 40) return;
    const id = setTimeout(() => {
      router.refresh();
      setTries((t) => t + 1);
    }, 3000);
    return () => clearTimeout(id);
  }, [tries, router]);
  return (
    <p className="text-ink-muted mt-3 text-sm" aria-live="polite">
      {tries >= 40
        ? "This is taking longer than usual. Please refresh the page in a few minutes, or contact us with your booking reference."
        : "Checking with the payment provider…"}
    </p>
  );
}
